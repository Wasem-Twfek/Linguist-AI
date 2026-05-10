import { NextRequest } from 'next/server'

import {
  getAssignmentAudioObjectStatus,
  getAssignmentAudioPath,
  isPositiveObjectSize,
  SIGNED_AUDIO_URL_TTL_SECONDS,
} from '@/lib/audio/assignment-audio'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

const ASSIGNMENT_AUDIO_BUCKET = 'assignment-audio'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ReportAudioAccess =
  | {
      status: 'ok'
      audioPath: string
    }
  | {
      status: 'not-found' | 'denied'
    }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: resultId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const access = await getReportAudioAccess(supabase, resultId, user.id)

  if (access.status !== 'ok') {
    return new Response(access.status === 'denied' ? 'Forbidden' : 'Audio not found', {
      status: access.status === 'denied' ? 403 : 404,
    })
  }

  const storageClient = createAdminClient() ?? supabase
  const objectStatus = await getAssignmentAudioObjectStatus(storageClient, access.audioPath)

  if (
    objectStatus.errorMessage ||
    !objectStatus.exists ||
    !isPositiveObjectSize(objectStatus.size)
  ) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Report audio route object unavailable:', {
        resultId,
        audioPath: access.audioPath,
        objectExists: objectStatus.exists,
        objectSize: objectStatus.size,
        objectError: objectStatus.errorMessage,
      })
    }

    return new Response('Audio not found', { status: 404 })
  }

  const { data: signedUrlData, error: signedUrlError } = await storageClient.storage
    .from(ASSIGNMENT_AUDIO_BUCKET)
    .createSignedUrl(access.audioPath, SIGNED_AUDIO_URL_TTL_SECONDS)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Report audio route signing failed:', {
        resultId,
        audioPath: access.audioPath,
        error: signedUrlError?.message ?? 'Signed URL was empty.',
      })
    }

    return new Response('Audio unavailable', { status: 502 })
  }

  const upstreamHeaders = new Headers()
  const range = request.headers.get('range')

  if (range) {
    upstreamHeaders.set('Range', range)
  }

  const upstreamResponse = await fetch(signedUrlData.signedUrl, {
    headers: upstreamHeaders,
  })

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Report audio route upstream fetch failed:', {
        resultId,
        audioPath: access.audioPath,
        status: upstreamResponse.status,
      })
    }

    return new Response('Audio unavailable', {
      status: upstreamResponse.status === 404 ? 404 : 502,
    })
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: createAudioResponseHeaders(upstreamResponse.headers),
  })
}

async function getReportAudioAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resultId: string,
  userId: string
): Promise<ReportAudioAccess> {
  const { data: result } = await supabase
    .from('results')
    .select('id, session_id')
    .eq('id', resultId)
    .maybeSingle()

  if (!result?.session_id) {
    return { status: 'not-found' }
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('id, user_id, assignment_id, audio_path, audio_url')
    .eq('id', result.session_id)
    .maybeSingle()

  const audioPath = getAssignmentAudioPath(session)

  if (!session || !audioPath) {
    return { status: 'not-found' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'student') {
    return session.user_id === userId
      ? { status: 'ok', audioPath }
      : { status: 'denied' }
  }

  if (profile?.role !== 'teacher' || !session.assignment_id) {
    return { status: 'denied' }
  }

  const { data: assignment } = await supabase
    .from('assignments')
    .select('created_by')
    .eq('id', session.assignment_id)
    .maybeSingle()

  if (!assignment) {
    return { status: 'not-found' }
  }

  return assignment.created_by === userId
    ? { status: 'ok', audioPath }
    : { status: 'denied' }
}

function createAudioResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers()
  const contentType = upstreamHeaders.get('content-type') ?? 'audio/webm'
  const contentLength = upstreamHeaders.get('content-length')
  const contentRange = upstreamHeaders.get('content-range')
  const acceptRanges = upstreamHeaders.get('accept-ranges') ?? 'bytes'

  headers.set('Content-Type', contentType)
  headers.set('Accept-Ranges', acceptRanges)
  headers.set('Cache-Control', 'private, no-store')

  if (contentLength) {
    headers.set('Content-Length', contentLength)
  }

  if (contentRange) {
    headers.set('Content-Range', contentRange)
  }

  return headers
}

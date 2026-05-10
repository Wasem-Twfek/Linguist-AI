import {
  getAssignmentAudioObjectStatus,
  getAssignmentAudioPath,
  isPositiveObjectSize,
} from '@/lib/audio/assignment-audio'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

async function createReportAudioPlaybackUrl(
  resultId: string,
  session: { id?: string | null; audio_path?: string | null; audio_url?: string | null }
) {
  const audioPath = getAssignmentAudioPath(session)

  if (!audioPath) {
    return {
      audioPlaybackUrl: null,
      audioObjectMissing: false,
    }
  }

  const supabase = createAdminClient() ?? (await createClient())
  const objectStatus = await getAssignmentAudioObjectStatus(supabase, audioPath)

  if (process.env.NODE_ENV !== 'production') {
    console.info('Report audio availability check:', {
      resultId,
      sessionId: session.id ?? null,
      audioPath,
      objectExists: objectStatus.exists,
      objectSize: objectStatus.size,
      objectError: objectStatus.errorMessage,
    })
  }

  if (objectStatus.errorMessage || !objectStatus.exists || !isPositiveObjectSize(objectStatus.size)) {
    return {
      audioPlaybackUrl: null,
      audioObjectMissing: !objectStatus.errorMessage && !objectStatus.exists,
    }
  }

  return {
    audioPlaybackUrl: `/api/results/${resultId}/audio`,
    audioObjectMissing: false,
  }
}

export async function getStudentReport(resultId: string, userId: string) {
  const supabase = await createClient()

  const { data: result } = await supabase
    .from('results')
    .select('*')
    .eq('id', resultId)
    .maybeSingle()

  if (!result?.session_id) {
    return { status: 'not-found' as const }
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', result.session_id)
    .maybeSingle()

  if (!session) {
    return { status: 'not-found' as const }
  }

  if (session.user_id !== userId) {
    return { status: 'denied' as const }
  }

  const { data: assignment } = session.assignment_id
    ? await supabase
        .from('assignments')
        .select('*')
        .eq('id', session.assignment_id)
        .maybeSingle()
    : { data: null }

  const audioPlayback = await createReportAudioPlaybackUrl(result.id, session)

  return {
    status: 'ok' as const,
    result,
    session,
    assignment,
    audioPlaybackUrl: audioPlayback.audioPlaybackUrl,
    audioObjectMissing: audioPlayback.audioObjectMissing,
  }
}

export async function getTeacherReport(resultId: string, teacherId: string) {
  const supabase = await createClient()

  const { data: result } = await supabase
    .from('results')
    .select('*')
    .eq('id', resultId)
    .maybeSingle()

  if (!result?.session_id) {
    return { status: 'not-found' as const }
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', result.session_id)
    .maybeSingle()

  if (!session?.assignment_id) {
    return { status: 'not-found' as const }
  }

  const { data: assignment } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', session.assignment_id)
    .maybeSingle()

  if (!assignment) {
    return { status: 'not-found' as const }
  }

  if (assignment.created_by !== teacherId) {
    return { status: 'denied' as const }
  }

  const audioPlayback = await createReportAudioPlaybackUrl(result.id, session)

  return {
    status: 'ok' as const,
    result,
    session,
    assignment,
    audioPlaybackUrl: audioPlayback.audioPlaybackUrl,
    audioObjectMissing: audioPlayback.audioObjectMissing,
  }
}

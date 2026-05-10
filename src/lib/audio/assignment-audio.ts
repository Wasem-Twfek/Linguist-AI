const ASSIGNMENT_AUDIO_BUCKET = 'assignment-audio'
export const SIGNED_AUDIO_URL_TTL_SECONDS = 60 * 60

type AudioSession = {
  audio_path?: string | null
  audio_url?: string | null
}

export type AssignmentAudioStorage = {
  storage: {
    from: (bucket: typeof ASSIGNMENT_AUDIO_BUCKET) => {
      list: (
        path?: string,
        options?: {
          limit?: number
          search?: string
        }
      ) => Promise<{
        data: Array<{
          name: string
          metadata?: Record<string, unknown> | null
        }> | null
        error: { message?: string } | null
      }>
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{ data: { signedUrl: string } | null; error: { message?: string } | null }>
    }
  }
}

type AssignmentAudioPlayback = {
  signedUrl: string | null
  objectMissing: boolean
  audioPath: string | null
  objectSize: number | null
}

type AssignmentAudioDiagnosticContext = {
  reportId?: string | null
  sessionId?: string | null
}

export type AssignmentAudioObjectStatus = {
  exists: boolean
  size: number | null
  errorMessage: string | null
}

export function getAssignmentAudioPath(session: AudioSession | null | undefined) {
  if (!session) return null

  const directPath = normalizeStoragePath(session.audio_path)
  if (directPath) return directPath

  return extractAssignmentAudioPath(session.audio_url)
}

export function extractAssignmentAudioPath(audioUrl: string | null | undefined) {
  if (!audioUrl) return null

  const normalizedValue = audioUrl.trim()
  if (!normalizedValue) return null

  if (!/^https?:\/\//i.test(normalizedValue)) {
    return normalizeStoragePath(normalizedValue)
  }

  try {
    const url = new URL(normalizedValue)
    const marker = `/storage/v1/object/public/${ASSIGNMENT_AUDIO_BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)

    if (markerIndex === -1) return null

    return normalizeStoragePath(
      decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    )
  } catch {
    return null
  }
}

export async function createAssignmentAudioSignedUrl(
  supabase: AssignmentAudioStorage,
  session: AudioSession | null | undefined
) {
  const playback = await createAssignmentAudioPlayback(supabase, session)
  return playback.signedUrl
}

export async function createAssignmentAudioPlayback(
  supabase: AssignmentAudioStorage,
  session: AudioSession | null | undefined,
  context: AssignmentAudioDiagnosticContext = {}
): Promise<AssignmentAudioPlayback> {
  const audioPath = getAssignmentAudioPath(session)
  if (!audioPath) {
    logAudioDiagnostic('Report audio path is missing.', {
      ...context,
      audioPath: null,
      objectExists: false,
      objectSize: null,
      signedUrlCreated: false,
      signedUrlError: null,
    })

    return {
      signedUrl: null,
      objectMissing: false,
      audioPath: null,
      objectSize: null,
    }
  }

  const bucket = supabase.storage.from(ASSIGNMENT_AUDIO_BUCKET)
  const objectStatus = await getAssignmentAudioObjectStatus(supabase, audioPath)

  if (objectStatus.errorMessage || !objectStatus.exists || !isPositiveObjectSize(objectStatus.size)) {
    logAudioDiagnostic('Report audio object check failed.', {
      ...context,
      audioPath,
      objectExists: objectStatus.exists,
      objectSize: objectStatus.size,
      signedUrlCreated: false,
      signedUrlError: objectStatus.errorMessage,
    })

    return {
      signedUrl: null,
      objectMissing: !objectStatus.errorMessage && !objectStatus.exists,
      audioPath,
      objectSize: objectStatus.size,
    }
  }

  const { data, error } = await bucket.createSignedUrl(audioPath, SIGNED_AUDIO_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    const message = error?.message ?? ''

    logAudioDiagnostic('Report audio signed URL creation failed.', {
      ...context,
      audioPath,
      objectExists: true,
      objectSize: objectStatus.size,
      signedUrlCreated: false,
      signedUrlError: message || 'Signed URL was empty.',
    })

    return {
      signedUrl: null,
      objectMissing: /not found|does not exist|404/i.test(message),
      audioPath,
      objectSize: objectStatus.size,
    }
  }

  logAudioDiagnostic('Report audio signed URL created.', {
    ...context,
    audioPath,
    objectExists: true,
    objectSize: objectStatus.size,
    signedUrlCreated: true,
    signedUrlError: null,
  })

  return {
    signedUrl: data.signedUrl,
    objectMissing: false,
    audioPath,
    objectSize: objectStatus.size,
  }
}

export async function getAssignmentAudioObjectStatus(
  supabase: AssignmentAudioStorage,
  audioPath: string
): Promise<AssignmentAudioObjectStatus> {
  const lastSlashIndex = audioPath.lastIndexOf('/')
  const folderPath = lastSlashIndex === -1 ? '' : audioPath.slice(0, lastSlashIndex)
  const fileName = lastSlashIndex === -1 ? audioPath : audioPath.slice(lastSlashIndex + 1)

  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_AUDIO_BUCKET)
    .list(folderPath, {
      limit: 100,
      search: fileName,
    })

  if (error) {
    return {
      exists: false,
      size: null,
      errorMessage: error.message ?? 'Storage object check failed.',
    }
  }

  const object = data?.find((item) => item.name === fileName)

  return {
    exists: Boolean(object),
    size: getStorageObjectSize(object?.metadata),
    errorMessage: null,
  }
}

function getStorageObjectSize(metadata: Record<string, unknown> | null | undefined) {
  const size = metadata?.size

  if (typeof size === 'number' && Number.isFinite(size)) {
    return size
  }

  if (typeof size === 'string') {
    const parsedSize = Number(size)
    return Number.isFinite(parsedSize) ? parsedSize : null
  }

  return null
}

export function isPositiveObjectSize(size: number | null | undefined) {
  return typeof size === 'number' && Number.isFinite(size) && size > 0
}

function logAudioDiagnostic(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return

  console.info(message, details)
}

function normalizeStoragePath(path: string | null | undefined) {
  const normalizedPath = path?.trim().replace(/^\/+/, '')

  if (!normalizedPath || normalizedPath.includes('..')) {
    return null
  }

  return normalizedPath
}

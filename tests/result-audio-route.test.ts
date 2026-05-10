import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from './helpers/mockSupabase'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => null),
}))

import { GET } from '@/app/api/results/[id]/audio/route'
import { createClient } from '@/utils/supabase/server'

const mockedCreateClient = vi.mocked(createClient)

function createRouteContext(resultId = 'result-1') {
  return {
    params: Promise.resolve({ id: resultId }),
  }
}

function createRequest(range?: string) {
  return new Request('http://localhost/api/results/result-1/audio', {
    headers: range ? { range } : undefined,
  })
}

function createStudentAudioSupabase(options: {
  userId?: string
  sessionUserId?: string
  audioPath?: string | null
  objectExists?: boolean
  objectSize?: number
}) {
  const audioPath = options.audioPath === undefined
    ? 'student-1/assignment-1/123.webm'
    : options.audioPath

  const supabase = createSupabaseMock({
    user: { id: options.userId ?? 'student-1' },
    handlers: {
      results: () => ({ data: { id: 'result-1', session_id: 'session-1' } }),
      sessions: () => ({
        data: {
          id: 'session-1',
          user_id: options.sessionUserId ?? 'student-1',
          assignment_id: 'assignment-1',
          audio_path: audioPath,
        },
      }),
      profiles: () => ({ data: { role: 'student' } }),
    },
  })

  const bucket = supabase.storage.from('assignment-audio')
  bucket.list.mockResolvedValue({
    data: options.objectExists === false || !audioPath
      ? []
      : [{ name: '123.webm', metadata: { size: options.objectSize ?? 12345 } }],
    error: null,
  })
  bucket.createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/audio.webm?token=secret' },
    error: null,
  })

  return { supabase, bucket }
}

describe('result audio route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('streams student-owned audio with a normal 200 response', async () => {
    const { supabase, bucket } = createStudentAudioSupabase({})
    mockedCreateClient.mockResolvedValue(supabase as never)

    const fetchMock = vi.fn().mockResolvedValue(
      new Response('audio-bytes', {
        status: 200,
        headers: {
          'content-type': 'audio/webm',
          'content-length': '11',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(createRequest() as never, createRouteContext())

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('audio/webm')
    expect(response.headers.get('content-length')).toBe('11')
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('student-1/assignment-1/123.webm', 3600)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://signed.example/audio.webm?token=secret',
      { headers: expect.any(Headers) }
    )
  })

  it('forwards Range and preserves a 206 partial response', async () => {
    const { supabase } = createStudentAudioSupabase({})
    mockedCreateClient.mockResolvedValue(supabase as never)

    const fetchMock = vi.fn().mockResolvedValue(
      new Response('partial-audio', {
        status: 206,
        headers: {
          'content-type': 'audio/webm',
          'content-length': '12',
          'content-range': 'bytes 0-11/12345',
          'accept-ranges': 'bytes',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(createRequest('bytes=0-11') as never, createRouteContext())
    const forwardedHeaders = fetchMock.mock.calls[0][1].headers as Headers

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 0-11/12345')
    expect(response.headers.get('content-length')).toBe('12')
    expect(forwardedHeaders.get('range')).toBe('bytes=0-11')
  })

  it('allows a teacher who owns the assignment to stream report audio', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'teacher-1' },
      handlers: {
        results: () => ({ data: { id: 'result-1', session_id: 'session-1' } }),
        sessions: () => ({
          data: {
            id: 'session-1',
            user_id: 'student-1',
            assignment_id: 'assignment-1',
            audio_path: 'student-1/assignment-1/123.webm',
          },
        }),
        profiles: () => ({ data: { role: 'teacher' } }),
        assignments: () => ({ data: { created_by: 'teacher-1' } }),
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    bucket.list.mockResolvedValue({
      data: [{ name: '123.webm', metadata: { size: 12345 } }],
      error: null,
    })
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/audio.webm?token=secret' },
      error: null,
    })
    mockedCreateClient.mockResolvedValue(supabase as never)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('audio', { status: 200 })))

    const response = await GET(createRequest() as never, createRouteContext())

    expect(response.status).toBe(200)
  })

  it('returns 403 for users who do not own the report audio', async () => {
    const { supabase, bucket } = createStudentAudioSupabase({
      userId: 'student-2',
      sessionUserId: 'student-1',
    })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const response = await GET(createRequest() as never, createRouteContext())

    expect(response.status).toBe(403)
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('returns 404 when the session has no audio path', async () => {
    const { supabase, bucket } = createStudentAudioSupabase({ audioPath: null })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const response = await GET(createRequest() as never, createRouteContext())

    expect(response.status).toBe(404)
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('returns 404 when the storage object is missing', async () => {
    const { supabase, bucket } = createStudentAudioSupabase({ objectExists: false })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const response = await GET(createRequest() as never, createRouteContext())

    expect(response.status).toBe(404)
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('returns 404 when the storage object is empty', async () => {
    const { supabase, bucket } = createStudentAudioSupabase({ objectSize: 0 })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const response = await GET(createRequest() as never, createRouteContext())

    expect(response.status).toBe(404)
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })
})

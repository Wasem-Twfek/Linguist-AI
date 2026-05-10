import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from './helpers/mockSupabase'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => null),
}))

import { getStudentReport, getTeacherReport } from '@/lib/audio/result-audio-reports'
import { createClient } from '@/utils/supabase/server'

const mockedCreateClient = vi.mocked(createClient)

describe('result audio access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes only the internal audio route after the student owns the session', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'student-1' },
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
        assignments: () => ({ data: { id: 'assignment-1' } }),
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    bucket.list.mockResolvedValue({
      data: [{ name: '123.webm', metadata: { size: 12345 } }],
      error: null,
    })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const report = await getStudentReport('result-1', 'student-1')

    expect(report).toMatchObject({
      status: 'ok',
      audioPlaybackUrl: '/api/results/result-1/audio',
    })
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('does not sign audio for another student session', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'student-2' },
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
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    mockedCreateClient.mockResolvedValue(supabase as never)

    await expect(getStudentReport('result-1', 'student-2')).resolves.toEqual({ status: 'denied' })
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('exposes only the internal audio route after the teacher owns the assignment', async () => {
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
        assignments: () => ({ data: { id: 'assignment-1', created_by: 'teacher-1' } }),
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    bucket.list.mockResolvedValue({
      data: [{ name: '123.webm', metadata: { size: 12345 } }],
      error: null,
    })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const report = await getTeacherReport('result-1', 'teacher-1')

    expect(report).toMatchObject({
      status: 'ok',
      audioPlaybackUrl: '/api/results/result-1/audio',
    })
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('does not sign audio for a teacher who does not own the assignment', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'teacher-2' },
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
        assignments: () => ({ data: { id: 'assignment-1', created_by: 'teacher-1' } }),
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    mockedCreateClient.mockResolvedValue(supabase as never)

    await expect(getTeacherReport('result-1', 'teacher-2')).resolves.toEqual({ status: 'denied' })
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })

  it('does not expose an audio route when the storage object is missing', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'student-1' },
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
        assignments: () => ({ data: { id: 'assignment-1' } }),
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    bucket.list.mockResolvedValue({
      data: [],
      error: null,
    })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const report = await getStudentReport('result-1', 'student-1')

    expect(report).toMatchObject({
      status: 'ok',
      audioPlaybackUrl: null,
      audioObjectMissing: true,
    })
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })
})

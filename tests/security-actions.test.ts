import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from './helpers/mockSupabase'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => null),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(),
  })),
  SchemaType: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    ARRAY: 'ARRAY',
  },
}))

import { createClient } from '@/utils/supabase/server'
import { submitAttempt } from '@/app/student/assignments/[id]/actions'
import { createGroup, duplicateAssignmentToGroup } from '@/app/teacher/dashboard/actions'
import { GoogleGenerativeAI } from '@google/generative-ai'

const mockedCreateClient = vi.mocked(createClient)
const mockedGoogleGenerativeAI = vi.mocked(GoogleGenerativeAI)

describe('fixed security rules in server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submitAttempt rejects a teacher before reading assignment data or uploading audio', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'teacher-1' },
      handlers: {
        profiles: () => ({ data: { role: 'teacher' } }),
      },
    })

    mockedCreateClient.mockResolvedValue(supabase as never)

    const result = await submitAttempt(
      'assignment-1',
      new Blob(['audio'], { type: 'audio/webm' }),
      'ignored text'
    )

    expect(result).toHaveProperty('error')
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.from).not.toHaveBeenCalledWith('assignments')
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })

  it('submitAttempt rejects a student who is not a member of the assignment group', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'student-1' },
      handlers: {
        profiles: () => ({ data: { role: 'student' } }),
        assignments: () => ({
          data: {
            id: 'assignment-1',
            group_id: 'group-1',
            text_content: 'Server-owned text',
          },
        }),
        group_members: () => ({
          data: null,
          error: { message: 'No rows found' },
        }),
      },
    })

    mockedCreateClient.mockResolvedValue(supabase as never)

    const result = await submitAttempt(
      'assignment-1',
      new Blob(['audio'], { type: 'audio/webm' }),
      'ignored text'
    )

    expect(result).toHaveProperty('error')
    expect(supabase.from).toHaveBeenCalledWith('assignments')
    expect(supabase.from).toHaveBeenCalledWith('group_members')
    expect(supabase.from).not.toHaveBeenCalledWith('study_groups')
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })

  it('submitAttempt stores the private storage object path instead of a public audio URL', async () => {
    const previousApiKey = process.env.GOOGLE_API_KEY
    process.env.GOOGLE_API_KEY = 'test-key'
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1765609190011)
    let insertedSessionPayload: Record<string, unknown> | undefined

    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            transcript: 'Hello world',
            overall_score: 90,
            grammar_score: 88,
            pronunciation_score: 92,
            feedback: 'Good work',
            word_analysis: [
              { word: 'Hello', status: 'correct' },
              { word: 'world', status: 'correct' },
            ],
          }),
      },
    })

    mockedGoogleGenerativeAI.mockImplementation(function () {
      return {
      getGenerativeModel: vi.fn(() => ({ generateContent })),
      }
    } as never)

    const supabase = createSupabaseMock({
      user: { id: 'student-1' },
      handlers: {
        profiles: () => ({ data: { role: 'student' } }),
        assignments: () => ({
          data: {
            id: 'assignment-1',
            group_id: 'group-1',
            text_content: 'Hello world',
          },
        }),
        group_members: () => ({ data: { id: 'membership-1' } }),
        study_groups: () => ({ data: { id: 'group-1' } }),
        sessions: (_mode, state) => {
          if (state.insertPayload) {
            insertedSessionPayload = state.insertPayload as Record<string, unknown>
            return {
              data: {
                id: 'session-1',
                ...insertedSessionPayload,
              },
            }
          }

          if (state.filters['gte:created_at']) {
            return { count: 0 }
          }

          return { data: [] }
        },
        results: (_mode, state) => {
          if (state.insertPayload) {
            return {
              data: {
                id: 'result-1',
                session_id: 'session-1',
                ...(state.insertPayload as Record<string, unknown>),
              },
            }
          }

          return { data: [] }
        },
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    bucket.upload.mockResolvedValue({
      data: { path: 'student-1/assignment-1/1765609190011.webm' },
      error: null,
    })
    bucket.list.mockResolvedValue({
      data: [{ name: '1765609190011.webm' }],
      error: null,
    })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const result = await submitAttempt(
      'assignment-1',
      new Blob([new Uint8Array(20_000)], { type: 'audio/webm' }),
      'ignored client text',
      3
    )

    expect(result).toHaveProperty('success', true)
    expect(bucket.getPublicUrl).not.toHaveBeenCalled()
    expect(insertedSessionPayload).toMatchObject({
      user_id: 'student-1',
      assignment_id: 'assignment-1',
      audio_url: null,
    })
    expect(insertedSessionPayload?.audio_path).toBe('student-1/assignment-1/1765609190011.webm')

    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey
    }
    dateNow.mockRestore()
  })

  it('submitAttempt does not create a session when the uploaded storage object cannot be found', async () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1765609190012)
    let attemptedSessionInsert = false

    const supabase = createSupabaseMock({
      user: { id: 'student-1' },
      handlers: {
        profiles: () => ({ data: { role: 'student' } }),
        assignments: () => ({
          data: {
            id: 'assignment-1',
            group_id: 'group-1',
            text_content: 'Hello world',
          },
        }),
        group_members: () => ({ data: { id: 'membership-1' } }),
        study_groups: () => ({ data: { id: 'group-1' } }),
        sessions: (_mode, state) => {
          if (state.insertPayload) {
            attemptedSessionInsert = true
          }

          return { count: 0, data: [] }
        },
      },
    })

    const bucket = supabase.storage.from('assignment-audio')
    bucket.upload.mockResolvedValue({
      data: { path: 'student-1/assignment-1/1765609190012.webm' },
      error: null,
    })
    bucket.list.mockResolvedValue({
      data: [],
      error: null,
    })
    bucket.remove.mockResolvedValue({ data: [], error: null })
    mockedCreateClient.mockResolvedValue(supabase as never)

    const result = await submitAttempt(
      'assignment-1',
      new Blob([new Uint8Array(20_000)], { type: 'audio/webm' }),
      'ignored client text',
      3
    )

    expect(result).toHaveProperty('error')
    expect(attemptedSessionInsert).toBe(false)
    expect(bucket.remove).toHaveBeenCalledWith(['student-1/assignment-1/1765609190012.webm'])
    dateNow.mockRestore()
  })

  it('duplicateAssignmentToGroup rejects copying another teacher assignment even into an owned target group', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'teacher-b' },
      handlers: {
        profiles: () => ({ data: { role: 'teacher' } }),
        assignments: () => ({
          data: {
            id: 'assignment-a',
            created_by: 'teacher-a',
            title: 'Source lesson',
            topic: 'Travel',
            difficulty_level: 'Intermediate',
            text_content: 'Lesson text',
            type: 'reading',
            vocabulary_hints: [],
          },
        }),
      },
    })

    mockedCreateClient.mockResolvedValue(supabase as never)

    const result = await duplicateAssignmentToGroup({
      sourceAssignmentId: 'assignment-a',
      targetGroupId: 'group-b',
    })

    expect(result).toHaveProperty('error')
    expect(supabase.from).toHaveBeenCalledWith('assignments')
    expect(supabase.from).not.toHaveBeenCalledWith('study_groups')
  })

  it('createGroup rejects students before inserting a study group', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'student-1' },
      handlers: {
        profiles: () => ({ data: { role: 'student' } }),
      },
    })

    mockedCreateClient.mockResolvedValue(supabase as never)

    const result = await createGroup('Unauthorized group')

    expect(result).toHaveProperty('error')
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.from).not.toHaveBeenCalledWith('study_groups')
  })
})

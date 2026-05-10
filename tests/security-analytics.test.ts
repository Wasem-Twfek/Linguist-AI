import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from './helpers/mockSupabase'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { getAssignmentAnalytics } from '@/lib/analytics/getAssignmentAnalytics'

const mockedCreateClient = vi.mocked(createClient)

describe('fixed analytics ownership rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAssignmentAnalytics returns analytics for teacher-owned assignment IDs', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'teacher-1' },
      handlers: {
        profiles: () => ({ data: { role: 'teacher' } }),
        assignments: () => ({
          data: [{ id: 'assignment-1' }, { id: 'assignment-2' }],
        }),
        sessions: () => ({
          data: [],
        }),
      },
    })

    mockedCreateClient.mockResolvedValue(supabase as never)

    const analytics = await getAssignmentAnalytics(
      ['assignment-1', 'assignment-2'],
      'teacher-1'
    )

    expect(analytics.size).toBe(2)
    expect(analytics.has('assignment-1')).toBe(true)
    expect(analytics.has('assignment-2')).toBe(true)
  })

  it('getAssignmentAnalytics rejects mixed owned and non-owned assignment IDs instead of silently omitting them', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'teacher-1' },
      handlers: {
        profiles: () => ({ data: { role: 'teacher' } }),
        assignments: () => ({
          data: [{ id: 'assignment-1' }],
        }),
      },
    })

    mockedCreateClient.mockResolvedValue(supabase as never)

    await expect(
      getAssignmentAnalytics(['assignment-1', 'assignment-2'], 'teacher-1')
    ).rejects.toThrow('Analytics access denied for one or more assignments')
  })
})

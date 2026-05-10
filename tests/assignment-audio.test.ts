import { describe, expect, it, vi } from 'vitest'

import {
  createAssignmentAudioSignedUrl,
  extractAssignmentAudioPath,
  getAssignmentAudioPath,
} from '@/lib/audio/assignment-audio'

describe('assignment audio private playback helpers', () => {
  it('prefers stored audio_path over deprecated public audio_url', () => {
    expect(
      getAssignmentAudioPath({
        audio_path: 'student-1/assignment-1/123.webm',
        audio_url: 'https://example.com/old.webm',
      })
    ).toBe('student-1/assignment-1/123.webm')
  })

  it('extracts an object path from existing Supabase public URLs', () => {
    expect(
      extractAssignmentAudioPath(
        'https://project.supabase.co/storage/v1/object/public/assignment-audio/student-1/assignment-1/123.webm'
      )
    ).toBe('student-1/assignment-1/123.webm')
  })

  it('does not sign missing or unsafe paths', async () => {
    const createSignedUrl = vi.fn()
    const list = vi.fn()
    const supabase = {
      storage: {
        from: vi.fn(() => ({ createSignedUrl, list })),
      },
    }

    await expect(
      createAssignmentAudioSignedUrl(supabase, { audio_path: '../secret.webm' })
    ).resolves.toBeNull()

    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('creates a one-hour signed URL for a valid path', async () => {
    const list = vi.fn().mockResolvedValue({
      data: [{ name: '123.webm', metadata: { size: 12345 } }],
      error: null,
    })
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed.example/audio.webm' },
      error: null,
    })
    const supabase = {
      storage: {
        from: vi.fn(() => ({ createSignedUrl, list })),
      },
    }

    await expect(
      createAssignmentAudioSignedUrl(supabase, {
        audio_path: 'student-1/assignment-1/123.webm',
      })
    ).resolves.toBe('https://signed.example/audio.webm')

    expect(supabase.storage.from).toHaveBeenCalledWith('assignment-audio')
    expect(list).toHaveBeenCalledWith('student-1/assignment-1', {
      limit: 100,
      search: '123.webm',
    })
    expect(createSignedUrl).toHaveBeenCalledWith('student-1/assignment-1/123.webm', 3600)
  })
})

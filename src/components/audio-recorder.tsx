'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square, RotateCcw, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { submitAttempt } from '@/app/student/assignments/[id]/actions'

interface AudioRecorderProps {
  assignmentId: string
  originalText: string
}

type RecordingState = 'idle' | 'recording' | 'finished'

export function AudioRecorder({ assignmentId, originalText }: AudioRecorderProps) {
  const router = useRouter()
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isMountedRef = useRef(true)

  // Format time as MM:SS
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start recording
  async function startRecording() {
    setError(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setRecordingState('finished')

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      mediaRecorder.start()
      setRecordingState('recording')
      setElapsedTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Не удалось получить доступ к микрофону')
    }
  }

  // Stop recording
  function stopRecording() {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Reset and start over
  function rerecord() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    setElapsedTime(0)
    setRecordingState('idle')
    setError(null)
  }

  // Submit recording
  async function handleSubmit() {
    if (!audioBlob) {
      toast.error('Нет аудио для отправки')
      return
    }

    // Client-side validation before submitting
    if (audioBlob.size === 0) {
      toast.error('Аудио файл пуст. Пожалуйста, запишите аудио снова.')
      return
    }

    // Validate minimum duration client-side (user feedback)
    if (elapsedTime < 3) {
      toast.error('Запись слишком короткая. Минимальная длительность: 3 секунды.')
      return
    }

    setSubmitting(true)

    try {
      // Pass duration to server for validation
      const result = await submitAttempt(assignmentId, audioBlob, originalText, elapsedTime)

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return

      if (result?.error) {
        toast.error(result.error)
        setSubmitting(false)
        // Don't redirect on error - let user try again
        return
      }

      // Only show success and redirect if we got a valid result
      if (result?.success) {
      toast.success('Результат сохранен!')
      
        // Signal student dashboard to refresh (same-tab only)
        if (typeof window !== 'undefined') {
          localStorage.setItem('student-assignments-updated', Date.now().toString())
          // Also trigger storage event for same-tab updates
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'student-assignments-updated',
            newValue: Date.now().toString()
          }))
        }
      
        // Redirect immediately to prevent state updates after navigation
        router.push('/student/dashboard')
        // Don't update state after redirect starts
        return
      } else {
        // Unexpected state - error should have been set
        toast.error('Произошла ошибка при отправке')
        setSubmitting(false)
      }

    } catch (err) {
      console.error('Error submitting:', err)
      // Only update state if component is still mounted
      if (isMountedRef.current) {
      toast.error('Произошла ошибка при отправке')
      setSubmitting(false)
      }
    }
  }

  // Cleanup on unmount (prevents orphaned recordings if user navigates away)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // If user navigates away during recording or before submitting,
      // cleanup resources. The recording is not submitted, so no session/result is created.
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      // Note: If recording was in progress, it won't be submitted
      // If audioBlob exists but wasn't submitted, it's discarded on unmount
      // This is safe - no server-side cleanup needed since nothing was created
    }
  }, [audioUrl])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Запись аудио</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Idle State */}
        {recordingState === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Button
              size="lg"
              onClick={startRecording}
              className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600"
            >
              <Mic className="h-10 w-10" />
            </Button>
            <p className="text-muted-foreground">Начать запись</p>
          </div>
        )}

        {/* Recording State */}
        {recordingState === 'recording' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Button
                size="lg"
                onClick={stopRecording}
                className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600 animate-pulse"
              >
                <Square className="h-8 w-8" />
              </Button>
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 -z-10 rounded-full bg-red-500/30 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold">{formatTime(elapsedTime)}</p>
              <p className="text-muted-foreground">Идет запись...</p>
            </div>
          </div>
        )}

        {/* Finished State */}
        {recordingState === 'finished' && audioUrl && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Длительность: {formatTime(elapsedTime)}
              </p>
              <audio controls src={audioUrl} className="w-full" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={rerecord}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Перезаписать
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Отправка...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    Отправить
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

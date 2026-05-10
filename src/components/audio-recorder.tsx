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
  // Server re-reads original text from the database for validation.
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

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  async function startRecording() {
    if (recordingState === 'recording' || submitting) return

    setError(null)
    chunksRef.current = []

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('Браузер не поддерживает запись аудио')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

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

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        mediaRecorderRef.current = null

        if (!isMountedRef.current) return

        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setRecordingState('finished')
      }

      mediaRecorder.start()
      setRecordingState('recording')
      setElapsedTime(0)

      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Error starting recording:', err)
      if (!isMountedRef.current) return
      setError('Не удалось получить доступ к микрофону')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

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

  async function handleSubmit() {
    if (!audioBlob) {
      toast.error('Нет аудио для отправки')
      return
    }

    if (audioBlob.size === 0) {
      toast.error('Аудио файл пуст. Пожалуйста, запишите аудио снова.')
      return
    }

    if (elapsedTime < 3) {
      toast.error('Запись слишком короткая. Минимальная длительность: 3 секунды.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await submitAttempt(assignmentId, audioBlob, originalText, elapsedTime)

      if (!isMountedRef.current) return

      if (result?.error) {
        toast.error(result.error)
        setSubmitting(false)
        return
      }

      if (result?.success) {
        toast.success('Результат сохранен!')
      
        if (typeof window !== 'undefined') {
          localStorage.setItem('student-assignments-updated', Date.now().toString())
          // Manually dispatch storage event for same-tab listeners.
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'student-assignments-updated',
            newValue: Date.now().toString()
          }))
        }
      
        const reportHref =
          'resultId' in result && result.resultId
            ? `/student/results/${result.resultId}`
            : '/student/dashboard'

        router.push(reportHref)
        return
      } else {
        toast.error('Не удалось выполнить анализ. Попробуйте еще раз.')
        setSubmitting(false)
      }

    } catch (err) {
      console.error('Error submitting:', err)
      if (isMountedRef.current) {
        toast.error('Не удалось выполнить анализ. Попробуйте еще раз.')
        setSubmitting(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mic className="h-5 w-5 text-accent" />
          Запись аудио
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {recordingState === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Button
              size="lg"
              onClick={startRecording}
              className="h-24 w-24 rounded-full bg-red-500 shadow-elegant hover:bg-red-600"
            >
              <Mic className="h-10 w-10" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-foreground">Начать запись</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Нажмите кнопку записи и прочитайте текст вслух.
              </p>
            </div>
          </div>
        )}

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
              <div className="absolute inset-0 -z-10 rounded-full bg-red-500/30 animate-ping" />
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-semibold text-foreground">{formatTime(elapsedTime)}</p>
              <p className="text-muted-foreground">Идет запись...</p>
            </div>
          </div>
        )}

        {recordingState === 'finished' && audioUrl && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
                Запись готова
              </div>
              <p className="text-sm text-muted-foreground">
                Длительность: {formatTime(elapsedTime)}
              </p>
              <audio controls src={audioUrl} className="w-full" />
            </div>

            {submitting && (
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-sm">
                <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-muted-foreground" />
                <div>
                  <p className="font-medium">Идет анализ произношения...</p>
                  <p className="text-muted-foreground">
                    Аудио отправлено, результат появится после обработки.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={rerecord}
                className="flex-1 rounded-full"
                disabled={submitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Перезаписать
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 rounded-full"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализ...
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

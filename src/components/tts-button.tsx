'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isTTSSupported, pause, resume, speak, stop } from '@/utils/tts'

interface TTSButtonProps {
  text: string
  label?: string
  lang?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

type PlaybackState = 'idle' | 'playing' | 'paused'

export function TTSButton({
  text,
  label = 'Listen',
  lang = 'en-US',
  variant = 'ghost',
  size = 'sm',
  className = '',
}: TTSButtonProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [supported, setSupported] = useState(false)
  const isMountedRef = useRef(false)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const fullTextRef = useRef('')

  useEffect(() => {
    isMountedRef.current = true

    const timeoutId = window.setTimeout(() => {
      setSupported(isTTSSupported())
    }, 0)

    return () => {
      isMountedRef.current = false
      window.clearTimeout(timeoutId)

      if (currentUtteranceRef.current) {
        stop()
        currentUtteranceRef.current = null
      }
    }
  }, [])

  const resetPlayback = () => {
    currentUtteranceRef.current = null
    fullTextRef.current = ''
    setPlaybackState('idle')
  }

  const finishPlayback = (utterance: SpeechSynthesisUtterance) => {
    if (!isMountedRef.current || currentUtteranceRef.current !== utterance) return

    resetPlayback()
  }

  const startSegmentPlayback = (startIndex = 0) => {
    const fullText = text.trim()
    if (!supported || fullText.length === 0) return null

    fullTextRef.current = fullText

    const boundedStartIndex = Math.max(0, Math.min(startIndex, fullText.length - 1))
    const rawSegment = fullText.slice(boundedStartIndex)
    const leadingWhitespaceLength = rawSegment.length - rawSegment.trimStart().length
    const segmentOffset = boundedStartIndex + leadingWhitespaceLength
    const segmentText = fullText.slice(segmentOffset)

    if (segmentText.length === 0) return null

    let startedUtterance: SpeechSynthesisUtterance | null = null
    const utterance = speak(segmentText, lang, {
      onBoundary: () => {
        if (!startedUtterance || currentUtteranceRef.current !== startedUtterance) return
      },
      onEnd: () => {
        if (!isMountedRef.current || !startedUtterance) return
        finishPlayback(startedUtterance)
      },
      onError: () => {
        if (!isMountedRef.current || !startedUtterance) return
        finishPlayback(startedUtterance)
      },
    })

    if (!utterance) return null

    startedUtterance = utterance
    currentUtteranceRef.current = utterance
    setPlaybackState('playing')

    return utterance
  }

  const startPlayback = () => {
    const utterance = startSegmentPlayback(0)
    if (!utterance) {
      resetPlayback()
    }
  }

  const pausePlayback = () => {
    if (!currentUtteranceRef.current) return

    pause()
    setPlaybackState('paused')
  }

  const resumePlayback = () => {
    if (!currentUtteranceRef.current) return

    resume()
    setPlaybackState('playing')
  }

  const stopPlayback = () => {
    stop()
    resetPlayback()
  }

  const disabled = !supported || !text || text.trim().length === 0

  if (playbackState === 'playing') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <Button
          variant={variant}
          size={size}
          onClick={pausePlayback}
          disabled={disabled}
          aria-label="Пауза"
          type="button"
          title="Поставить чтение на паузу"
        >
          <Pause className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">Пауза</span>}
        </Button>
        <Button
          variant="outline"
          size={size}
          onClick={stopPlayback}
          disabled={disabled}
          aria-label="Остановить"
          type="button"
          title="Остановить чтение"
        >
          <Square className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">Стоп</span>}
        </Button>
      </div>
    )
  }

  if (playbackState === 'paused') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <Button
          variant={variant}
          size={size}
          onClick={resumePlayback}
          disabled={disabled}
          aria-label="Продолжить"
          type="button"
          title="Продолжить чтение"
        >
          <Play className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">Продолжить</span>}
        </Button>
        <Button
          variant="outline"
          size={size}
          onClick={stopPlayback}
          disabled={disabled}
          aria-label="Остановить"
          type="button"
          title="Остановить чтение"
        >
          <Square className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">Стоп</span>}
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button
        variant={variant}
        size={size}
        onClick={startPlayback}
        disabled={disabled}
        aria-label={label}
        type="button"
      title={!disabled ? 'Прослушать исходный текст' : undefined}
      >
        <Volume2 className="h-4 w-4" />
        {size !== 'icon' && <span className="ml-2">{label}</span>}
      </Button>
    </div>
  )
}

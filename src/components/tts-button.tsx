'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speak, stop, isTTSSupported, isSpeaking } from '@/utils/tts'

interface TTSButtonProps {
  text: string
  label?: string
  lang?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

/**
 * Reusable Text-to-Speech button component
 * 
 * Provides safe, accessible TTS playback using browser-native Web Speech API.
 * Gracefully disables if TTS is not supported.
 */
export function TTSButton({
  text,
  label = 'Listen',
  lang = 'en-US',
  variant = 'ghost',
  size = 'sm',
  className = '',
}: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  // Initialize support check using useState initializer to avoid setState in effect
  const [supported] = useState(() => isTTSSupported())
  const monitoringRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Monitor speech state only when we expect speech to be playing
  useEffect(() => {
    if (!supported) return

    // Only start monitoring if we think speech is playing
    if (isPlaying && !monitoringRef.current) {
      monitoringRef.current = true
      
      intervalRef.current = setInterval(() => {
        const currentlySpeaking = isSpeaking()
        
        if (!currentlySpeaking && isPlaying) {
          // Speech ended, stop monitoring
          setIsPlaying(false)
          monitoringRef.current = false
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, 200) // Reduced frequency to 200ms to reduce re-renders
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      monitoringRef.current = false
    }
  }, [supported, isPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) {
        stop()
      }
    }
  }, [isPlaying])

  const handleClick = () => {
    if (!supported || !text || text.trim().length === 0) return

    if (isPlaying) {
      // If playing, stop it
      stop()
      setIsPlaying(false)
      monitoringRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } else {
      // Start speaking
      speak(text, lang)
      
      // Update state after a brief delay to account for speech start
      setTimeout(() => {
        const speaking = isSpeaking()
        setIsPlaying(speaking)
        if (speaking) {
          monitoringRef.current = true
        }
      }, 150)
    }
  }

  // Disable if not supported or no text
  const disabled = !supported || !text || text.trim().length === 0

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className={className}
      aria-label={label}
      type="button"
      title={!disabled ? 'Listen to correct pronunciation' : undefined}
    >
      <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
      {size !== 'icon' && <span className="ml-2">{label}</span>}
    </Button>
  )
}

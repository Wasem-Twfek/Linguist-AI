export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stop(): void {
  if (!isTTSSupported()) return
  
  const synth = window.speechSynthesis
  
  synth.cancel()
}

export function pause(): boolean {
  if (!isTTSSupported()) return false

  const synth = window.speechSynthesis

  if (synth.speaking && !synth.paused) {
    synth.pause()
    return true
  }

  return synth.paused
}

export function resume(): boolean {
  if (!isTTSSupported()) return false

  const synth = window.speechSynthesis

  if (synth.paused) {
    synth.resume()
    return true
  }

  return synth.speaking && !synth.paused
}

interface SpeakCallbacks {
  onEnd?: () => void
  onError?: (error: SpeechSynthesisErrorEvent) => void
  onBoundary?: (event: SpeechSynthesisEvent) => void
}

export function speak(
  text: string,
  lang: string = 'en-US',
  callbacks?: SpeakCallbacks
): SpeechSynthesisUtterance | null {
  if (!isTTSSupported()) {
    console.warn('SpeechSynthesis is not supported in this browser')
    return null
  }

  if (!text || text.trim().length === 0) {
    console.warn('Cannot speak empty text')
    return null
  }

  const synth = window.speechSynthesis

  stop()

  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.lang = lang
  utterance.rate = 0.9
  utterance.pitch = 1.0
  utterance.volume = 1.0

  utterance.onend = () => {
    callbacks?.onEnd?.()
  }

  utterance.onerror = (error) => {
    callbacks?.onError?.(error)

    const errorInfo = error.error 
      ? `Error type: ${error.error}`
      : error.type 
      ? `Error type: ${error.type}`
      : 'Unknown TTS error'
    
    if (error.error !== 'canceled' && error.error !== 'interrupted') {
      console.warn('TTS error:', errorInfo, {
        charIndex: error.charIndex,
        charLength: error.charLength,
        utterance: error.utterance?.text?.substring(0, 50) || 'N/A'
      })
    }
  }

  utterance.onboundary = (event) => {
    callbacks?.onBoundary?.(event)
  }

  synth.speak(utterance)

  return utterance
}

export function isSpeaking(): boolean {
  if (!isTTSSupported()) return false
  return window.speechSynthesis.speaking
}

export function isPaused(): boolean {
  if (!isTTSSupported()) return false
  return window.speechSynthesis.paused
}

/**
 * Text-to-Speech utility using browser-native Web Speech API
 * 
 * Provides safe, client-side TTS functionality without external dependencies.
 * Handles cancellation and prevents memory leaks.
 */

/**
 * Check if SpeechSynthesis is supported in the browser
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Stop any currently playing speech
 */
export function stop(): void {
  if (!isTTSSupported()) return
  
  const synth = window.speechSynthesis
  
  // Cancel any pending or active utterances
  synth.cancel()
}

/**
 * Speak text using browser TTS
 * 
 * @param text - Text to speak
 * @param lang - Language code (default: 'en-US')
 */
export function speak(text: string, lang: string = 'en-US'): void {
  if (!isTTSSupported()) {
    console.warn('SpeechSynthesis is not supported in this browser')
    return
  }

  if (!text || text.trim().length === 0) {
    console.warn('Cannot speak empty text')
    return
  }

  const synth = window.speechSynthesis

  // Stop any currently playing speech before starting new one
  stop()

  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.lang = lang
  utterance.rate = 0.9 // Slightly slower for clarity
  utterance.pitch = 1.0
  utterance.volume = 1.0

  // Handle completion and errors
  utterance.onend = () => {
    // Cleanup handled by speechSynthesis state
  }

  utterance.onerror = (error) => {
    // SpeechSynthesis error objects don't serialize well, extract useful info
    const errorInfo = error.error 
      ? `Error type: ${error.error}`
      : error.type 
      ? `Error type: ${error.type}`
      : 'Unknown TTS error'
    
    // Only log if it's a real error (not cancellation)
    // 'canceled' and 'interrupted' are normal when user stops speech
    if (error.error !== 'canceled' && error.error !== 'interrupted') {
      console.warn('TTS error:', errorInfo, {
        charIndex: error.charIndex,
        charLength: error.charLength,
        utterance: error.utterance?.text?.substring(0, 50) || 'N/A'
      })
    }
  }

  // Speak
  synth.speak(utterance)
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  if (!isTTSSupported()) return false
  return window.speechSynthesis.speaking
}

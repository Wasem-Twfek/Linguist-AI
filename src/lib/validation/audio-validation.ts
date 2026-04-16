/**
 * Audio validation constants and helpers
 * Server-side validation rules for audio submissions
 */

// Minimum duration in seconds required for a valid attempt
// This prevents 0-second or very short accidental recordings from being evaluated
export const MIN_AUDIO_DURATION_SECONDS = 3

// Minimum file size in bytes (very short recordings produce minimal file sizes)
// WebM audio at ~16kbps would produce ~6KB per second minimum
// 3 seconds * 6KB = ~18KB minimum for a valid recording
export const MIN_AUDIO_FILE_SIZE_BYTES = 15000 // ~15KB conservative estimate

/**
 * Validate audio duration
 * @param durationSeconds - Duration in seconds
 * @returns true if duration is valid
 */
export function isValidAudioDuration(durationSeconds: number): boolean {
  return durationSeconds >= MIN_AUDIO_DURATION_SECONDS
}

/**
 * Validate audio file size as a proxy for duration
 * This provides an additional server-side check
 * @param fileSizeBytes - File size in bytes
 * @returns true if file size suggests valid duration
 */
export function isValidAudioFileSize(fileSizeBytes: number): boolean {
  return fileSizeBytes >= MIN_AUDIO_FILE_SIZE_BYTES
}

/**
 * Estimate minimum expected file size for a given duration
 * WebM audio at ~16kbps produces approximately 2KB per second
 * This is a conservative estimate for validation
 */
export function estimateMinFileSize(durationSeconds: number): number {
  // ~2KB per second is conservative for WebM audio
  return Math.floor(durationSeconds * 2000)
}

export const MIN_AUDIO_DURATION_SECONDS = 3

export const MIN_AUDIO_FILE_SIZE_BYTES = 15000

export function isValidAudioDuration(durationSeconds: number): boolean {
  return durationSeconds >= MIN_AUDIO_DURATION_SECONDS
}

export function isValidAudioFileSize(fileSizeBytes: number): boolean {
  return fileSizeBytes >= MIN_AUDIO_FILE_SIZE_BYTES
}

export function estimateMinFileSize(durationSeconds: number): number {
  return Math.floor(durationSeconds * 2000)
}

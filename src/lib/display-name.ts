/**
 * Helper to compute display name for users
 * Returns full_name if present and non-empty, otherwise email
 * Never returns empty string or blank
 */
export function getDisplayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const trimmedName = fullName?.trim()
  if (trimmedName && trimmedName.length > 0) {
    return trimmedName
  }
  // Always return email as fallback (never blank, never "No name")
  // Email should always be present, but if missing, return a non-blank identifier
  return email || 'Пользователь'
}


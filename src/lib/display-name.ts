export function getDisplayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const trimmedName = fullName?.trim()
  if (trimmedName && trimmedName.length > 0) {
    return trimmedName
  }
  return email || 'Пользователь'
}


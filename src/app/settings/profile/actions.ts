'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const fullNameSchema = z.string()
  .trim()
  .min(2, 'Имя должно содержать минимум 2 символа')
  .max(80, 'Имя не должно превышать 80 символов')

export async function updateProfileName(fullName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Validate full name
  const validation = fullNameSchema.safeParse(fullName)
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Неверное имя' }
  }

  const trimmedName = validation.data

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmedName })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile name:', error)
    return { error: 'Ошибка при обновлении имени' }
  }

  return { success: true }
}


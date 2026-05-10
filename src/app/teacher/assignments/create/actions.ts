'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAssignment(data: {
  groupId: string
  title: string
  type: 'reading' | 'essay'
  textContent: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут создавать задания' }
  }

  if (!data.groupId || !data.title || !data.type || !data.textContent) {
    return { error: 'Все поля обязательны для заполнения' }
  }

  if (data.title.trim().length === 0 || data.textContent.trim().length === 0) {
    return { error: 'Все поля обязательны для заполнения' }
  }

  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      group_id: data.groupId,
      title: data.title.trim(),
      type: data.type,
      text_content: data.textContent.trim(),
      created_by: user.id,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !assignment) {
    console.error('Error creating assignment:', error)
    return { error: 'Ошибка при создании задания' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')
  return { 
    success: true,
    assignment: assignment
  }
}

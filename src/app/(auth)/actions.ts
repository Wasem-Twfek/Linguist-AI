'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

type SignupState = { error?: string; success?: boolean } | null

type ChooseRoleState = { error?: string } | null

const chooseRoleSchema = z.enum(['student', 'teacher'])

export async function chooseRoleAction(
  _prev: ChooseRoleState,
  formData: FormData
): Promise<ChooseRoleState> {
  const raw = formData.get('role')
  const parsed = chooseRoleSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Выберите роль' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const meta = user.user_metadata as Record<string, unknown> | undefined
  const fullName =
    existing?.full_name ??
    (typeof meta?.full_name === 'string' ? meta.full_name : null) ??
    (typeof meta?.name === 'string' ? meta.name : null)

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      role: parsed.data,
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[chooseRoleAction]', error)
    return { error: 'Не удалось сохранить роль' }
  }

  redirect(parsed.data === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
}

const TEACHER_DASHBOARD = '/teacher/dashboard'
const STUDENT_DASHBOARD = '/student/dashboard'
const CHOOSE_ROLE = '/signup/choose-role'

function dashboardForOAuthRole(role: string): string {
  return role === 'teacher' ? TEACHER_DASHBOARD : STUDENT_DASHBOARD
}

/**
 * Run after browser `exchangeCodeForSession` so PKCE verifier is available (cookies).
 * Do not call this before the client completes the code exchange.
 */
export async function completeOAuthRedirect() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login?error=oauth')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[completeOAuthRedirect] profile load', profileError)
    redirect('/login?error=profile')
  }

  if (profile?.role === 'teacher' || profile?.role === 'student') {
    redirect(dashboardForOAuthRole(profile.role))
  }

  if (!profile) {
    const meta = user.user_metadata as Record<string, unknown> | undefined
    const fullName =
      (typeof meta?.full_name === 'string' && meta.full_name) ||
      (typeof meta?.name === 'string' && meta.name) ||
      null

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      role: null,
    })

    if (insertError) {
      console.error('[completeOAuthRedirect] profile insert', insertError)
      redirect('/login?error=profile')
    }
  }

  redirect(CHOOSE_ROLE)
}

const fullNameSchema = z.string()
  .trim()
  .min(2, 'Имя должно содержать минимум 2 символа')
  .max(80, 'Имя не должно превышать 80 символов')

export async function signup(prevState: SignupState, formData: FormData, role: 'student' | 'teacher') {
  const supabase = await createClient()

  const fullNameRaw = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validate full name
  const fullNameValidation = fullNameSchema.safeParse(fullNameRaw)
  if (!fullNameValidation.success) {
    return { error: fullNameValidation.error.issues[0]?.message || 'Неверное имя' }
  }
  const fullName = fullNameValidation.data

  // Sign up with role in metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        role: role,
        full_name: fullName,
      },
    },
  })

  if (authError) {
    // Translate common error messages to Russian
    let errorMessage = authError.message
    if (authError.message.includes('User already registered')) {
      errorMessage = 'Пользователь с таким email уже зарегистрирован'
    } else if (authError.message.includes('Password')) {
      errorMessage = 'Пароль слишком слабый'
    } else if (authError.message.includes('Email')) {
      errorMessage = 'Неверный формат email'
    }
    return { error: errorMessage }
  }

  // Create or update profile entry in profiles table
  // Use upsert to handle cases where profile might already exist (e.g., from a database trigger)
  // Store email for easier lookup when teachers add students to groups
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          full_name: fullName,
          role: role,
          email: email, // Store email for group member lookup
        },
        {
          onConflict: 'id',
        }
      )

    if (profileError) {
      // If upsert fails, try update (profile might exist from trigger)
      if (profileError.code === '23505') {
        // Profile exists, update it instead
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: fullName, role: role, email: email })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Error updating profile:', updateError)
          // Don't fail signup - profile exists, just might have stale data
        }
      } else {
        // Unexpected error
        console.error('Error creating/updating profile:', profileError)
        // Don't fail signup - auth user is created, profile can be fixed later
      }
    }
  }

  return { success: true }
}

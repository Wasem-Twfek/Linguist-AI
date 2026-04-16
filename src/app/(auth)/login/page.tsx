'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'
import { SocialAuth } from '@/components/auth/social-auth'

function LoginForm() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'student'
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const oauthToastShown = useRef(false)

  useEffect(() => {
    if (oauthToastShown.current) return
    const err = searchParams.get('error')
    const detail = searchParams.get('detail')
    if (err !== 'oauth') return
    oauthToastShown.current = true
    let msg = 'Вход через соцсеть не удался. Проверьте настройки провайдера в Supabase.'
    if (detail) {
      try {
        msg = `Вход через соцсеть не удался: ${decodeURIComponent(detail)}`
      } catch {
        msg = `Вход через соцсеть не удался: ${detail}`
      }
    }
    toast.error(msg)
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // Translate common error messages to Russian
        let errorMessage = authError.message
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Неверный email или пароль'
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Email не подтвержден'
        }
        toast.error(errorMessage)
        setLoading(false)
        return
      }

      if (!authData.user) {
        toast.error('Не удалось получить данные пользователя')
        setLoading(false)
        return
      }

      // Do NOT redirect yet - fetch profile first
      const userId = authData.user.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        toast.error('Ошибка при получении профиля')
        setLoading(false)
        return
      }

      // Log the role to console
      console.log('User role:', profile?.role)

      // Get role from profile table
      const userRole = profile?.role

      // Conditional redirection based on role from database
      if (userRole === 'teacher') {
        router.push('/teacher/dashboard')
      } else if (userRole === 'student') {
        router.push('/student/dashboard')
      } else {
        // Role is missing/null - redirect to home
        router.push('/')
      }
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Произошла ошибка при входе')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Вход в систему</CardTitle>
          <CardDescription>
            Введите вашу электронную почту и пароль
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SocialAuth />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">или</span>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Электронная почта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Нет аккаунта? </span>
            <Link href={`/signup?role=${role}`} className="text-primary hover:underline">
              Зарегистрироваться
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Вход в систему</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

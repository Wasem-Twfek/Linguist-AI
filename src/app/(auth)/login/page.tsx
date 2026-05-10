'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SmartBackButton } from '@/components/smart-back-button'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'
import { SocialAuth } from '@/components/auth/social-auth'

const authHighlights = [
  'Задания для групп и отдельных уровней',
  'Запись речи прямо в браузере',
  'AI-отчеты для преподавателя и учащегося',
]

function parseAuthRole(roleParam: string | null): 'student' | 'teacher' | null {
  return roleParam === 'teacher' || roleParam === 'student' ? roleParam : null
}

function AuthBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[oklch(0.25_0.09_262)] to-[oklch(0.35_0.13_258)] p-10 text-primary-foreground shadow-elegant lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.62_0.18_258/0.35),transparent_50%)]" />
      <div className="relative flex min-h-[34rem] flex-col justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="Linguist AI">
          <Image
            src="/logo.svg"
            alt=""
            width={44}
            height={44}
            className="rounded-xl bg-card shadow-soft"
            priority
          />
          <span className="font-display text-xl font-bold tracking-tight">
            Linguist <span className="text-[oklch(0.72_0.17_258)]">AI</span>
          </span>
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium text-primary-foreground/80">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.72_0.17_258)]" />
            AI-помощник для английского произношения
          </div>
          <h2 className="mt-7 max-w-md text-4xl font-bold leading-tight tracking-tight">
            Вход в рабочее пространство Linguist AI
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-primary-foreground/75">
            Продолжите работу с заданиями, группами, записями речи и отчетами по
            произношению.
          </p>
        </div>

        <ul className="space-y-3">
          {authHighlights.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-primary-foreground/90">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[oklch(0.72_0.17_258)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const role = parseAuthRole(searchParams.get('role'))
  const signupHref = role ? `/signup?role=${role}` : '/signup/choose-role'
  const signupLead =
    role === 'teacher'
      ? 'Нет аккаунта преподавателя? '
      : role === 'student'
        ? 'Нет аккаунта учащегося? '
        : 'Нет аккаунта? '
  const signupLabel = role ? 'Зарегистрироваться' : 'Выбрать роль'
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
    let msg = 'Вход через соцсеть не удался. Попробуйте еще раз или войдите по email.'
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

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
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

      const userRole = profile?.role

      if (userRole === 'teacher') {
        router.push('/teacher/dashboard')
      } else if (userRole === 'student') {
        router.push('/student/dashboard')
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Произошла ошибка при входе')
      setLoading(false)
    }
  }

  return (
    <div className="app-light min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-12">
        <AuthBrandPanel />

        <div className="w-full max-w-[31rem] justify-self-center">
          <SmartBackButton fallbackHref="/" label="Назад на главную" className="mb-5 self-start" />
          <Card className="w-full rounded-3xl border-border bg-card shadow-elegant">
            <CardHeader className="space-y-5 p-7 pb-4 sm:p-8 sm:pb-5">
              <Link href="/" className="flex items-center gap-3 lg:hidden" aria-label="Linguist AI">
                <Image
                  src="/logo.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-xl shadow-soft"
                  priority
                />
                <span className="font-display text-xl font-bold tracking-tight text-foreground">
                  Linguist <span className="text-accent">AI</span>
                </span>
              </Link>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Вход в систему
                </h1>
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  Введите вашу электронную почту и пароль, чтобы перейти к
                  заданиям и отчетам.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-7 pt-2 sm:p-8 sm:pt-3">
              <SocialAuth />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 font-medium text-muted-foreground">или</span>
                </div>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-foreground">
                    Электронная почта
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border-border bg-card px-4 text-base shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold text-foreground">
                    Пароль
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border-border bg-card px-4 text-base shadow-soft"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-full text-base shadow-elegant"
                  disabled={loading}
                >
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
              </form>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">{signupLead}</span>
                <Link href={signupHref} className="font-semibold text-accent hover:underline">
                  {signupLabel}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="app-light flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <div className="flex w-full max-w-[31rem] flex-col gap-3">
          <SmartBackButton fallbackHref="/" label="Назад на главную" className="self-start" />
          <Card className="w-full rounded-3xl border-border bg-card shadow-elegant">
          <CardHeader className="p-7 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight">Вход в систему</h1>
          </CardHeader>
          <CardContent className="p-7 pt-0 sm:p-8 sm:pt-0">
            <p className="text-muted-foreground">Загрузка...</p>
          </CardContent>
          </Card>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

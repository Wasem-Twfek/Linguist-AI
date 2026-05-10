'use client'

import Image from 'next/image'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SmartBackButton } from '@/components/smart-back-button'
import { signup } from '../actions'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useActionState, Suspense, useEffect } from 'react'
import { toast } from 'sonner'

const signupHighlights = [
  'Создавайте задания и группы для класса',
  'Записывайте речь прямо в браузере',
  'Получайте AI-отчеты по произношению',
]

function parseSignupRole(roleParam: string | null): 'student' | 'teacher' | null {
  return roleParam === 'teacher' || roleParam === 'student' ? roleParam : null
}

function SignupBrandPanel({ role }: { role: 'student' | 'teacher' }) {
  const roleLabel = role === 'teacher' ? 'преподавателя' : 'учащегося'

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
            Регистрация {roleLabel}
          </div>
          <h2 className="mt-7 max-w-md text-4xl font-bold leading-tight tracking-tight">
            Создайте аккаунт в Linguist AI
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-primary-foreground/75">
            Подключитесь к платформе для заданий, аудиозаписей и понятной
            обратной связи по английскому произношению.
          </p>
        </div>

        <ul className="space-y-3">
          {signupHighlights.map((item) => (
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

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = parseSignupRole(searchParams.get('role'))

  useEffect(() => {
    if (!role) {
      router.replace('/signup/choose-role')
    }
  }, [role, router])

  if (!role) {
    return (
      <div className="app-light flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <div className="flex w-full max-w-[31rem] flex-col gap-3">
          <SmartBackButton
            fallbackHref="/signup/choose-role"
            label="Назад к выбору роли"
            className="self-start"
          />
          <Card className="w-full rounded-3xl border-border bg-card shadow-elegant">
            <CardHeader className="p-7 sm:p-8">
              <h1 className="text-3xl font-bold tracking-tight">Выбор роли</h1>
            </CardHeader>
            <CardContent className="p-7 pt-0 sm:p-8 sm:pt-0">
              <p className="text-muted-foreground">Перенаправление...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <SignupFormContent role={role} />
}

function SignupFormContent({ role }: { role: 'student' | 'teacher' }) {
  const router = useRouter()
  type SignupState = { error?: string; success?: boolean } | null
  
  const [state, formAction] = useActionState(
    (prevState: SignupState, formData: FormData) => signup(prevState, formData, role),
    null
  )

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    } else if (state?.success) {
      toast.success('Успешная регистрация! Перенаправление на страницу входа...')
      setTimeout(() => {
        router.push(`/login?role=${role}`)
      }, 1500)
    }
  }, [state, role, router])

  return (
    <div className="app-light min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-12">
        <SignupBrandPanel role={role} />

        <div className="w-full max-w-[31rem] justify-self-center">
          <SmartBackButton
            fallbackHref={`/login?role=${role}`}
            label="Назад к входу"
            className="mb-5 self-start"
          />
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
                  Регистрация
                </h1>
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  Введите вашу информацию для создания аккаунта.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-7 pt-2 sm:p-8 sm:pt-3">
              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-semibold text-foreground">
                    Имя и фамилия *
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    required
                    minLength={2}
                    maxLength={80}
                    className="h-12 rounded-2xl border-border bg-card px-4 text-base shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-foreground">
                    Электронная почта
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    className="h-12 rounded-2xl border-border bg-card px-4 text-base shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold text-foreground">
                    Пароль
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="h-12 rounded-2xl border-border bg-card px-4 text-base shadow-soft"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-full text-base shadow-elegant"
                >
                  Создать аккаунт
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Уже есть аккаунт? </span>
                <Link href={`/login?role=${role}`} className="font-semibold text-accent hover:underline">
                  Войти
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="app-light flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <div className="flex w-full max-w-[31rem] flex-col gap-3">
          <SmartBackButton
            fallbackHref="/signup/choose-role"
            label="Назад к выбору роли"
            className="self-start"
          />
          <Card className="w-full rounded-3xl border-border bg-card shadow-elegant">
          <CardHeader className="p-7 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight">Регистрация</h1>
          </CardHeader>
          <CardContent className="p-7 pt-0 sm:p-8 sm:pt-0">
            <p className="text-muted-foreground">Загрузка...</p>
          </CardContent>
          </Card>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}


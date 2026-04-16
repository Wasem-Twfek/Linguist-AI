'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { signup } from '../actions'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useActionState, Suspense, useEffect } from 'react'
import { toast } from 'sonner'

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roleParam = searchParams.get('role')
  const role = (roleParam === 'teacher' ? 'teacher' : 'student') as 'student' | 'teacher'
  
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
      // Redirect to login after successful signup
      setTimeout(() => {
        router.push(`/login?role=${role}`)
      }, 1500)
    }
  }, [state, role, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Регистрация</CardTitle>
          <CardDescription>
            Введите вашу информацию для создания аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя и фамилия *</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Иванов Иван Иванович"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Электронная почта</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full">
              Создать аккаунт
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Уже есть аккаунт? </span>
            <Link href={`/login?role=${role}`} className="text-primary hover:underline">
              Войти
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Регистрация</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}


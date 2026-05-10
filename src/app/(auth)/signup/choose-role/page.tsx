import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, CheckCircle2, GraduationCap, Sparkles } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SmartBackButton } from '@/components/smart-back-button'
import { ChooseRoleForm } from './choose-role-form'

export default async function ChooseRolePage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const isAuthenticated = !userError && Boolean(user)

  if (isAuthenticated && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'teacher' || profile?.role === 'student') {
      redirect(
        profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
      )
    }
  }

  return (
    <div className="app-light min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center px-4 py-8 sm:px-6">
        <SmartBackButton fallbackHref="/" label="Назад на главную" className="mb-5 self-start" />
        <Card className="w-full rounded-3xl border-border bg-card shadow-elegant">
          <CardHeader className="items-center space-y-5 p-7 text-center sm:p-10 sm:pb-6">
            <Link href="/" className="flex items-center gap-3" aria-label="Linguist AI">
              <Image
                src="/logo.svg"
                alt=""
                width={44}
                height={44}
                className="rounded-xl shadow-soft"
                priority
              />
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Linguist <span className="text-accent">AI</span>
              </span>
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Выбор роли
            </div>
            <div className="space-y-2">
              <h1 className="break-words text-3xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl">
                Как вы будете использовать Linguist AI?
              </h1>
              <CardDescription className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
                Выберите роль, чтобы открыть правильный сценарий регистрации.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-7 pt-2 sm:p-10 sm:pt-4">
            {isAuthenticated ? (
              <ChooseRoleForm />
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-stretch">
                <Button
                  asChild
                  className="group flex h-full min-h-0 w-full min-w-0 max-w-full shrink items-stretch justify-start overflow-hidden whitespace-normal rounded-3xl bg-primary p-0 text-left text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:bg-[oklch(0.18_0.07_265)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&:focus-visible]:ring-offset-background"
                >
                  <Link
                    href="/signup?role=teacher"
                    className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-stretch justify-start gap-5 whitespace-normal p-5 text-left sm:p-7"
                  >
                    <GraduationCap className="h-8 w-8 shrink-0" />
                    <span className="min-w-0 space-y-3">
                      <span className="block break-words text-xl font-bold leading-tight sm:text-2xl">
                        Я преподаватель
                      </span>
                      <span className="block break-words text-sm leading-relaxed text-primary-foreground/85">
                        Создавать задания, управлять группами и отслеживать прогресс учащихся.
                      </span>
                    </span>
                    <ul className="mt-1 space-y-2 text-sm text-primary-foreground/85">
                      <li className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">Задания и группы</span>
                      </li>
                      <li className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">Аналитика результатов</span>
                      </li>
                      <li className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">AI-отчеты учащихся</span>
                      </li>
                    </ul>
                    <span className="mt-auto flex w-full items-center justify-center rounded-full bg-primary-foreground/20 px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary-foreground/30">
                      Продолжить как преподаватель
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="group flex h-full min-h-0 w-full min-w-0 max-w-full shrink items-stretch justify-start overflow-hidden whitespace-normal rounded-3xl border-2 border-border bg-card p-0 text-left text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&:focus-visible]:ring-offset-background"
                >
                  <Link
                    href="/signup?role=student"
                    className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-stretch justify-start gap-5 whitespace-normal p-5 text-left sm:p-7"
                  >
                    <BookOpen className="h-8 w-8 shrink-0 text-accent" />
                    <span className="min-w-0 space-y-3">
                      <span className="block break-words text-xl font-bold leading-tight sm:text-2xl">
                        Я учащийся
                      </span>
                      <span className="block break-words text-sm leading-relaxed text-muted-foreground">
                        Выполнять задания, записывать речь и получать обратную связь по
                        произношению.
                      </span>
                    </span>
                    <ul className="mt-1 space-y-2 text-sm text-muted-foreground">
                      <li className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span className="min-w-0 break-words">Назначенные задания</span>
                      </li>
                      <li className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span className="min-w-0 break-words">Запись речи</span>
                      </li>
                      <li className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span className="min-w-0 break-words">AI-отчет</span>
                      </li>
                    </ul>
                    <span className="mt-auto flex w-full items-center justify-center rounded-full border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors group-hover:border-accent/50 group-hover:bg-accent/15">
                      Продолжить как учащийся
                    </span>
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

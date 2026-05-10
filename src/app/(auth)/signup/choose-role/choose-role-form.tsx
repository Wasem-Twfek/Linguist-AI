'use client'

import { useActionState } from 'react'
import { chooseRoleAction } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { BookOpen, CheckCircle2, GraduationCap } from 'lucide-react'

export function ChooseRoleForm() {
  const [state, formAction] = useActionState(chooseRoleAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-stretch">
        <Button
          type="submit"
          name="role"
          value="teacher"
          className="group flex h-full min-h-0 w-full min-w-0 max-w-full shrink items-stretch justify-start overflow-hidden whitespace-normal rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:bg-[oklch(0.18_0.07_265)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6 [&:focus-visible]:ring-offset-background"
        >
          <span className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch gap-5 whitespace-normal">
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
          </span>
        </Button>
        <Button
          type="submit"
          name="role"
          value="student"
          variant="outline"
          className="group flex h-full min-h-0 w-full min-w-0 max-w-full shrink items-stretch justify-start overflow-hidden whitespace-normal rounded-3xl border-2 border-border bg-card p-5 text-left text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6 [&:focus-visible]:ring-offset-background"
        >
          <span className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch gap-5 whitespace-normal">
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
          </span>
        </Button>
      </div>
    </form>
  )
}

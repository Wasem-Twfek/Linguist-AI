'use client'

import { useActionState } from 'react'
import { chooseRoleAction } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'

export function ChooseRoleForm() {
  const [state, formAction] = useActionState(chooseRoleAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          name="role"
          value="student"
          variant="outline"
          className="w-full"
        >
          Я ученик
        </Button>
        <Button type="submit" name="role" value="teacher" className="w-full">
          Я учитель
        </Button>
      </div>
    </form>
  )
}

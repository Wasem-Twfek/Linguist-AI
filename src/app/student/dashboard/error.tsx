'use client'

import { ErrorState } from '@/components/state-view'
import { Button } from '@/components/ui/button'

export default function StudentDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="container mx-auto px-4 py-8">
      <ErrorState
        title="Не удалось загрузить дашборд студента"
        description={error.message || 'Произошла непредвиденная ошибка. Попробуйте обновить данные.'}
        actionHref="#"
        actionLabel="Повторить"
        className="mb-4"
      />
      <Button
        type="button"
        onClick={reset}
        variant="secondary"
        className="rounded-full"
      >
        Перезапустить страницу
      </Button>
    </main>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/state-view'

export default function TeacherDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="container mx-auto px-4 py-8">
      <ErrorState
        title="Не удалось загрузить панель преподавателя"
        description={error.message || 'Произошла непредвиденная ошибка. Попробуйте снова.'}
      />
      <div className="mt-4">
        <Button onClick={reset} variant="outline" className="rounded-full">
          Повторить
        </Button>
      </div>
    </main>
  )
}

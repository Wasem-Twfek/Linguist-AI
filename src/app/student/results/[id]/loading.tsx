import { LoadingState } from '@/components/state-view'

export default function StudentResultLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <LoadingState
        title="Загрузка отчета..."
        description="Получаем сохраненный результат анализа."
      />
    </main>
  )
}

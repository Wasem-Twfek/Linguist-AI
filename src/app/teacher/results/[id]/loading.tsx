import { LoadingState } from '@/components/state-view'

export default function TeacherResultLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <LoadingState
        title="Загрузка отчета..."
        description="Проверяем доступ преподавателя и загружаем результат."
      />
    </main>
  )
}

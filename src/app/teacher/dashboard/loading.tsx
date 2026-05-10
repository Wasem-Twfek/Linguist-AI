import { LoadingState } from '@/components/state-view'

export default function TeacherDashboardLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <LoadingState
        title="Загрузка панели преподавателя..."
        description="Загружаем задания, группы и аналитику."
      />
    </main>
  )
}

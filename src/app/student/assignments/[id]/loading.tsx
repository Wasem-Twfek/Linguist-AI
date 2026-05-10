import { LoadingState } from '@/components/state-view'

export default function AssignmentLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <LoadingState title="Загрузка задания..." />
    </main>
  )
}

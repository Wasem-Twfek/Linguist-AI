import { redirect } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { DashboardHeader } from '@/components/dashboard-header'
import { ErrorState } from '@/components/state-view'
import { ReportView } from '@/components/report-view'
import { getTeacherReport } from '@/lib/audio/result-audio-reports'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeacherResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function TeacherResultPage({ params }: TeacherResultPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    if (profile?.role === 'student') {
      redirect('/student/dashboard')
    }
    redirect('/login')
  }

  const report = await getTeacherReport(id, user.id)

  return (
    <AuthGuard requiredRole="teacher">
      <div className="app-light min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          {report.status === 'ok' ? (
            <ReportView
              result={report.result}
              session={report.session}
              assignment={report.assignment}
              audioPlaybackUrl={report.audioPlaybackUrl}
              audioObjectMissing={report.audioObjectMissing}
              backHref="/teacher/dashboard"
              backLabel="Вернуться к панели преподавателя"
            />
          ) : report.status === 'denied' ? (
            <ErrorState
              title="У вас нет доступа к этому разделу."
              description="Этот отчет относится к заданию другого преподавателя."
              actionHref="/teacher/dashboard"
              actionLabel="Вернуться к панели преподавателя"
            />
          ) : (
            <ErrorState
              title="Отчет не найден"
              description="Результат мог быть удален или еще не сохранен."
              actionHref="/teacher/dashboard"
              actionLabel="Вернуться к панели преподавателя"
            />
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

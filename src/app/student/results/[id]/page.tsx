import { redirect } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { DashboardHeader } from '@/components/dashboard-header'
import { ErrorState } from '@/components/state-view'
import { ReportView } from '@/components/report-view'
import { getStudentReport } from '@/lib/audio/result-audio-reports'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type StudentResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function StudentResultPage({ params }: StudentResultPageProps) {
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

  if (profile?.role !== 'student') {
    if (profile?.role === 'teacher') {
      redirect('/teacher/dashboard')
    }
    redirect('/login')
  }

  const report = await getStudentReport(id, user.id)

  return (
    <AuthGuard requiredRole="student">
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
              backHref="/student/dashboard"
              backLabel="Вернуться к заданиям"
              retryHref={report.session.assignment_id ? `/student/assignments/${report.session.assignment_id}` : null}
            />
          ) : report.status === 'denied' ? (
            <ErrorState
              title="У вас нет доступа к этому разделу."
              description="Этот отчет принадлежит другому пользователю."
              actionHref="/student/dashboard"
              actionLabel="Вернуться к заданиям"
            />
          ) : (
            <ErrorState
              title="Отчет не найден"
              description="Результат мог быть удален или еще не сохранен."
              actionHref="/student/dashboard"
              actionLabel="Вернуться к заданиям"
            />
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

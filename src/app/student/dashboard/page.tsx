import { redirect } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { SmartBackButton } from '@/components/smart-back-button'
import { DashboardHeader } from '@/components/dashboard-header'
import { createClient } from '@/utils/supabase/server'
import { getStudentAssignments, getStudentSubmissionHistory } from './data-actions'
import { StudentDashboardClient } from './student-dashboard-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const [{ assignments, error }, { submissions, error: submissionsError }] = await Promise.all([
    getStudentAssignments(),
    getStudentSubmissionHistory(),
  ])

  if (error) {
    console.error('Error loading assignments:', error)
  }

  if (submissionsError) {
    console.error('Error loading submission history:', submissionsError)
  }

  const { data: fullProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const needsName = !fullProfile?.full_name || fullProfile.full_name.trim().length === 0

  return (
    <AuthGuard requiredRole="student">
      <div className="app-light min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <SmartBackButton fallbackHref="/" label="Назад на главную" className="mb-6" />
          {needsName && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-soft">
              <p className="text-sm text-amber-800">
                <a href="/settings/profile" className="font-medium underline">
                  Заполните имя профиля
                </a>{' '}
                для лучшей идентификации
              </p>
            </div>
          )}
          <StudentDashboardClient
            initialAssignments={assignments}
            initialSubmissionHistory={submissions}
            studentName={fullProfile?.full_name ?? null}
            studentEmail={fullProfile?.email ?? user.email ?? null}
          />
        </main>
      </div>
    </AuthGuard>
  )
}

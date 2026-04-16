import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { AuthGuard } from '@/components/auth-guard'
import { getStudentAssignments } from './actions'
import { StudentDashboardClient } from './student-dashboard-client'

// Prevent caching of protected pages - forces server-side rendering on every request
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify student role - prevent teachers from accessing student routes
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') {
    // Redirect teachers to their dashboard
    if (profile?.role === 'teacher') {
      redirect('/teacher/dashboard')
    }
    // If role is missing/null, redirect to login
    redirect('/login')
  }

  const { assignments, error } = await getStudentAssignments()

  if (error) {
    console.error('Error loading assignments:', error)
  }

  // Fetch full profile for banner check
  const { data: fullProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const needsName = !fullProfile?.full_name || fullProfile.full_name.trim().length === 0

  return (
    <AuthGuard requiredRole="student">
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          {needsName && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <a href="/settings/profile" className="underline font-medium">
                  Заполните имя профиля
                </a>
                {' '}для лучшей идентификации
              </p>
            </div>
          )}
          <StudentDashboardClient initialAssignments={assignments} />
        </main>
      </div>
    </AuthGuard>
  )
}

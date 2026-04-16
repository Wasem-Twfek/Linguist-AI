import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { Database } from '@/types/supabase'
import { AuthGuard } from '@/components/auth-guard'
import { getAssignmentAnalytics } from '@/lib/analytics/getAssignmentAnalytics'
import { getTeacherGroups } from './actions'
import { TeacherDashboardClient } from './teacher-dashboard-client'

// Prevent caching of protected pages - forces server-side rendering on every request
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Assignment = Database['public']['Tables']['assignments']['Row']

async function getTeacherAssignments(userId: string): Promise<Assignment[]> {
  const supabase = await createClient()
  
  // Show only active assignments (soft-deleted ones are hidden)
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('created_by', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching assignments:', error)
    return []
  }

  return assignments || []
}

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify teacher role and fetch full profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    redirect('/student/dashboard')
  }

  const needsName = !profile?.full_name || profile.full_name.trim().length === 0

  const assignments = await getTeacherAssignments(user.id)

  // Fetch initial groups for teacher dashboard
  let initialGroups: Array<{ id: string; name: string; description: string | null; created_at: string | null; member_count: number }> = []
  try {
    const groupsResult = await getTeacherGroups()
    if (groupsResult.groups) {
      initialGroups = groupsResult.groups
    }
  } catch (error) {
    console.error('Failed to fetch initial groups:', error)
  }

  // Fetch analytics for all assignments
  // Analytics fetching must not block page render if it fails
  let analyticsMap = new Map<string, import('@/types/analytics').AssignmentAnalytics>()
  try {
    const assignmentIds = assignments.map(a => a.id)
    if (assignmentIds.length > 0) {
      analyticsMap = await getAssignmentAnalytics(assignmentIds, user.id)
    }
  } catch (error) {
    // Log error but don't throw - allow page to render without analytics
    console.error('Failed to fetch assignment analytics:', error)
  }

  return (
    <AuthGuard requiredRole="teacher">
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Панель преподавателя</h1>
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
          <TeacherDashboardClient 
            initialAssignments={assignments}
            initialAnalytics={analyticsMap}
            initialGroups={initialGroups}
          />
        </main>
      </div>
    </AuthGuard>
  )
}

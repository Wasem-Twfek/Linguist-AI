import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AudioRecorder } from '@/components/audio-recorder'
import { AuthGuard } from '@/components/auth-guard'

// Prevent caching of protected pages - forces server-side rendering on every request
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AssignmentPageProps {
  params: Promise<{ id: string }>
}

/**
 * Get assignment with security check - ensures student is in the assignment's group
 * CRITICAL: Students can ONLY access assignments from groups they belong to
 */
async function getAssignment(id: string, userId: string) {
  const supabase = await createClient()
  
  // First, get the assignment
  const { data: assignment, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .eq('is_active', true) // Only active assignments
    .single()

  if (error || !assignment || !assignment.group_id) {
    return null
  }

  // CRITICAL: Verify student is a member of the assignment's group
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', assignment.group_id)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    // Student is not a member of this group - deny access
    return null
  }

  // CRITICAL: Verify the group is active (soft-delete check)
  // Type assertion needed until types are regenerated after migration
  const groupQuery = supabase
    .from('study_groups')
    .select('id')
    .eq('id', assignment.group_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupError } = await (groupQuery as any).eq('is_active', true).single()

  if (groupError || !group) {
    // Group is inactive (soft-deleted) or doesn't exist - deny access
    return null
  }

  return assignment
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { id } = await params
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

  // CRITICAL: Pass userId to verify group membership
  const assignment = await getAssignment(id, user.id)

  if (!assignment) {
    // Assignment doesn't exist, is inactive, or student is not in the group
    redirect('/student/dashboard')
  }

  return (
    <AuthGuard requiredRole="student">
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
            {/* Left Column - Assignment Content */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{assignment.title || 'Без названия'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Тип: {assignment.type === 'reading' ? 'Чтение' : assignment.type === 'essay' ? 'Эссе' : assignment.type}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">
                      {assignment.text_content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Recording Interface (Sticky) */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <AudioRecorder 
                assignmentId={assignment.id}
                originalText={assignment.text_content || ''}
              />
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}



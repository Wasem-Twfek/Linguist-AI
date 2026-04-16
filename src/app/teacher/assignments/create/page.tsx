import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateAssignmentForm } from './create-assignment-form'

// Prevent caching of protected pages
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStudyGroups(userId: string) {
  const supabase = await createClient()
  
  // CRITICAL: Filter by is_active = true to exclude soft-deleted groups
  const groupsQuery = supabase
    .from('study_groups')
    .select('*')
    .eq('created_by', userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error } = await (groupsQuery as any).eq('is_active', true).order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching study groups:', error)
    return []
  }

  return groups || []
}

export default async function CreateAssignmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify teacher role from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    redirect('/student/dashboard')
  }

  const groups = await getStudyGroups(user.id)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Новое задание</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateAssignmentForm groups={groups} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


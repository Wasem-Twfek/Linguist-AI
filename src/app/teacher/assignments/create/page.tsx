import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { SmartBackButton } from '@/components/smart-back-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateAssignmentForm } from './create-assignment-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStudyGroups(userId: string) {
  const supabase = await createClient()
  
  const { data: groups, error } = await supabase
    .from('study_groups')
    .select('*')
    .eq('created_by', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

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
    <div className="app-light min-h-screen bg-background text-foreground">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <SmartBackButton
          fallbackHref="/teacher/dashboard"
          label="Назад к панели преподавателя"
          className="mb-6"
        />
        <Card className="mx-auto max-w-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Новое задание</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateAssignmentForm groups={groups} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


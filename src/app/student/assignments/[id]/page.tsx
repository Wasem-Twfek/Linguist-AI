import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { SmartBackButton } from '@/components/smart-back-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AudioRecorder } from '@/components/audio-recorder'
import { AuthGuard } from '@/components/auth-guard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AssignmentPageProps {
  params: Promise<{ id: string }>
}

const assignmentSteps = [
  'Прочитайте текст',
  'Запишите аудио',
  'Отправьте попытку',
  'Получите AI-отчет',
]

// Security: verify group membership before returning the assignment.
async function getAssignment(id: string, userId: string) {
  const supabase = await createClient()
  
  const { data: assignment, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !assignment || !assignment.group_id) {
    return null
  }

  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', assignment.group_id)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return null
  }

  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .select('id')
    .eq('id', assignment.group_id)
    .eq('is_active', true)
    .single()

  if (groupError || !group) {
    return null
  }

  return assignment
}

/*
 * AssignmentPage:
 * الغرض: صفحة قراءة النص والتسجيل.
 * input: id من URL.
 * output: UI فيه النص وAudioRecorder أو redirect لو access مرفوض.
 */
export default async function AssignmentPage({ params }: AssignmentPageProps) {
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

  const assignment = await getAssignment(id, user.id)

  if (!assignment) {
    redirect('/student/dashboard')
  }

  return (
    <AuthGuard requiredRole="student">
      <div className="app-light min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <SmartBackButton
            fallbackHref="/student/dashboard"
            label="Назад к заданиям"
            className="mb-6"
          />
          <Card className="mb-6 overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/70">
            <CardContent className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
              {assignmentSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/80 p-3 shadow-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl tracking-tight">{assignment.title || 'Без названия'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Тип: {assignment.type === 'reading' ? 'Чтение' : assignment.type === 'essay' ? 'Эссе' : assignment.type}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">
                      {assignment.text_content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

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

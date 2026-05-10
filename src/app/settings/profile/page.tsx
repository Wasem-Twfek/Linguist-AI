import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Award, BookOpen, GraduationCap, Mail, ShieldCheck, UserRound, UsersRound } from 'lucide-react'

import { AuthGuard } from '@/components/auth-guard'
import { DashboardHeader } from '@/components/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateAverageScore, formatScore } from '@/lib/analytics/analytics'
import { createClient } from '@/utils/supabase/server'
import { ProfileEditForm } from './profile-edit-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ProfileRole = 'teacher' | 'student'

type ProfileSummary = {
  label: string
  value: string | number
  helper: string
}

function getRoleLabel(role: ProfileRole) {
  return role === 'teacher' ? 'Преподаватель' : 'Учащийся'
}

function getDashboardHref(role: ProfileRole) {
  return role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
}

function getDashboardLabel(role: ProfileRole) {
  return role === 'teacher' ? 'Назад к панели преподавателя' : 'Назад к заданиям'
}

function getDisplayName(fullName: string | null, email: string) {
  return fullName?.trim() || email.split('@')[0] || 'Профиль'
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.trim()
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)

  if (parts.length === 0) return 'AI'

  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

async function getTeacherSummary(userId: string): Promise<ProfileSummary[]> {
  const supabase = await createClient()

  const [groupsResult, assignmentsResult] = await Promise.all([
    supabase
      .from('study_groups')
      .select('id, group_members(user_id)')
      .eq('created_by', userId)
      .eq('is_active', true),
    supabase
      .from('assignments')
      .select('id')
      .eq('created_by', userId)
      .eq('is_active', true),
  ])

  if (groupsResult.error) {
    console.error('Error loading profile teacher groups:', groupsResult.error)
  }

  if (assignmentsResult.error) {
    console.error('Error loading profile teacher assignments:', assignmentsResult.error)
  }

  const groupRows = groupsResult.data || []
  const uniqueStudentIds = new Set<string>()

  groupRows.forEach(group => {
    const members = Array.isArray(group.group_members) ? group.group_members : []
    members.forEach(member => {
      if (member.user_id) uniqueStudentIds.add(member.user_id)
    })
  })

  const assignmentIds = (assignmentsResult.data || []).map(assignment => assignment.id)
  let completedAttempts = 0

  if (assignmentIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .in('assignment_id', assignmentIds)

    if (sessionsError) {
      console.error('Error loading profile teacher sessions:', sessionsError)
    } else {
      const sessionIds = (sessions || []).map(session => session.id)

      if (sessionIds.length > 0) {
        const { count, error: resultsError } = await supabase
          .from('results')
          .select('id', { count: 'exact', head: true })
          .in('session_id', sessionIds)

        if (resultsError) {
          console.error('Error loading profile teacher attempts:', resultsError)
        } else {
          completedAttempts = count ?? 0
        }
      }
    }
  }

  return [
    { label: 'Группы', value: groupRows.length, helper: 'Активные учебные группы' },
    { label: 'Задания', value: assignmentIds.length, helper: 'Созданные задания для чтения' },
    { label: 'Учащиеся', value: uniqueStudentIds.size, helper: 'Уникальные участники групп' },
    { label: 'Попытки', value: completedAttempts, helper: 'Завершенные работы' },
  ]
}

async function getStudentSummary(userId: string): Promise<ProfileSummary[]> {
  const supabase = await createClient()

  const [membershipsResult, sessionsResult] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId),
    supabase
      .from('sessions')
      .select('id')
      .eq('user_id', userId),
  ])

  if (membershipsResult.error) {
    console.error('Error loading profile student memberships:', membershipsResult.error)
  }

  if (sessionsResult.error) {
    console.error('Error loading profile student sessions:', sessionsResult.error)
  }

  const groupIds = Array.from(
    new Set((membershipsResult.data || []).map(item => item.group_id).filter((id): id is string => Boolean(id)))
  )
  const sessionIds = (sessionsResult.data || []).map(session => session.id)

  const assignedTasksPromise = async () => {
    if (groupIds.length === 0) return 0

    const { data: activeGroups, error: activeGroupsError } = await supabase
      .from('study_groups')
      .select('id')
      .in('id', groupIds)
      .eq('is_active', true)

    if (activeGroupsError) {
      console.error('Error loading profile student active groups:', activeGroupsError)
      return 0
    }

    const activeGroupIds = (activeGroups || []).map(group => group.id)
    if (activeGroupIds.length === 0) return 0

    const { count, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('group_id', activeGroupIds)

    if (assignmentsError) {
      console.error('Error loading profile student assignments:', assignmentsError)
      return 0
    }

    return count ?? 0
  }

  const resultsSummaryPromise = async () => {
    if (sessionIds.length === 0) {
      return { completedAttempts: 0, averageScore: null as number | null }
    }

    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('overall_score')
      .in('session_id', sessionIds)

    if (resultsError) {
      console.error('Error loading profile student results:', resultsError)
      return { completedAttempts: 0, averageScore: null as number | null }
    }

    return {
      completedAttempts: results?.length ?? 0,
      averageScore: calculateAverageScore((results || []).map(result => result.overall_score)),
    }
  }

  const [assignedTasks, resultsSummary] = await Promise.all([assignedTasksPromise(), resultsSummaryPromise()])

  return [
    { label: 'Назначено', value: assignedTasks, helper: 'Доступные задания' },
    { label: 'Попытки', value: resultsSummary.completedAttempts, helper: 'Завершенные работы' },
    { label: 'Средний балл', value: formatScore(resultsSummary.averageScore), helper: 'По сохраненным отчетам' },
  ]
}

function SummaryCard({ item }: { item: ProfileSummary }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{item.label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{item.value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.helper}</p>
    </div>
  )
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching profile:', error)
    redirect('/login')
  }

  if (profile.role !== 'teacher' && profile.role !== 'student') {
    redirect('/login')
  }

  const role = profile.role
  const email = profile.email || user.email || ''
  const displayName = getDisplayName(profile.full_name, email)
  const initials = getInitials(displayName, email)
  const dashboardHref = getDashboardHref(role)
  const summary = role === 'teacher' ? await getTeacherSummary(user.id) : await getStudentSummary(user.id)

  return (
    <AuthGuard requiredRole={role}>
      <div className="app-light min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_42%,#ffffff_100%)] text-foreground">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              asChild
              variant="secondary"
              className="w-fit rounded-full"
            >
              <Link href={dashboardHref}>
                <ArrowLeft className="h-4 w-4" />
                {getDashboardLabel(role)}
              </Link>
            </Button>
          </div>

          <section className="mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-soft">
            <div className="grid gap-6 bg-gradient-to-br from-white via-blue-50/60 to-white p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr),auto] lg:items-center">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl border border-blue-100 bg-blue-700 text-3xl font-bold tracking-tight text-white shadow-[0_20px_45px_-24px_rgba(29,78,216,0.75)]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      {getRoleLabel(role)}
                    </Badge>
                    <Badge variant="neutral" className="bg-slate-100 text-slate-600">
                      Linguist AI
                    </Badge>
                  </div>
                  <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {displayName}
                  </h1>
                  <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="truncate">{email || 'Электронная почта не указана'}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    {role === 'teacher' ? <GraduationCap className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Рабочий профиль</p>
                    <p className="text-xs text-slate-500">
                      {role === 'teacher'
                        ? 'Управление группами и заданиями'
                        : 'Задания, записи и отчеты'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),400px]">
            <section className="space-y-6">
              <Card className="overflow-hidden rounded-3xl border-blue-100 bg-white shadow-soft">
                <CardHeader className="border-b border-blue-100 bg-blue-50/60">
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                    {role === 'teacher' ? <UsersRound className="h-5 w-5 text-blue-700" /> : <Award className="h-5 w-5 text-blue-700" />}
                    Сводка профиля
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-4">
                  {summary.map(item => (
                    <SummaryCard key={item.label} item={item} />
                  ))}
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-3xl border-blue-100 bg-white shadow-soft">
                <CardHeader className="border-b border-blue-100 bg-white">
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                    <BookOpen className="h-5 w-5 text-blue-700" />
                    Данные аккаунта
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Отображаемое имя</p>
                    <p className="mt-2 break-words text-sm font-medium text-slate-950">
                      {profile.full_name?.trim() || 'Не указано'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Электронная почта</p>
                    <p className="mt-2 break-words text-sm font-medium text-slate-950">
                      {email || 'Не указан'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Роль в системе</p>
                    <p className="mt-2 text-sm font-medium text-slate-950">{getRoleLabel(role)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Редактирование</p>
                    <p className="mt-2 text-sm font-medium text-slate-950">Можно изменить отображаемое имя</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <aside className="lg:sticky lg:top-8 lg:h-fit">
              <ProfileEditForm currentFullName={profile.full_name} email={email} />
            </aside>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

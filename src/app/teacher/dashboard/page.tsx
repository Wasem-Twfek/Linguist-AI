import { redirect } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { SmartBackButton } from '@/components/smart-back-button'
import { DashboardHeader } from '@/components/dashboard-header'
import { calculateAverageScore } from '@/lib/analytics/analytics'
import { getAssignmentAnalytics } from '@/lib/analytics/getAssignmentAnalytics'
import { getDisplayName } from '@/lib/display-name'
import { createClient } from '@/utils/supabase/server'
import type { Database } from '@/types/supabase'
import type {
  TeacherDashboardSummary,
  TeacherRecentResult,
} from './teacher-dashboard-client'
import { TeacherDashboardClient } from './teacher-dashboard-client'
import { getTeacherGroups } from './group-actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Assignment = Database['public']['Tables']['assignments']['Row']
type Session = Database['public']['Tables']['sessions']['Row']
type Result = Database['public']['Tables']['results']['Row']

type GroupWithCount = {
  id: string
  name: string
  description: string | null
  created_at: string | null
  member_count: number
}

async function getTeacherAssignments(userId: string): Promise<Assignment[]> {
  const supabase = await createClient()

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

async function getTeacherDashboardOverview(
  assignments: Assignment[],
  groups: GroupWithCount[]
): Promise<{ summary: TeacherDashboardSummary; recentResults: TeacherRecentResult[] }> {
  const supabase = await createClient()
  const assignmentIds = assignments.map(assignment => assignment.id)
  const groupIds = groups.map(group => group.id)

  let totalStudents = 0

  if (groupIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .in('group_id', groupIds)

    if (membersError) {
      console.error('Error fetching teacher student count:', membersError)
    } else {
      totalStudents = new Set(
        (members || []).map(member => member.user_id).filter((id): id is string => Boolean(id))
      ).size
    }
  }

  const emptySummary: TeacherDashboardSummary = {
    totalAssignments: assignments.length,
    totalGroups: groups.length,
    totalStudents,
    completedSubmissions: 0,
    averageScore: null,
    averagePronunciationScore: null,
    averageGrammarScore: null,
  }

  if (assignmentIds.length === 0) {
    return { summary: emptySummary, recentResults: [] }
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .in('assignment_id', assignmentIds)

  if (sessionsError || !sessions || sessions.length === 0) {
    if (sessionsError) {
      console.error('Error fetching teacher sessions:', sessionsError)
    }
    return { summary: emptySummary, recentResults: [] }
  }

  const sessionIds = sessions.map(session => session.id)
  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })

  if (resultsError || !results || results.length === 0) {
    if (resultsError) {
      console.error('Error fetching teacher results:', resultsError)
    }
    return { summary: emptySummary, recentResults: [] }
  }

  const studentIds = Array.from(
    new Set(sessions.map(session => session.user_id).filter((id): id is string => Boolean(id)))
  )

  const profilesMap = new Map<string, { full_name: string | null; email: string | null }>()
  if (studentIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)

    if (profilesError) {
      console.error('Error fetching recent result profiles:', profilesError)
    } else {
      ;(profiles || []).forEach(profile => {
        profilesMap.set(profile.id, {
          full_name: profile.full_name,
          email: profile.email,
        })
      })
    }
  }

  const sessionMap = new Map<string, Session>(sessions.map(session => [session.id, session]))
  const assignmentMap = new Map<string, Assignment>(
    assignments.map(assignment => [assignment.id, assignment])
  )
  const groupMap = new Map<string, GroupWithCount>(groups.map(group => [group.id, group]))

  const recentResults = results
    .map((result: Result) => {
      if (!result.session_id) return null

      const session = sessionMap.get(result.session_id)
      if (!session?.assignment_id) return null

      const assignment = assignmentMap.get(session.assignment_id)
      const profile = session.user_id ? profilesMap.get(session.user_id) : null
      const group = assignment?.group_id ? groupMap.get(assignment.group_id) : null

      return {
        resultId: result.id,
        studentId: session.user_id,
        studentName: getDisplayName(profile?.full_name, profile?.email),
        studentEmail: profile?.email ?? null,
        assignmentId: session.assignment_id,
        assignmentTitle: assignment?.title || 'Без названия',
        groupId: assignment?.group_id ?? null,
        groupName: group?.name ?? null,
        score: result.overall_score,
        pronunciationScore: result.pronunciation_score,
        grammarScore: result.grammar_score,
        submittedAt: result.created_at ?? session.finished_at,
      }
    })
    .filter((item): item is TeacherRecentResult => item !== null)

  return {
    summary: {
      ...emptySummary,
      completedSubmissions: results.length,
      averageScore: calculateAverageScore(results.map(result => result.overall_score)),
      averagePronunciationScore: calculateAverageScore(
        results.map(result => result.pronunciation_score)
      ),
      averageGrammarScore: calculateAverageScore(results.map(result => result.grammar_score)),
    },
    recentResults,
  }
}

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  let initialGroups: GroupWithCount[] = []
  try {
    const groupsResult = await getTeacherGroups()
    if (groupsResult.groups) {
      initialGroups = groupsResult.groups
    }
  } catch (error) {
    console.error('Failed to fetch initial groups:', error)
  }

  let analyticsMap = new Map<string, import('@/types/analytics').AssignmentAnalytics>()
  try {
    const assignmentIds = assignments.map(assignment => assignment.id)
    if (assignmentIds.length > 0) {
      analyticsMap = await getAssignmentAnalytics(assignmentIds, user.id)
    }
  } catch (error) {
    console.error('Failed to fetch assignment analytics:', error)
  }

  const { summary, recentResults } = await getTeacherDashboardOverview(assignments, initialGroups)

  return (
    <AuthGuard requiredRole="teacher">
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
                для лучшей идентификации в отчетах.
              </p>
            </div>
          )}

          <TeacherDashboardClient
            initialAssignments={assignments}
            initialAnalytics={analyticsMap}
            initialGroups={initialGroups}
            initialSummary={summary}
            initialRecentResults={recentResults}
          />
        </main>
      </div>
    </AuthGuard>
  )
}

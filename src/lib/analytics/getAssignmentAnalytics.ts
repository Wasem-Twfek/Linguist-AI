'use server'

import { createClient } from '@/utils/supabase/server'
import { getDisplayName } from '@/lib/display-name'
import {
  calculateAverageScore,
  calculateScoreDistribution,
  EMPTY_SCORE_DISTRIBUTION,
  getNumericScores,
} from '@/lib/analytics/analytics'
import type { AssignmentAnalytics } from '@/types/analytics'

const ANALYTICS_ACCESS_DENIED_ERROR = 'Analytics access denied for one or more assignments'

function createEmptyAnalytics(assignmentId: string, totalStudents = 0): AssignmentAnalytics {
  return {
    assignment_id: assignmentId,
    total_students: totalStudents,
    completed_attempts: 0,
    average_score: null,
    min_score: null,
    max_score: null,
    average_attempts: null,
    trend_data: [],
    score_delta: null,
    distribution: { ...EMPTY_SCORE_DISTRIBUTION },
    last_activity: null,
    latest_attempts: [],
  }
}

type SessionRow = {
  id: string
  assignment_id: string | null
  user_id: string | null
  attempt_number: number | null
}

type ResultWithStudent = {
  id: string
  session_id: string
  overall_score: number | null
  pronunciation_score: number | null
  grammar_score: number | null
  created_at: string | null
  assignment_id: string
  user_id: string
  attempt_number: number | null
}

function formatLastActivity(value: string | null) {
  if (!value) return null

  const lastDate = new Date(value)
  if (Number.isNaN(lastDate.getTime())) return null

  const now = new Date()
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'

  return `${diffDays} дн. назад`
}

export async function getAssignmentAnalytics(
  assignmentIds: string[],
  teacherUserId: string
): Promise<Map<string, AssignmentAnalytics>> {
  const supabase = await createClient()

  const requestedAssignmentIds = Array.from(
    new Set(assignmentIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
  )

  if (requestedAssignmentIds.length === 0) {
    return new Map()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherUserId)
    .single()

  if (profile?.role !== 'teacher') {
    console.error('Analytics access denied: user is not a teacher')
    return new Map()
  }

  let allowedAssignmentIds: string[] = []

  try {
    const { data: ownedAssignments, error: ownedAssignmentsError } = await supabase
      .from('assignments')
      .select('id, group_id')
      .eq('created_by', teacherUserId)
      .in('id', requestedAssignmentIds)

    if (ownedAssignmentsError) {
      console.error('Error fetching teacher-owned assignments for analytics:', ownedAssignmentsError)
      return new Map()
    }

    allowedAssignmentIds = (ownedAssignments || [])
      .map(assignment => assignment.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    if (allowedAssignmentIds.length !== requestedAssignmentIds.length) {
      throw new Error(ANALYTICS_ACCESS_DENIED_ERROR)
    }

    const groupIds = Array.from(
      new Set(
        (ownedAssignments || [])
          .map(assignment => assignment.group_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    )
    const groupMemberCounts = new Map<string, number>()

    if (groupIds.length > 0) {
      const { data: groupMembers, error: groupMembersError } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds)

      if (groupMembersError) {
        console.error('Error fetching group member counts for analytics:', groupMembersError)
      } else {
        const membersByGroup = new Map<string, Set<string>>()

        ;(groupMembers || []).forEach(member => {
          if (!member.group_id || !member.user_id) return

          const existing = membersByGroup.get(member.group_id) || new Set<string>()
          existing.add(member.user_id)
          membersByGroup.set(member.group_id, existing)
        })

        membersByGroup.forEach((members, groupId) => {
          groupMemberCounts.set(groupId, members.size)
        })
      }
    }

    const assignedStudentsByAssignment = new Map<string, number>()
    ;(ownedAssignments || []).forEach(assignment => {
      assignedStudentsByAssignment.set(
        assignment.id,
        assignment.group_id ? groupMemberCounts.get(assignment.group_id) ?? 0 : 0
      )
    })

    const emptyAnalyticsMap = () =>
      new Map(
        allowedAssignmentIds.map(id => [
          id,
          createEmptyAnalytics(id, assignedStudentsByAssignment.get(id) ?? 0),
        ])
      )

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, assignment_id, user_id, attempt_number')
      .in('assignment_id', allowedAssignmentIds)

    if (sessionsError) {
      console.error('Error fetching sessions for analytics:', sessionsError)
      return emptyAnalyticsMap()
    }

    if (!sessions || sessions.length === 0) {
      return emptyAnalyticsMap()
    }

    const sessionIds = sessions.map(session => session.id)
    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('id, session_id, overall_score, pronunciation_score, grammar_score, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    if (resultsError) {
      console.error('Error fetching results for analytics:', resultsError)
      return emptyAnalyticsMap()
    }

    if (!results || results.length === 0) {
      return emptyAnalyticsMap()
    }

    const sessionMap = new Map<string, SessionRow>()
    sessions.forEach(session => {
      if (!session.id || !session.assignment_id || !session.user_id) return

      sessionMap.set(session.id, {
        id: session.id,
        assignment_id: session.assignment_id,
        user_id: session.user_id,
        attempt_number: session.attempt_number,
      })
    })

    const studentIds = Array.from(
      new Set(
        sessions
          .map(session => session.user_id)
          .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      )
    )
    const profilesMap = new Map<string, { full_name: string | null; email: string | null }>()

    if (studentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)

      if (profilesError) {
        console.error('Error fetching analytics profiles:', profilesError)
      } else {
        ;(profiles || []).forEach(profile => {
          profilesMap.set(profile.id, {
            full_name: profile.full_name,
            email: profile.email,
          })
        })
      }
    }

    const resultsWithStudents: ResultWithStudent[] = results
      .map(result => {
        if (!result.session_id) return null

        const session = sessionMap.get(result.session_id)
        if (!session?.assignment_id || !session.user_id) return null

        return {
          id: result.id,
          session_id: result.session_id,
          overall_score: result.overall_score,
          pronunciation_score: result.pronunciation_score,
          grammar_score: result.grammar_score,
          created_at: result.created_at,
          assignment_id: session.assignment_id,
          user_id: session.user_id,
          attempt_number: session.attempt_number,
        }
      })
      .filter((result): result is ResultWithStudent => result !== null)

    const analyticsMap = emptyAnalyticsMap()
    const resultsByAssignment = new Map<string, ResultWithStudent[]>()

    resultsWithStudents.forEach(result => {
      const existing = resultsByAssignment.get(result.assignment_id) || []
      existing.push(result)
      resultsByAssignment.set(result.assignment_id, existing)
    })

    resultsByAssignment.forEach((assignmentResults, assignmentId) => {
      const analytics = analyticsMap.get(assignmentId)
      if (!analytics) return

      analytics.completed_attempts = assignmentResults.length

      const uniqueStudentIds = new Set(
        assignmentResults
          .map(result => result.user_id)
          .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      )
      analytics.total_students = Math.max(analytics.total_students, uniqueStudentIds.size)

      const overallScores = getNumericScores(assignmentResults.map(result => result.overall_score))

      if (overallScores.length > 0) {
        analytics.average_score = calculateAverageScore(overallScores)
        analytics.min_score = Math.min(...overallScores)
        analytics.max_score = Math.max(...overallScores)
        analytics.distribution = calculateScoreDistribution(overallScores)
      }

      if (uniqueStudentIds.size > 0) {
        analytics.average_attempts = assignmentResults.length / uniqueStudentIds.size
      }

      const latestAttemptPerStudentPerDay = new Map<string, Map<string, ResultWithStudent>>()
      assignmentResults.forEach(result => {
        if (!result.created_at || typeof result.overall_score !== 'number') return

        const date = new Date(result.created_at).toISOString().split('T')[0]
        const dayMap = latestAttemptPerStudentPerDay.get(date) || new Map<string, ResultWithStudent>()
        const existing = dayMap.get(result.user_id)

        if (
          !existing ||
          new Date(result.created_at).getTime() > new Date(existing.created_at || 0).getTime()
        ) {
          dayMap.set(result.user_id, result)
          latestAttemptPerStudentPerDay.set(date, dayMap)
        }
      })

      analytics.trend_data = Array.from(latestAttemptPerStudentPerDay.entries())
        .map(([date, dayResults]) => {
          const dayScores = getNumericScores(
            Array.from(dayResults.values()).map(result => result.overall_score)
          )

          return {
            date,
            avgScore: calculateAverageScore(dayScores) ?? 0,
            attemptsCount: dayResults.size,
          }
        })
        .sort((a, b) => a.date.localeCompare(b.date))

      const sortedScoredAttempts = assignmentResults
        .filter(result => result.created_at && typeof result.overall_score === 'number')
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        })
        .map(result => result.overall_score)
        .filter((score): score is number => typeof score === 'number')

      if (sortedScoredAttempts.length >= 10) {
        const last5 = sortedScoredAttempts.slice(0, 5)
        const prev5 = sortedScoredAttempts.slice(5, 10)
        const last5Avg = calculateAverageScore(last5)
        const prev5Avg = calculateAverageScore(prev5)

        if (last5Avg !== null && prev5Avg !== null) {
          analytics.score_delta = last5Avg - prev5Avg
        }
      }

      const sortedAttempts = assignmentResults.slice().sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })

      analytics.last_activity = formatLastActivity(sortedAttempts[0]?.created_at ?? null)
      analytics.latest_attempts = sortedAttempts.slice(0, 5).map(result => {
        const profile = profilesMap.get(result.user_id)

        return {
          result_id: result.id,
          student_name: getDisplayName(profile?.full_name, profile?.email),
          overall_score: result.overall_score,
          pronunciation_score: result.pronunciation_score,
          grammar_score: result.grammar_score,
          created_at: result.created_at,
          attempt_number: result.attempt_number,
        }
      })
    })

    return analyticsMap
  } catch (error) {
    if (error instanceof Error && error.message === ANALYTICS_ACCESS_DENIED_ERROR) {
      throw error
    }

    console.error('Error calculating assignment analytics:', error)
    return new Map(allowedAssignmentIds.map(id => [id, createEmptyAnalytics(id)]))
  }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import type { AssignmentAnalytics } from '@/types/analytics'

/**
 * Server-side analytics query for assignments
 * 
 * Validates teacher role and aggregates data from sessions and results tables
 * Returns analytics only for assignments created by the authenticated teacher
 */
export async function getAssignmentAnalytics(
  assignmentIds: string[],
  teacherUserId: string
): Promise<Map<string, AssignmentAnalytics>> {
  const supabase = await createClient()

  // Verify teacher role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherUserId)
    .single()

  if (profile?.role !== 'teacher') {
    console.error('Analytics access denied: user is not a teacher')
    return new Map()
  }

  if (assignmentIds.length === 0) {
    return new Map()
  }

  try {
    // Fetch sessions for these assignments
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, assignment_id, user_id')
      .in('assignment_id', assignmentIds)

    if (sessionsError) {
      console.error('Error fetching sessions for analytics:', sessionsError)
      return new Map()
    }

    if (!sessions || sessions.length === 0) {
      // No sessions found - return empty analytics for all assignments
      return new Map(
        assignmentIds.map(id => [
          id,
          {
            assignment_id: id,
            total_students: 0,
            completed_attempts: 0,
            average_score: null,
            min_score: null,
            max_score: null,
            average_attempts: null,
            trend_data: [],
            score_delta: null,
            distribution: {
              '80-100': 0,
              '60-79': 0,
              '<60': 0,
            },
            last_activity: null,
          },
        ])
      )
    }

    // Fetch results for these sessions
    const sessionIds = sessions.map(s => s.id)
    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('id, session_id, overall_score, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    if (resultsError) {
      console.error('Error fetching results for analytics:', resultsError)
      return new Map()
    }

    if (!results || results.length === 0) {
      // No results found - return empty analytics for all assignments
      return new Map(
        assignmentIds.map(id => [
          id,
          {
            assignment_id: id,
            total_students: 0,
            completed_attempts: 0,
            average_score: null,
            min_score: null,
            max_score: null,
            average_attempts: null,
            trend_data: [],
            score_delta: null,
            distribution: {
              '80-100': 0,
              '60-79': 0,
              '<60': 0,
            },
            last_activity: null,
          },
        ])
      )
    }

    // Create session lookup map - ensure unique session IDs and valid user_ids
    const sessionMap = new Map<string, { assignment_id: string; user_id: string }>()
    sessions.forEach(session => {
      if (session.id && session.assignment_id && session.user_id && typeof session.user_id === 'string' && session.user_id.trim() !== '') {
        // Only set if not already present (defensive check against duplicates)
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, {
            assignment_id: session.assignment_id,
            user_id: session.user_id.trim(),
          })
        } else {
          // Log if we see duplicate session IDs (shouldn't happen)
          console.warn(`[Analytics] Duplicate session ID found: ${session.id}`)
        }
      }
    })

    // Join results with session data
    type ResultWithStudent = {
      id: string
      session_id: string
      overall_score: number
      created_at: string | null
      assignment_id: string
      user_id: string
    }

    const resultsWithStudents: ResultWithStudent[] = results
      .map(result => {
        if (!result.session_id) {
          return null
        }
        const session = sessionMap.get(result.session_id)
        if (!session || !session.user_id || result.overall_score === null || result.overall_score === undefined) {
          return null
        }
        return {
          id: result.id,
          session_id: result.session_id,
          overall_score: result.overall_score,
          created_at: result.created_at,
          assignment_id: session.assignment_id,
          user_id: session.user_id,
        }
      })
      .filter((r): r is ResultWithStudent => r !== null && r !== undefined && r.user_id !== null && r.user_id !== undefined)

    // Build analytics map
    const analyticsMap = new Map<string, AssignmentAnalytics>()

    // Initialize all assignments with default values
    assignmentIds.forEach(id => {
      analyticsMap.set(id, {
        assignment_id: id,
        total_students: 0,
        completed_attempts: 0,
        average_score: null,
        min_score: null,
        max_score: null,
        average_attempts: null,
        trend_data: [],
        score_delta: null,
        distribution: {
          '80-100': 0,
          '60-79': 0,
          '<60': 0,
        },
        last_activity: null,
      })
    })

    // Group results by assignment_id
    const resultsByAssignment = new Map<string, ResultWithStudent[]>()
    resultsWithStudents.forEach(result => {
      const existing = resultsByAssignment.get(result.assignment_id) || []
      existing.push(result)
      resultsByAssignment.set(result.assignment_id, existing)
    })

    // Calculate analytics for each assignment
    resultsByAssignment.forEach((assignmentResults, assignmentId) => {
      const analytics = analyticsMap.get(assignmentId)
      if (!analytics) return

      // Total attempts = count of all results
      analytics.completed_attempts = assignmentResults.length

      // Get distinct students - filter out any null/undefined/empty user_ids
      // CRITICAL: Use Set to ensure we count each student only once, regardless of attempts
      const studentIds = assignmentResults
        .map(r => r.user_id)
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      const uniqueStudentIds = new Set(studentIds)
      analytics.total_students = uniqueStudentIds.size
      

      if (uniqueStudentIds.size === 0) {
        return
      }

      // Find best attempt per student (MAX overall_score)
      // This ensures distribution and average/min/max are based on each student's best performance
      const bestAttemptPerStudent = new Map<string, ResultWithStudent>()
      assignmentResults.forEach(result => {
        const existing = bestAttemptPerStudent.get(result.user_id)
        if (!existing || result.overall_score > existing.overall_score) {
          bestAttemptPerStudent.set(result.user_id, result)
        }
      })

      const bestAttempts = Array.from(bestAttemptPerStudent.values())
      const bestScores = bestAttempts
        .map(r => r.overall_score)
        .filter((score): score is number => score !== null && score !== undefined)

      if (bestScores.length > 0) {
        const sum = bestScores.reduce((acc, score) => acc + score, 0)
        analytics.average_score = sum / bestScores.length
        analytics.min_score = Math.min(...bestScores)
        analytics.max_score = Math.max(...bestScores)
      }

      // Calculate average attempts per student
      const attemptsPerStudent = new Map<string, number>()
      assignmentResults.forEach(result => {
        const current = attemptsPerStudent.get(result.user_id) || 0
        attemptsPerStudent.set(result.user_id, current + 1)
      })

      if (attemptsPerStudent.size > 0) {
        const totalAttempts = Array.from(attemptsPerStudent.values()).reduce(
          (acc, count) => acc + count,
          0
        )
        analytics.average_attempts = totalAttempts / attemptsPerStudent.size
      }

      // Score distribution based on BEST attempt per student
      bestScores.forEach(score => {
        if (score >= 80) {
          analytics.distribution['80-100']++
        } else if (score >= 60) {
          analytics.distribution['60-79']++
        } else {
          analytics.distribution['<60']++
        }
      })

      // Trend data: Use LATEST attempt per student per day, then average those scores per day
      const latestAttemptPerStudentPerDay = new Map<string, Map<string, ResultWithStudent>>()
      assignmentResults.forEach(result => {
        if (!result.created_at) return
        const date = new Date(result.created_at).toISOString().split('T')[0]
        const dayMap = latestAttemptPerStudentPerDay.get(date) || new Map()
        const existing = dayMap.get(result.user_id)
        if (!existing || new Date(result.created_at).getTime() > new Date(existing.created_at || 0).getTime()) {
          dayMap.set(result.user_id, result)
          latestAttemptPerStudentPerDay.set(date, dayMap)
        }
      })

      analytics.trend_data = Array.from(latestAttemptPerStudentPerDay.entries())
        .map(([date, dayResults]) => {
          const dayScores = Array.from(dayResults.values())
            .map(r => r.overall_score)
            .filter((score): score is number => score !== null && score !== undefined)
          return {
            date,
            avgScore: dayScores.length > 0 
              ? dayScores.reduce((sum, s) => sum + s, 0) / dayScores.length 
              : 0,
            attemptsCount: dayResults.size,
          }
        })
        .sort((a, b) => a.date.localeCompare(b.date))

      // Score delta: Compare last 5 students' best attempts vs previous 5 students' best attempts
      // Sort by creation date of best attempt
      const sortedBestAttempts = bestAttempts
        .filter(r => r.created_at)
        .sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        .map(r => r.overall_score)
        .filter((s): s is number => s !== null && s !== undefined)

      if (sortedBestAttempts.length >= 10) {
        const last5 = sortedBestAttempts.slice(0, 5)
        const prev5 = sortedBestAttempts.slice(5, 10)
        const last5Avg = last5.reduce((sum, s) => sum + s, 0) / last5.length
        const prev5Avg = prev5.reduce((sum, s) => sum + s, 0) / prev5.length
        analytics.score_delta = last5Avg - prev5Avg
      }

      // Last activity: Most recent result
      const lastResult = assignmentResults
        .filter(r => r.created_at)
        .sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })[0]

      if (lastResult?.created_at) {
        const lastDate = new Date(lastResult.created_at)
        const now = new Date()
        const diffMs = now.getTime() - lastDate.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
          analytics.last_activity = 'Сегодня'
        } else if (diffDays === 1) {
          analytics.last_activity = 'Вчера'
        } else {
          analytics.last_activity = `${diffDays} дня назад`
        }
      }
    })

    return analyticsMap
  } catch (error) {
    console.error('Error calculating assignment analytics:', error)
    // Return empty analytics for all assignments on error
    return new Map(
      assignmentIds.map(id => [
        id,
          {
            assignment_id: id,
            total_students: 0,
            completed_attempts: 0,
            average_score: null,
            min_score: null,
            max_score: null,
            average_attempts: null,
            trend_data: [],
            score_delta: null,
            distribution: {
              '80-100': 0,
              '60-79': 0,
              '<60': 0,
            },
            last_activity: null,
          },
      ])
    )
  }
}

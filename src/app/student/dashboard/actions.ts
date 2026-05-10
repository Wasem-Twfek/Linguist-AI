'use server'

import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'

type AssignmentRow = Database['public']['Tables']['assignments']['Row']
type Result = Database['public']['Tables']['results']['Row']
type Session = Database['public']['Tables']['sessions']['Row']

export type AssignmentWithResult = AssignmentRow & {
  result?: Result | null
  session?: Session | null
}

export type StudentSubmissionHistoryItem = {
  result: Result
  session: Session
  assignment: AssignmentRow | null
}

export async function getStudentAssignments(): Promise<{ assignments: AssignmentWithResult[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { assignments: [], error: 'Необходима авторизация' }
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('Error fetching group memberships:', membershipError)
    return { assignments: [], error: 'Ошибка при загрузке групп' }
  }

  const allGroupIds = memberships?.map(m => m.group_id).filter(Boolean) || []

  if (allGroupIds.length === 0) {
    return { assignments: [] }
  }

  const validGroupIds = allGroupIds.filter((id): id is string => id !== null && id !== undefined)
  if (validGroupIds.length === 0) {
    return { assignments: [] }
  }

  const { data: activeGroups, error: activeGroupsError } = await supabase
    .from('study_groups')
    .select('id')
    .in('id', validGroupIds)
    .eq('is_active', true)

  if (activeGroupsError) {
    console.error('Error fetching active groups:', activeGroupsError)
    return { assignments: [], error: 'Ошибка при загрузке групп' }
  }

  const activeGroupIds = activeGroups?.map((g: { id: string }) => g.id).filter(Boolean) || []

  if (activeGroupIds.length === 0) {
    return { assignments: [] }
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select('*')
    .eq('is_active', true)
    .in('group_id', activeGroupIds)
    .order('created_at', { ascending: false })

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError)
    return { assignments: [], error: 'Ошибка при загрузке заданий' }
  }

  if (!assignments || assignments.length === 0) {
    return { assignments: [] }
  }

  const assignmentIds = assignments.map(a => a.id)
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .in('assignment_id', assignmentIds)
    .order('finished_at', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError)
  }

  const sessionIds = sessions?.map(s => s.id) || []
  let results: Result[] = []
  
  if (sessionIds.length > 0) {
    const { data: resultsData, error: resultsError } = await supabase
      .from('results')
      .select('*')
      .in('session_id', sessionIds)

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
    } else {
      results = resultsData || []
    }
  }

  const assignmentsWithResults: AssignmentWithResult[] = assignments.map(assignment => {
    const assignmentSessions = sessions?.filter(s => s.assignment_id === assignment.id) || []
    
    let assignmentSession: Session | undefined
    let assignmentResult: Result | undefined
    
    const sortedSessions = [...assignmentSessions].sort((a, b) => {
      const aTime = a.finished_at ? new Date(a.finished_at).getTime() : 0
      const bTime = b.finished_at ? new Date(b.finished_at).getTime() : 0
      return bTime - aTime
    })
    
    for (const session of sortedSessions) {
      const result = results.find(r => r.session_id === session.id)
      if (result) {
        assignmentSession = session
        assignmentResult = result
        break
      }
    }

    return {
      ...assignment,
      session: assignmentSession,
      result: assignmentResult,
    }
  })

  return { assignments: assignmentsWithResults }
}

export async function getStudentSubmissionHistory(): Promise<{ submissions: StudentSubmissionHistoryItem[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { submissions: [], error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') {
    return { submissions: [], error: 'У вас нет доступа к этой странице.' }
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('finished_at', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching submission sessions:', sessionsError)
    return { submissions: [], error: 'Ошибка при загрузке истории результатов' }
  }

  if (!sessions || sessions.length === 0) {
    return { submissions: [] }
  }

  const sessionIds = sessions.map((session) => session.id)
  const assignmentIds = Array.from(
    new Set(sessions.map((session) => session.assignment_id).filter((id): id is string => Boolean(id)))
  )

  const { data: resultsData, error: resultsError } = await supabase
    .from('results')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })

  if (resultsError) {
    console.error('Error fetching submission results:', resultsError)
    return { submissions: [], error: 'Ошибка при загрузке результатов' }
  }

  if (!resultsData || resultsData.length === 0) {
    return { submissions: [] }
  }

  let assignments: AssignmentRow[] = []
  if (assignmentIds.length > 0) {
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .in('id', assignmentIds)

    if (assignmentsError) {
      console.error('Error fetching submission assignments:', assignmentsError)
    } else {
      assignments = assignmentsData || []
    }
  }

  const resultBySessionId = new Map<string, Result>()
  resultsData.forEach((result) => {
    if (result.session_id && !resultBySessionId.has(result.session_id)) {
      resultBySessionId.set(result.session_id, result)
    }
  })

  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]))

  const submissions = sessions
    .map((session) => {
      const result = resultBySessionId.get(session.id)
      if (!result) return null

      return {
        result,
        session,
        assignment: session.assignment_id ? assignmentById.get(session.assignment_id) ?? null : null,
      }
    })
    .filter((submission): submission is StudentSubmissionHistoryItem => submission !== null)
    .sort((a, b) => {
      const aTime = new Date(a.result.created_at ?? a.session.finished_at ?? a.session.started_at ?? 0).getTime()
      const bTime = new Date(b.result.created_at ?? b.session.finished_at ?? b.session.started_at ?? 0).getTime()
      return bTime - aTime
    })

  return { submissions }
}


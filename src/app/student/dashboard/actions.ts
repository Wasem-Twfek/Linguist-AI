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

export async function getStudentAssignments(): Promise<{ assignments: AssignmentWithResult[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { assignments: [], error: 'Необходима авторизация' }
  }

  // CRITICAL: Get groups the student is a member of
  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('Error fetching group memberships:', membershipError)
    return { assignments: [], error: 'Ошибка при загрузке групп' }
  }

  // Extract group IDs the student belongs to
  const allGroupIds = memberships?.map(m => m.group_id).filter(Boolean) || []

  // If student is not in any groups, return empty (no assignments visible)
  if (allGroupIds.length === 0) {
    return { assignments: [] }
  }

  // CRITICAL: Filter to only active groups
  const validGroupIds = allGroupIds.filter((id): id is string => id !== null && id !== undefined)
  if (validGroupIds.length === 0) {
    return { assignments: [] }
  }

  const activeGroupsQuery = supabase
    .from('study_groups')
    .select('id')
    .in('id', validGroupIds)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeGroups, error: activeGroupsError } = await (activeGroupsQuery as any).eq('is_active', true)

  if (activeGroupsError) {
    console.error('Error fetching active groups:', activeGroupsError)
    return { assignments: [], error: 'Ошибка при загрузке групп' }
  }

  const activeGroupIds = activeGroups?.map((g: { id: string }) => g.id).filter(Boolean) || []

  // If student is not in any active groups, return empty
  if (activeGroupIds.length === 0) {
    return { assignments: [] }
  }

  // Fetch active assignments ONLY for active groups the student is a member of
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

  // Fetch user's sessions for these assignments
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

  // Fetch results for these sessions
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

  // Combine assignments with their results
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


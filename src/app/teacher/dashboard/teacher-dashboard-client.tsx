import type { AssignmentAnalytics } from '@/types/analytics'
import type { Database } from '@/types/supabase'
import {
  TeacherDashboardShell,
  type TeacherDashboardSummary,
  type TeacherRecentResult,
} from './teacher-dashboard-shell'

type Assignment = Database['public']['Tables']['assignments']['Row']

interface GroupWithCount {
  id: string
  name: string
  description: string | null
  created_at: string | null
  member_count: number
}

interface TeacherDashboardClientProps {
  initialAssignments: Assignment[]
  initialAnalytics: Map<string, AssignmentAnalytics>
  initialGroups: GroupWithCount[]
  initialSummary: TeacherDashboardSummary
  initialRecentResults: TeacherRecentResult[]
}

export type { TeacherDashboardSummary, TeacherRecentResult }

export function TeacherDashboardClient({
  initialAssignments,
  initialAnalytics,
  initialGroups,
  initialSummary,
  initialRecentResults,
}: TeacherDashboardClientProps) {
  return (
    <TeacherDashboardShell
      initialAssignments={initialAssignments}
      initialAnalytics={initialAnalytics}
      initialGroups={initialGroups}
      initialSummary={initialSummary}
      initialRecentResults={initialRecentResults}
    />
  )
}

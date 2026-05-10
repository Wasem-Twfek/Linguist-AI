import type { AssignmentWithResult, StudentSubmissionHistoryItem } from './data-actions'
import { StudentDashboardShell } from './student-dashboard-shell'

type StudentDashboardClientProps = {
  initialAssignments: AssignmentWithResult[]
  initialSubmissionHistory: StudentSubmissionHistoryItem[]
  studentName: string | null
  studentEmail: string | null
}

export function StudentDashboardClient({
  initialAssignments,
  initialSubmissionHistory,
  studentName,
  studentEmail,
}: StudentDashboardClientProps) {
  return (
    <StudentDashboardShell
      initialAssignments={initialAssignments}
      initialSubmissionHistory={initialSubmissionHistory}
      studentName={studentName}
      studentEmail={studentEmail}
    />
  )
}

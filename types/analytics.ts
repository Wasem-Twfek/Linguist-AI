export type ScoreDistribution = {
  '80-100': number
  '60-79': number
  '<60': number
}

export type TrendDataPoint = {
  date: string
  avgScore: number
  attemptsCount: number
}

export type AssignmentLatestAttempt = {
  result_id: string
  student_name: string
  overall_score: number | null
  pronunciation_score: number | null
  grammar_score: number | null
  created_at: string | null
  attempt_number: number | null
}

export type AssignmentAnalytics = {
  assignment_id: string
  total_students: number
  completed_attempts: number
  average_score: number | null
  min_score: number | null
  max_score: number | null
  average_attempts: number | null
  trend_data: TrendDataPoint[]
  score_delta: number | null
  distribution: ScoreDistribution
  last_activity: string | null
  latest_attempts: AssignmentLatestAttempt[]
}

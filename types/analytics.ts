/**
 * Assignment-level analytics for teachers
 * All analytics data must conform to this shape
 */
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
}

export type TrendDataPoint = {
  date: string
  avgScore: number
  attemptsCount: number
}

export type ScoreDistribution = {
  '80-100': number
  '60-79': number
  '<60': number
}

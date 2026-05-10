import type { ScoreDistribution } from '@/types/analytics'

export type ScoreRange = 'all' | '80-100' | '60-79' | '<60'

export type ScoreLevel = {
  label: string
  badgeClassName: string
  barClassName: string
}

export const EMPTY_SCORE_DISTRIBUTION: ScoreDistribution = {
  '80-100': 0,
  '60-79': 0,
  '<60': 0,
}

export function getNumericScores(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

export function calculateAverageScore(values: Array<number | null | undefined>) {
  const scores = getNumericScores(values)

  if (scores.length === 0) {
    return null
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

export function calculateScoreDistribution(values: Array<number | null | undefined>): ScoreDistribution {
  return values.reduce<ScoreDistribution>(
    (distribution, score) => {
      if (typeof score !== 'number' || !Number.isFinite(score)) {
        return distribution
      }

      if (score >= 80) {
        distribution['80-100'] += 1
      } else if (score >= 60) {
        distribution['60-79'] += 1
      } else {
        distribution['<60'] += 1
      }

      return distribution
    },
    { ...EMPTY_SCORE_DISTRIBUTION }
  )
}

export function calculateDistributionTotal(distribution: ScoreDistribution) {
  return distribution['80-100'] + distribution['60-79'] + distribution['<60']
}

export function calculatePercentage(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

export function formatScore(score: number | null | undefined) {
  return typeof score === 'number' && Number.isFinite(score) ? `${Math.round(score)}%` : '—'
}

export function formatCompactNumber(value: number | null | undefined, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'
}

export function getScoreLevel(score: number | null | undefined): ScoreLevel {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return {
      label: 'Нет данных',
      badgeClassName: 'border-slate-200 bg-slate-50 text-slate-600',
      barClassName: 'bg-slate-300',
    }
  }

  if (score >= 80) {
    return {
      label: 'Высокий',
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      barClassName: 'bg-emerald-500',
    }
  }

  if (score >= 60) {
    return {
      label: 'Средний',
      badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
      barClassName: 'bg-amber-500',
    }
  }

  return {
    label: 'Нужно улучшить',
    badgeClassName: 'border-red-200 bg-red-50 text-red-700',
    barClassName: 'bg-red-500',
  }
}

export function isInScoreRange(score: number | null | undefined, range: ScoreRange) {
  if (range === 'all') return true
  if (typeof score !== 'number' || !Number.isFinite(score)) return false

  if (range === '80-100') return score >= 80
  if (range === '60-79') return score >= 60 && score < 80

  return score < 60
}

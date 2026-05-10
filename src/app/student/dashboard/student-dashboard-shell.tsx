'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Award, BookOpen, CheckCircle2, Eye, FileText, Gauge, Loader2, Play, RefreshCw, RotateCcw } from 'lucide-react'

import { DashboardSection } from '@/components/dashboard/dashboard-section'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardTable } from '@/components/dashboard/dashboard-table'
import { MetricCard } from '@/components/dashboard/metric-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { useDashboardRefresh } from '@/components/dashboard/use-dashboard-refresh'
import { EmptyState, ErrorState } from '@/components/state-view'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getStudentAssignments,
  getStudentSubmissionHistory,
  type AssignmentWithResult,
  type StudentSubmissionHistoryItem,
} from './data-actions'

type StudentDashboardShellProps = {
  initialAssignments: AssignmentWithResult[]
  initialSubmissionHistory: StudentSubmissionHistoryItem[]
  studentName: string | null
  studentEmail: string | null
}

function formatScore(score: number | null | undefined) {
  return typeof score === 'number' ? `${Math.round(score)}%` : '—'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getAverage(scores: Array<number | null | undefined>) {
  const values = scores.filter((score): score is number => typeof score === 'number')
  if (!values.length) return null
  return values.reduce((sum, score) => sum + score, 0) / values.length
}

function getNextAssignment(assignments: AssignmentWithResult[]) {
  return assignments.find(item => !item.result) ?? assignments[0] ?? null
}

export function StudentDashboardShell({
  initialAssignments,
  initialSubmissionHistory,
  studentName,
  studentEmail,
}: StudentDashboardShellProps) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [submissionHistory, setSubmissionHistory] = useState(initialSubmissionHistory)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [refreshFlash, setRefreshFlash] = useState<string | null>(null)
  const refreshFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (refreshFlashTimerRef.current) clearTimeout(refreshFlashTimerRef.current)
    }
  }, [])

  const refreshData = useCallback(async () => {
    setRefreshError(null)
    const [assignmentsResult, historyResult] = await Promise.all([
      getStudentAssignments(),
      getStudentSubmissionHistory(),
    ])

    const failed = Boolean(assignmentsResult.error || historyResult.error)
    if (failed) {
      setRefreshError('Не удалось загрузить данные. Попробуйте обновить страницу.')
    }
    if (!assignmentsResult.error) setAssignments(assignmentsResult.assignments)
    if (!historyResult.error) setSubmissionHistory(historyResult.submissions)
    return !failed
  }, [])

  useDashboardRefresh({
    intervalMs: 30000,
    storageKeys: ['student-dashboard-updated', 'student-assignments-updated'],
    onRefresh: refreshData,
    silent: true,
  })

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshing) return
    setManualRefreshing(true)
    setRefreshFlash(null)
    if (refreshFlashTimerRef.current) {
      clearTimeout(refreshFlashTimerRef.current)
      refreshFlashTimerRef.current = null
    }
    try {
      const ok = await refreshData()
      if (ok) {
        setRefreshFlash('Данные обновлены')
        refreshFlashTimerRef.current = setTimeout(() => {
          setRefreshFlash(null)
          refreshFlashTimerRef.current = null
        }, 2500)
      }
    } finally {
      setManualRefreshing(false)
    }
  }, [manualRefreshing, refreshData])

  const nextAssignment = getNextAssignment(assignments)
  const latestSubmission = submissionHistory[0] ?? null
  const completedAssignments = assignments.filter(item => item.result).length
  const averageScore = getAverage(submissionHistory.map(item => item.result.overall_score))
  const welcomeName = studentName?.trim() || studentEmail || 'учащийся'

  return (
    <DashboardShell
      badge={`Добро пожаловать, ${welcomeName}`}
      title="Мои задания"
      description="Выполняйте задания, записывайте речь и отслеживайте прогресс."
      rightSlot={
        <div className="flex w-full min-h-[4.5rem] flex-col items-stretch justify-end gap-1 sm:w-auto sm:items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleManualRefresh()}
            disabled={manualRefreshing}
            className="h-10 gap-2 rounded-full"
          >
            {manualRefreshing ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            )}
            Обновить данные
          </Button>
          <p
            className="min-h-[1.125rem] text-right text-xs leading-tight text-muted-foreground"
            aria-live="polite"
          >
            {refreshFlash ?? '\u00a0'}
          </p>
        </div>
      }
    >
      {refreshError ? <ErrorState title="Не удалось загрузить данные." description={refreshError} className="py-0" /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Доступные задания" value={assignments.length} helper="Задания, доступные для выполнения" icon={BookOpen} accentClassName="bg-blue-100" />
        <MetricCard title="Выполнено" value={completedAssignments} helper="Завершенные задания" icon={CheckCircle2} accentClassName="bg-emerald-100" />
        <MetricCard title="Средний балл" value={formatScore(averageScore)} helper="Средний результат по выполненным заданиям" icon={Gauge} accentClassName="bg-slate-100" />
        <MetricCard title="Последний результат" value={formatScore(latestSubmission?.result.overall_score)} helper="Последняя отправленная попытка" icon={Award} accentClassName="bg-indigo-100" />
      </div>

      <DashboardSection title="Следующее задание" description="Выполните задание и получите AI-отчет по произношению.">
        {!nextAssignment ? (
          <EmptyState title="Пока нет доступных заданий" description="Когда преподаватель назначит задания, они появятся здесь." />
        ) : (
          <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/70">
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Следующий шаг
                </p>
                <p className="text-lg font-semibold text-foreground">{nextAssignment.title || 'Без названия'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextAssignment.result
                    ? 'Вы уже получили отчет. Можно открыть результат или пройти задание еще раз.'
                    : 'Выполните задание и получите AI-отчет по произношению.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild className="rounded-full">
                  <Link href={`/student/assignments/${nextAssignment.id}`}>
                    {nextAssignment.result ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {nextAssignment.result ? 'Повторить' : 'Начать'}
                  </Link>
                </Button>
                {nextAssignment.result ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href={`/student/results/${nextAssignment.result.id}`}>
                      <Eye className="h-4 w-4" />
                      Отчет
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}
      </DashboardSection>

      <DashboardSection title="Доступные задания" description="Откройте задание, запишите речь и получите AI-отчет.">
        {assignments.length === 0 ? (
          <EmptyState title="Заданий пока нет" description="Когда преподаватель назначит задание, оно появится здесь." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="transition-colors hover:border-blue-200 hover:bg-blue-50/30">
                <CardContent className="space-y-4 py-5">
                  <p className="text-lg font-semibold text-foreground">{assignment.title || 'Без названия'}</p>
                  <StatusBadge status={assignment.result ? 'success' : 'neutral'}>
                    {assignment.result ? 'Есть отчет' : 'Не выполнено'}
                  </StatusBadge>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1 rounded-full">
                      <Link href={`/student/assignments/${assignment.id}`}>{assignment.result ? 'Повторить' : 'Начать'}</Link>
                    </Button>
                    {assignment.result ? (
                      <Button asChild variant="outline" size="sm" className="flex-1 rounded-full">
                        <Link href={`/student/results/${assignment.result.id}`}>Отчет</Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DashboardSection>

      <DashboardSection title="Мои результаты" description="История выполненных заданий и полученных AI-отчетов.">
        {submissionHistory.length === 0 ? (
          <EmptyState title="Результатов пока нет" description="После выполнения задания здесь появится история попыток и ссылки на AI-отчеты." />
        ) : (
          <DashboardTable>
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Задание</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Балл</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Действие</th>
              </tr>
            </thead>
            <tbody>
              {submissionHistory.map(item => (
                <tr key={item.result.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">
                  <td className="px-4 py-4 font-medium text-foreground">{item.assignment?.title || 'Без названия'}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {formatDate(item.result.created_at ?? item.session.finished_at)}
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">{formatScore(item.result.overall_score)}</td>
                  <td className="px-4 py-4 text-right">
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link href={`/student/results/${item.result.id}`}>
                        <Eye className="h-4 w-4" />
                        Открыть отчет
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DashboardTable>
        )}
      </DashboardSection>

      {latestSubmission ? (
        <div className="flex justify-end">
          <Button asChild className="rounded-full">
            <Link href={`/student/results/${latestSubmission.result.id}`}>
              <FileText className="h-4 w-4" />
              Открыть последний отчет
            </Link>
          </Button>
        </div>
      ) : null}
    </DashboardShell>
  )
}

'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BookOpen, CheckCircle2, Eye, Gauge, Layers3, Mic2, RefreshCw, SpellCheck2, UsersRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { DashboardSection } from '@/components/dashboard/dashboard-section'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardTable } from '@/components/dashboard/dashboard-table'
import { MetricCard } from '@/components/dashboard/metric-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { useDashboardRefresh } from '@/components/dashboard/use-dashboard-refresh'
import { EmptyState } from '@/components/state-view'
import { Button } from '@/components/ui/button'
import {
  formatScore,
  isInScoreRange,
  type ScoreRange,
} from '@/lib/analytics/analytics'
import type { AssignmentAnalytics } from '@/types/analytics'
import type { Database } from '@/types/supabase'
import { AssignmentsTable } from './assignments-table'
import { CreateManualAssignmentForm } from './create-manual-assignment-form'
import { GenerateAssignmentForm } from './generate-assignment-form'
import { GroupsPanel } from './groups-panel'
import { refreshAssignmentAnalytics } from './analytics-actions'

type Assignment = Database['public']['Tables']['assignments']['Row']

type GroupWithCount = {
  id: string
  name: string
  description: string | null
  created_at: string | null
  member_count: number
}

export type TeacherDashboardSummary = {
  totalAssignments: number
  totalGroups: number
  totalStudents: number
  completedSubmissions: number
  averageScore: number | null
  averagePronunciationScore: number | null
  averageGrammarScore: number | null
}

export type TeacherRecentResult = {
  resultId: string
  studentId: string | null
  studentName: string
  studentEmail: string | null
  assignmentId: string
  assignmentTitle: string
  groupId: string | null
  groupName: string | null
  score: number | null
  pronunciationScore: number | null
  grammarScore: number | null
  submittedAt: string | null
}

type TeacherDashboardShellProps = {
  initialAssignments: Assignment[]
  initialAnalytics: Map<string, AssignmentAnalytics>
  initialGroups: GroupWithCount[]
  initialSummary: TeacherDashboardSummary
  initialRecentResults: TeacherRecentResult[]
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function hasWeakScore(result: TeacherRecentResult) {
  return (
    (typeof result.score === 'number' && result.score < 60) ||
    (typeof result.pronunciationScore === 'number' && result.pronunciationScore < 60) ||
    (typeof result.grammarScore === 'number' && result.grammarScore < 60)
  )
}

function getWeakReason(result: TeacherRecentResult) {
  const reasons: string[] = []

  if (typeof result.score === 'number' && result.score < 60) {
    reasons.push('общий балл ниже 60%')
  }
  if (typeof result.pronunciationScore === 'number' && result.pronunciationScore < 60) {
    reasons.push('произношение ниже 60%')
  }
  if (typeof result.grammarScore === 'number' && result.grammarScore < 60) {
    reasons.push('грамматика ниже 60%')
  }

  return reasons.length ? reasons.join(', ') : 'требуется проверка результата'
}

export function TeacherDashboardShell({
  initialAssignments,
  initialAnalytics,
  initialGroups,
  initialSummary,
  initialRecentResults,
}: TeacherDashboardShellProps) {
  const router = useRouter()
  const [assignments, setAssignments] = useState(initialAssignments)
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [groups, setGroups] = useState(initialGroups)
  const [groupFilter, setGroupFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [scoreRangeFilter, setScoreRangeFilter] = useState<ScoreRange>('all')
  const [manualRefreshing, setManualRefreshing] = useState(false)

  const refreshData = useCallback(async () => {
    const ids = assignments.map(item => item.id)
    if (!ids.length) return
    const result = await refreshAssignmentAnalytics(ids)
    if (result.success && result.analytics) {
      setAnalytics(result.analytics)
    }
  }, [assignments])

  useDashboardRefresh({
    intervalMs: 30000,
    onRefresh: refreshData,
    silent: true,
  })

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshing) return

    setManualRefreshing(true)
    try {
      await refreshData()
      router.refresh()
    } finally {
      setManualRefreshing(false)
    }
  }, [manualRefreshing, refreshData, router])

  const filteredResults = useMemo(
    () =>
      initialRecentResults.filter(result => {
        const matchesGroup = groupFilter === 'all' || result.groupId === groupFilter
        const matchesAssignment = assignmentFilter === 'all' || result.assignmentId === assignmentFilter
        const matchesScoreRange = isInScoreRange(result.score, scoreRangeFilter)
        return matchesGroup && matchesAssignment && matchesScoreRange
      }),
    [assignmentFilter, groupFilter, initialRecentResults, scoreRangeFilter]
  )

  const weakResults = useMemo(
    () => initialRecentResults.filter(hasWeakScore).slice(0, 8),
    [initialRecentResults]
  )

  const liveSummary = {
    ...initialSummary,
    totalAssignments: assignments.length,
    totalGroups: groups.length,
  }

  return (
    <DashboardShell
      badge="Аналитика преподавателя"
      title="Прогресс, попытки и зоны внимания"
      description="Управляйте заданиями и группами, отслеживайте результаты и помогайте учащимся быстрее улучшать навыки."
      rightSlot={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleManualRefresh()}
          disabled={manualRefreshing}
          className="h-10 gap-2 rounded-full"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 text-accent ${manualRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          Обновить аналитику
        </Button>
      }
    >
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Следующий шаг
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Создайте задание, добавьте учащихся в группу или проверьте последние результаты.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Начните с одного действия: подготовьте урок, настройте группу или откройте свежие отчеты по попыткам учащихся.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[34rem]">
            <Button asChild className="rounded-full">
              <Link href="#teacher-create">Создать задание</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-full">
              <Link href="#teacher-groups">Управлять группами</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-full">
              <Link href="#teacher-results">Посмотреть результаты</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <MetricCard title="Всего заданий" value={liveSummary.totalAssignments} helper="Активные задания преподавателя" icon={BookOpen} accentClassName="bg-blue-100" />
        <MetricCard title="Всего групп" value={liveSummary.totalGroups} helper="Группы преподавателя" icon={Layers3} accentClassName="bg-indigo-100" />
        <MetricCard title="Учащихся" value={liveSummary.totalStudents} helper="Участники активных групп" icon={UsersRound} accentClassName="bg-cyan-100" />
        <MetricCard title="Выполненных попыток" value={liveSummary.completedSubmissions} helper="Завершенные попытки" icon={CheckCircle2} accentClassName="bg-emerald-100" />
        <MetricCard title="Средний балл" value={formatScore(liveSummary.averageScore)} helper="Общий средний результат" icon={Gauge} accentClassName="bg-slate-100" />
        {liveSummary.averagePronunciationScore !== null ? (
          <MetricCard title="Произношение" value={formatScore(liveSummary.averagePronunciationScore)} helper="Средний балл за произношение" icon={Mic2} accentClassName="bg-sky-100" />
        ) : null}
        {liveSummary.averageGrammarScore !== null ? (
          <MetricCard title="Грамматика" value={formatScore(liveSummary.averageGrammarScore)} helper="Средний балл за грамматику" icon={SpellCheck2} accentClassName="bg-violet-100" />
        ) : null}
      </div>

      <div id="teacher-results" className="scroll-mt-24">
        <DashboardSection title="Результаты учащихся" description="Фильтруйте последние результаты по группе, заданию и диапазону баллов.">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="rounded-xl border border-border bg-card px-3 py-2 text-sm" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
            <option value="all">Все группы</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <select className="rounded-xl border border-border bg-card px-3 py-2 text-sm" value={assignmentFilter} onChange={e => setAssignmentFilter(e.target.value)}>
            <option value="all">Все задания</option>
            {assignments.map(assignment => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title || 'Без названия'}
              </option>
            ))}
          </select>
          <select className="rounded-xl border border-border bg-card px-3 py-2 text-sm" value={scoreRangeFilter} onChange={e => setScoreRangeFilter(e.target.value as ScoreRange)}>
            <option value="all">Все результаты</option>
            <option value="80-100">80-100</option>
            <option value="60-79">60-79</option>
            <option value="<60">&lt;60</option>
          </select>
        </div>

        {filteredResults.length === 0 ? (
          <EmptyState title="Пока нет результатов" description="Результаты появятся после выполнения заданий учащимися." />
        ) : (
          <DashboardTable minWidthClassName="min-w-[980px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Учащийся</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Задание</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Балл</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Дата</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.slice(0, 10).map(result => {
                const status =
                  typeof result.score !== 'number' ? 'neutral' : result.score >= 80 ? 'success' : result.score >= 60 ? 'warning' : 'danger'
                return (
                  <tr key={result.resultId} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{result.studentName}</p>
                      <p className="text-xs text-muted-foreground">{result.studentEmail || '—'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">{result.assignmentTitle}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{formatScore(result.score)}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={status}>{status === 'success' ? 'Высокий' : status === 'warning' ? 'Средний' : status === 'danger' ? 'Нужна помощь' : 'Нет данных'}</StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(result.submittedAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <Button asChild variant="outline" size="sm" className="rounded-full">
                        <Link href={`/teacher/results/${result.resultId}`}>
                          <Eye className="h-4 w-4" />
                          Отчет
                        </Link>
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DashboardTable>
        )}
        </DashboardSection>
      </div>

      <DashboardSection
        title="Учащиеся, которым стоит уделить внимание"
        description="Здесь показаны только попытки с общим баллом, произношением или грамматикой ниже 60%."
      >
        {weakResults.length === 0 ? (
          <EmptyState
            title="Критичных результатов пока нет"
            description="Сейчас нет учащихся с баллами ниже 60%. Продолжайте отслеживать новые попытки после выполнения заданий."
          />
        ) : (
          <DashboardTable minWidthClassName="min-w-[920px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Учащийся</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Задание</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Балл</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Причина</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Действие</th>
              </tr>
            </thead>
            <tbody>
              {weakResults.map(result => (
                <tr key={result.resultId} className="border-b border-slate-100 last:border-0 hover:bg-red-50/30">
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{result.studentName}</p>
                    <p className="text-xs text-muted-foreground">{result.studentEmail || '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">{result.assignmentTitle}</td>
                  <td className="px-4 py-4 text-sm text-foreground">{formatScore(result.score)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2 text-sm text-red-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{getWeakReason(result)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button asChild variant="outline" size="sm" className="rounded-full border-red-100 text-red-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                      <Link href={`/teacher/results/${result.resultId}`}>
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

      <DashboardSection title="Создание и управление" description="Создавайте задания, управляйте группами и отслеживайте аналитику по заданиям.">
        <div className="grid gap-8 lg:grid-cols-[400px,1fr]">
          <div id="teacher-create" className="scroll-mt-24 space-y-6">
            <GenerateAssignmentForm groups={groups} onAssignmentCreated={assignment => setAssignments(prev => [assignment, ...prev])} />
            <CreateManualAssignmentForm groups={groups} onAssignmentCreated={assignment => setAssignments(prev => [assignment, ...prev])} />
            <div id="teacher-groups" className="scroll-mt-24">
              <GroupsPanel
                groups={groups}
                onGroupCreated={group => {
                  setGroups(prev => [group, ...prev])
                  router.refresh()
                }}
                onGroupDeleted={groupId => {
                  setGroups(prev => prev.filter(group => group.id !== groupId))
                  router.refresh()
                }}
                onMemberCountUpdated={(groupId, newCount) => {
                  setGroups(prev => prev.map(group => (group.id === groupId ? { ...group, member_count: newCount } : group)))
                  router.refresh()
                }}
              />
            </div>
          </div>
          <AssignmentsTable
            assignments={assignments}
            analytics={analytics}
            groups={groups}
            onAssignmentCreated={assignment => setAssignments(prev => [assignment, ...prev])}
            onAssignmentDeleted={assignmentId => {
              setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId))
              setAnalytics(prev => {
                const next = new Map(prev)
                next.delete(assignmentId)
                return next
              })
            }}
            onAnalyticsUpdated={(assignmentId, updatedAnalytics) => {
              setAnalytics(prev => {
                const next = new Map(prev)
                next.set(assignmentId, updatedAnalytics)
                return next
              })
            }}
          />
        </div>
      </DashboardSection>
    </DashboardShell>
  )
}

'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Gauge,
  Loader2,
  Trash2,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import {
  calculateDistributionTotal,
  calculatePercentage,
  formatCompactNumber,
  formatScore,
  getScoreLevel,
} from '@/lib/analytics/analytics'
import type { AssignmentAnalytics } from '@/types/analytics'
import type { Database } from '@/types/supabase'
import { deleteAssignment, duplicateAssignmentToGroup } from './assignment-actions'

type Assignment = Database['public']['Tables']['assignments']['Row']

interface Group {
  id: string
  name: string
  member_count: number
}

interface AssignmentsTableProps {
  assignments: Assignment[]
  analytics: Map<string, AssignmentAnalytics>
  groups: Group[]
  onAssignmentCreated?: (assignment: Assignment) => void
  onAssignmentDeleted?: (assignmentId: string) => void
  onAnalyticsUpdated?: (assignmentId: string, analytics: AssignmentAnalytics) => void
}

const levelLabels: Record<string, string> = {
  Beginner: 'Начальный',
  Intermediate: 'Средний',
  Advanced: 'Продвинутый',
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AnalyticsCell({ analytics }: { analytics: AssignmentAnalytics | undefined }) {
  if (!analytics) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
      </div>
    )
  }

  const avgScore = analytics.average_score !== null ? Math.round(analytics.average_score) : null

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2">
        {avgScore !== null ? (
          <Badge variant="outline" className={getScoreLevel(avgScore).badgeClassName}>
            {avgScore}%
          </Badge>
        ) : (
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
            Нет оценок
          </Badge>
        )}
        {analytics.score_delta !== null && analytics.score_delta !== 0 && (
          <Tooltip
            content={
              analytics.score_delta > 0
                ? `Улучшение на ${analytics.score_delta.toFixed(1)}%`
                : `Снижение на ${Math.abs(analytics.score_delta).toFixed(1)}%`
            }
          >
            {analytics.score_delta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            )}
          </Tooltip>
        )}
      </div>
      <span className="text-slate-500">{analytics.completed_attempts} попыток</span>
      {analytics.last_activity && (
        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{analytics.last_activity}</span>
        </div>
      )}
    </div>
  )
}

function ExpandedMetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function ExpandedAnalyticsPanel({ analytics }: { analytics: AssignmentAnalytics }) {
  const distributionTotal = calculateDistributionTotal(analytics.distribution)
  const distributionRows = [
    {
      label: '80–100',
      title: 'Высокие результаты',
      count: analytics.distribution['80-100'],
      className: 'bg-emerald-500',
    },
    {
      label: '60–79',
      title: 'Средний уровень',
      count: analytics.distribution['60-79'],
      className: 'bg-amber-500',
    },
    {
      label: '<60',
      title: 'Нужно улучшить',
      count: analytics.distribution['<60'],
      className: 'bg-red-500',
    },
  ]

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <div>
          <p className="font-semibold text-slate-950">Детальная аналитика задания</p>
          <p className="text-sm text-slate-500">Попытки, баллы и последние AI-отчеты</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <ExpandedMetricCard label="Общее количество учащихся" value={analytics.total_students} icon={UsersRound} />
        <ExpandedMetricCard label="Завершенные попытки" value={analytics.completed_attempts} icon={CheckCircle2} />
        <ExpandedMetricCard label="Средний балл" value={formatScore(analytics.average_score)} icon={Gauge} />
        <ExpandedMetricCard label="Минимальный балл" value={formatScore(analytics.min_score)} icon={TrendingDown} />
        <ExpandedMetricCard label="Максимальный балл" value={formatScore(analytics.max_score)} icon={TrendingUp} />
        <ExpandedMetricCard
          label="Попыток на учащегося"
          value={formatCompactNumber(analytics.average_attempts)}
          icon={Clock}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),minmax(320px,420px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-950">Распределение баллов</p>
          {distributionTotal === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
              Распределение появится после выполнения заданий.
            </div>
          ) : (
            <div className="space-y-4">
              {distributionRows.map(row => {
                const percentage = calculatePercentage(row.count, distributionTotal)

                return (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{row.title}</p>
                        <p className="text-xs text-slate-500">{row.label}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {row.count} попыток, {percentage}%
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${row.className}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-950">Динамика среднего балла</p>
          {analytics.trend_data.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={analytics.trend_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={value => {
                    const date = new Date(value)
                    return `${date.getDate()}.${date.getMonth() + 1}`
                  }}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  formatter={value => [`${Number(value).toFixed(1)}%`, 'Средний балл']}
                  labelFormatter={label => new Date(label).toLocaleDateString('ru-RU')}
                />
                <Line type="monotone" dataKey="avgScore" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
              Динамика появится после нескольких попыток.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-slate-950">Последние попытки по заданию</p>
        {analytics.latest_attempts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
            Пока нет выполненных попыток.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">Учащийся</th>
                  <th className="px-3 py-2 text-left font-semibold">Общий балл</th>
                  <th className="px-3 py-2 text-left font-semibold">Произношение</th>
                  <th className="px-3 py-2 text-left font-semibold">Грамматика</th>
                  <th className="px-3 py-2 text-left font-semibold">Дата</th>
                  <th className="px-3 py-2 text-right font-semibold">Действие</th>
                </tr>
              </thead>
              <tbody>
                {analytics.latest_attempts.map(attempt => (
                  <tr key={attempt.result_id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">
                    <td className="px-3 py-3 font-medium text-slate-950">{attempt.student_name}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{formatScore(attempt.overall_score)}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{formatScore(attempt.pronunciation_score)}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{formatScore(attempt.grammar_score)}</td>
                    <td className="px-3 py-3 text-sm text-slate-500">{formatDate(attempt.created_at)}</td>
                    <td className="px-3 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/teacher/results/${attempt.result_id}`}>
                          <Eye className="h-4 w-4" />
                          Отчет
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function AssignmentsTable({
  assignments: initialAssignments,
  analytics: initialAnalytics,
  groups,
  onAssignmentCreated,
  onAssignmentDeleted,
}: AssignmentsTableProps) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [analytics, setAnalytics] = useState<Map<string, AssignmentAnalytics>>(initialAnalytics)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<{ id: string; title: string | null } | null>(null)
  const [expandedAnalytics, setExpandedAnalytics] = useState<Set<string>>(new Set())
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [assignmentToDuplicate, setAssignmentToDuplicate] = useState<Assignment | null>(null)
  const [duplicateGroupId, setDuplicateGroupId] = useState('')
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [duplicateTopic, setDuplicateTopic] = useState('')
  const [duplicateLevel, setDuplicateLevel] = useState('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  useEffect(() => {
    setAssignments(initialAssignments)
    setAnalytics(initialAnalytics)
  }, [initialAssignments, initialAnalytics])

  function openDeleteDialog(id: string, title: string | null) {
    setAssignmentToDelete({ id, title })
    setDeleteDialogOpen(true)
  }

  function closeDeleteDialog() {
    handleDeleteDialogOpenChange(false)
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (open) {
      setDeleteDialogOpen(true)
      return
    }

    if (deletingId) return
    setDeleteDialogOpen(false)
  }

  function openDuplicateDialog(assignment: Assignment) {
    setAssignmentToDuplicate(assignment)
    setDuplicateTitle(assignment.title || '')
    setDuplicateTopic(assignment.topic || '')
    setDuplicateLevel(assignment.difficulty_level || 'Intermediate')
    setDuplicateGroupId(groups[0]?.id || '')
    setDuplicateDialogOpen(true)
  }

  function closeDuplicateDialog() {
    handleDuplicateDialogOpenChange(false)
  }

  function handleDuplicateDialogOpenChange(open: boolean) {
    if (open) {
      setDuplicateDialogOpen(true)
      return
    }

    if (isDuplicating) return
    setDuplicateDialogOpen(false)
  }

  async function handleDuplicate() {
    if (!assignmentToDuplicate || !duplicateGroupId) {
      toast.error('Выберите группу')
      return
    }

    setIsDuplicating(true)

    try {
      const result = await duplicateAssignmentToGroup({
        sourceAssignmentId: assignmentToDuplicate.id,
        targetGroupId: duplicateGroupId,
        title: duplicateTitle.trim() || undefined,
        topic: duplicateTopic.trim() || undefined,
        level: duplicateLevel || undefined,
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.success && result.assignment) {
        toast.success('Урок успешно назначен в группу')
        setAssignments(prev => [result.assignment!, ...prev])
        onAssignmentCreated?.(result.assignment)
        router.refresh()

        if (typeof window !== 'undefined') {
          const timestamp = Date.now().toString()
          localStorage.setItem('student-dashboard-updated', timestamp)
          window.dispatchEvent(new StorageEvent('storage', { key: 'student-dashboard-updated', newValue: timestamp }))
        }

        setDuplicateDialogOpen(false)
      }
    } catch (error) {
      console.error('Error duplicating assignment:', error)
      toast.error('Ошибка при копировании урока')
    } finally {
      setIsDuplicating(false)
    }
  }

  async function handleDelete() {
    if (!assignmentToDelete) return

    setDeletingId(assignmentToDelete.id)

    try {
      const result = await deleteAssignment(assignmentToDelete.id)

      if (result.error) {
        toast.error(result.error)
        setDeletingId(null)
        return
      }

      if (result.success && result.deletedAssignmentId) {
        toast.success('Урок успешно удален')
        setAssignments(prev => prev.filter(assignment => assignment.id !== result.deletedAssignmentId))
        setAnalytics(prev => {
          const newMap = new Map(prev)
          newMap.delete(result.deletedAssignmentId!)
          return newMap
        })
        setDeleteDialogOpen(false)
        onAssignmentDeleted?.(result.deletedAssignmentId)
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Ошибка при удалении урока')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-950">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Существующие уроки
        </CardTitle>
        <CardDescription>Все созданные вами задания для чтения</CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-slate-500">
            <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="font-medium">У вас пока нет созданных уроков</p>
            <p className="text-sm">Используйте форму слева для генерации</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Название</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Тема</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Уровень</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Аналитика</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(assignment => {
                  const assignmentAnalytics = analytics.get(assignment.id)
                  const isExpanded = expandedAnalytics.has(assignment.id)

                  return (
                    <Fragment key={assignment.id}>
                      <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/40">
                        <td className="px-4 py-4">
                          <span className="font-medium text-slate-950">{assignment.title || 'Без названия'}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">{assignment.topic || '—'}</td>
                        <td className="px-4 py-4">
                          {assignment.difficulty_level ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {levelLabels[assignment.difficulty_level] || assignment.difficulty_level}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">{formatDate(assignment.created_at)}</td>
                        <td className="px-4 py-4">
                          <AnalyticsCell analytics={assignmentAnalytics} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {assignmentAnalytics && assignmentAnalytics.completed_attempts > 0 && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  const nextExpanded = new Set(expandedAnalytics)
                                  if (isExpanded) {
                                    nextExpanded.delete(assignment.id)
                                  } else {
                                    nextExpanded.add(assignment.id)
                                  }
                                  setExpandedAnalytics(nextExpanded)
                                }}
                                className="text-slate-500"
                                aria-label={isExpanded ? 'Скрыть аналитику' : 'Показать аналитику'}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDuplicateDialog(assignment)}
                              disabled={isDuplicating || duplicateDialogOpen || groups.length === 0}
                              className="text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                              title="Назначить в группу"
                              aria-label="Назначить урок в группу"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteDialog(assignment.id, assignment.title)}
                              disabled={deletingId === assignment.id || deleteDialogOpen}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Удалить урок"
                            >
                              {deletingId === assignment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && assignmentAnalytics && (
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td colSpan={6} className="px-4 py-5">
                            <ExpandedAnalyticsPanel analytics={assignmentAnalytics} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
              Удаление урока
            </DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить урок{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{assignmentToDelete?.title || 'Без названия'}&rdquo;
              </span>
              ? Урок будет скрыт от студентов, но их результаты сохранятся.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:gap-3">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={!!deletingId}
              className="h-11 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!deletingId}
              className="h-11 rounded-xl font-semibold shadow-soft"
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onOpenChange={handleDuplicateDialogOpenChange}>
        <DialogContent className="max-h-[min(90dvh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="space-y-2 border-b border-blue-100 bg-blue-50/70 px-6 py-5 pr-14 text-left sm:px-8">
            <DialogTitle className="flex items-center gap-3 text-left text-[1.35rem] text-slate-950">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Copy className="h-5 w-5" aria-hidden />
              </span>
              Назначить урок в группу
            </DialogTitle>
            <DialogDescription>Создайте копию урока для другой группы</DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="space-y-2">
              <Label htmlFor="duplicate-group" className="text-sm font-semibold text-slate-900">
                Группа *
              </Label>
              <Select
                value={duplicateGroupId}
                onValueChange={setDuplicateGroupId}
                disabled={isDuplicating || groups.length === 0}
              >
                <SelectTrigger
                  id="duplicate-group"
                  className="h-12 w-full min-w-0 rounded-xl border-blue-100 bg-white shadow-sm focus:ring-blue-200"
                >
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.member_count} учащихся)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-title" className="text-sm font-semibold text-slate-900">
                Название
              </Label>
              <Input
                id="duplicate-title"
                value={duplicateTitle}
                onChange={event => setDuplicateTitle(event.target.value)}
                placeholder="Название урока"
                disabled={isDuplicating}
                className="h-12 rounded-xl border-blue-100 bg-white px-4 text-base shadow-sm focus-visible:border-blue-400 focus-visible:ring-blue-200"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Оставьте пустым, чтобы использовать название оригинала.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-topic" className="text-sm font-semibold text-slate-900">
                Тема
              </Label>
              <Input
                id="duplicate-topic"
                value={duplicateTopic}
                onChange={event => setDuplicateTopic(event.target.value)}
                placeholder="Тема урока"
                disabled={isDuplicating}
                className="h-12 rounded-xl border-blue-100 bg-white px-4 text-base shadow-sm focus-visible:border-blue-400 focus-visible:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-level" className="text-sm font-semibold text-slate-900">
                Уровень
              </Label>
              <Select value={duplicateLevel} onValueChange={setDuplicateLevel} disabled={isDuplicating}>
                <SelectTrigger
                  id="duplicate-level"
                  className="h-12 w-full min-w-0 rounded-xl border-blue-100 bg-white shadow-sm focus:ring-blue-200"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Начальный (A1-A2)</SelectItem>
                  <SelectItem value="Intermediate">Средний (B1-B2)</SelectItem>
                  <SelectItem value="Advanced">Продвинутый (C1-C2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-blue-100 bg-slate-50/80 px-6 py-4 sm:gap-3 sm:px-8">
            <Button
              variant="outline"
              onClick={closeDuplicateDialog}
              disabled={isDuplicating}
              className="h-11 rounded-xl px-5"
            >
              Отмена
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={isDuplicating || !duplicateGroupId || groups.length === 0}
              className="h-11 rounded-xl px-6"
            >
              {isDuplicating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Копирование...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Назначить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

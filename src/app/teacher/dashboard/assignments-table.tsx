'use client'

import { useState, Fragment, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, BookOpen, Loader2, AlertTriangle, BarChart3, ChevronDown, ChevronUp, Copy, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { deleteAssignment, duplicateAssignmentToGroup } from './actions'
import { Database } from '@/types/supabase'
import type { AssignmentAnalytics } from '@/types/analytics'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

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
  'Beginner': 'Начальный',
  'Intermediate': 'Средний',
  'Advanced': 'Продвинутый',
}

function AnalyticsCell({ analytics }: { analytics: AssignmentAnalytics | undefined }) {
  if (!analytics) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const avgScore = analytics.average_score !== null 
    ? Math.round(analytics.average_score)
    : null

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-1">
        {avgScore !== null ? (
          <Tooltip content={`Средний балл: ${avgScore}%`}>
            <Badge variant="neutral" className="w-fit">
              {avgScore}%
            </Badge>
          </Tooltip>
        ) : (
          <Badge variant="neutral" className="w-fit">
            Нет оценок
          </Badge>
        )}
        {analytics.score_delta !== null && (
          <Tooltip content={analytics.score_delta > 0 ? `Улучшение на ${analytics.score_delta.toFixed(1)}%` : `Снижение на ${Math.abs(analytics.score_delta).toFixed(1)}%`}>
            {analytics.score_delta > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : analytics.score_delta < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-600" />
            ) : null}
          </Tooltip>
        )}
      </div>
      <span className="text-muted-foreground">
        {analytics.completed_attempts} студентов
      </span>
      {analytics.last_activity && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{analytics.last_activity}</span>
        </div>
      )}
    </div>
  )
}

function ExpandedAnalyticsPanel({ analytics }: { analytics: AssignmentAnalytics }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Детальная аналитика</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Общее количество студентов</div>
          <div className="text-lg font-semibold">{analytics.total_students}</div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground mb-1">Завершенные попытки</div>
          <div className="text-lg font-semibold">{analytics.completed_attempts}</div>
        </div>
        
        {analytics.min_score !== null && analytics.max_score !== null && (
          <>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Минимальный балл</div>
              <div className="text-lg font-semibold">{Math.round(analytics.min_score)}%</div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground mb-1">Максимальный балл</div>
              <div className="text-lg font-semibold">{Math.round(analytics.max_score)}%</div>
            </div>
          </>
        )}
      </div>
      
      {analytics.average_attempts !== null && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Среднее количество попыток на студента</div>
          <div className="text-lg font-semibold">{analytics.average_attempts.toFixed(1)}</div>
        </div>
      )}

      {analytics.trend_data.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Динамика среднего балла</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={analytics.trend_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getDate()}.${date.getMonth() + 1}`
                }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
              />
              <RechartsTooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Средний балл']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('ru-RU')}
              />
              <Line 
                type="monotone" 
                dataKey="avgScore" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {analytics.distribution['80-100'] + analytics.distribution['60-79'] + analytics.distribution['<60'] > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Распределение баллов</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span>80-100</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all"
                  style={{ 
                    width: `${(analytics.distribution['80-100'] / (analytics.distribution['80-100'] + analytics.distribution['60-79'] + analytics.distribution['<60']) * 100)}%` 
                  }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{analytics.distribution['80-100']}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span>60-79</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-yellow-500 h-full transition-all"
                  style={{ 
                    width: `${(analytics.distribution['60-79'] / (analytics.distribution['80-100'] + analytics.distribution['60-79'] + analytics.distribution['<60']) * 100)}%` 
                  }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{analytics.distribution['60-79']}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span>&lt;60</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all"
                  style={{ 
                    width: `${(analytics.distribution['<60'] / (analytics.distribution['80-100'] + analytics.distribution['60-79'] + analytics.distribution['<60']) * 100)}%` 
                  }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{analytics.distribution['<60']}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AssignmentsTable({ 
  assignments: initialAssignments, 
  analytics: initialAnalytics,
  groups,
  onAssignmentCreated,
  onAssignmentDeleted
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
  const [duplicateGroupId, setDuplicateGroupId] = useState<string>('')
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [duplicateTopic, setDuplicateTopic] = useState('')
  const [duplicateLevel, setDuplicateLevel] = useState<string>('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  // Update state when props change (e.g., from server revalidation)
  useEffect(() => {
    setAssignments(initialAssignments)
    setAnalytics(initialAnalytics)
  }, [initialAssignments, initialAnalytics])

  // Expose method to add assignment (for parent to call)
  useEffect(() => {
    if (onAssignmentCreated) {
      // Store callback in a way parent can trigger it
      // Parent will call onAssignmentCreated directly, which updates parent state
      // Parent state change will update this component's props
    }
  }, [onAssignmentCreated])

  function openDeleteDialog(id: string, title: string | null) {
    setAssignmentToDelete({ id, title })
    setDeleteDialogOpen(true)
  }

  function closeDeleteDialog() {
    if (deletingId) return // Prevent closing during deletion
    setDeleteDialogOpen(false)
    setAssignmentToDelete(null)
  }

  function openDuplicateDialog(assignment: Assignment) {
    setAssignmentToDuplicate(assignment)
    setDuplicateTitle(assignment.title || '')
    setDuplicateTopic(assignment.topic || '')
    setDuplicateLevel(assignment.difficulty_level || 'Intermediate')
    setDuplicateGroupId('')
    if (groups.length > 0) {
      setDuplicateGroupId(groups[0].id)
    }
    setDuplicateDialogOpen(true)
  }

  function closeDuplicateDialog() {
    if (isDuplicating) return
    setDuplicateDialogOpen(false)
    setAssignmentToDuplicate(null)
    setDuplicateGroupId('')
    setDuplicateTitle('')
    setDuplicateTopic('')
    setDuplicateLevel('')
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
      } else       if (result.success && result.assignment) {
        toast.success('Урок успешно назначен в группу')
        setAssignments(prev => [result.assignment!, ...prev])
        if (onAssignmentCreated) {
          onAssignmentCreated(result.assignment)
        }
        router.refresh()
        // Signal student dashboards to refresh
        if (typeof window !== 'undefined') {
          localStorage.setItem('student-dashboard-updated', Date.now().toString())
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'student-dashboard-updated',
            newValue: Date.now().toString()
          }))
        }
        closeDuplicateDialog()
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
        // Immediately remove from state
        setAssignments(prev => prev.filter(a => a.id !== result.deletedAssignmentId))
        setAnalytics(prev => {
          const newMap = new Map(prev)
          newMap.delete(result.deletedAssignmentId!)
          return newMap
        })
        setDeleteDialogOpen(false)
        setAssignmentToDelete(null)
        // Notify parent
        if (onAssignmentDeleted) {
          onAssignmentDeleted(result.deletedAssignmentId)
        }
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Ошибка при удалении урока')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Существующие уроки
        </CardTitle>
        <CardDescription>
          Все созданные вами задания для чтения
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>У вас пока нет созданных уроков</p>
            <p className="text-sm">Используйте форму слева для генерации</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-sm">Название</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Тема</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Уровень</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Дата</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Аналитика</th>
                  <th className="text-right py-3 px-2 font-medium text-sm">Действия</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const assignmentAnalytics = analytics.get(assignment.id)
                  const isExpanded = expandedAnalytics.has(assignment.id)
                  
                  return (
                    <Fragment key={assignment.id}>
                      <tr 
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <span className="font-medium">
                        {assignment.title || 'Без названия'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {assignment.topic || '—'}
                    </td>
                    <td className="py-3 px-2">
                      {assignment.difficulty_level ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {levelLabels[assignment.difficulty_level] || assignment.difficulty_level}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {assignment.created_at 
                        ? new Date(assignment.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '—'
                      }
                    </td>
                        <td className="py-3 px-2">
                          <AnalyticsCell analytics={assignmentAnalytics} />
                        </td>
                    <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {assignmentAnalytics && assignmentAnalytics.completed_attempts > 0 && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  const newExpanded = new Set(expandedAnalytics)
                                  if (isExpanded) {
                                    newExpanded.delete(assignment.id)
                                  } else {
                                    newExpanded.add(assignment.id)
                                  }
                                  setExpandedAnalytics(newExpanded)
                                }}
                                className="text-muted-foreground"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDuplicateDialog(assignment)}
                              disabled={isDuplicating || duplicateDialogOpen || groups.length === 0}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              title="Назначить в группу"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDeleteDialog(assignment.id, assignment.title)}
                        disabled={deletingId === assignment.id || deleteDialogOpen}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        <tr className="border-b bg-muted/30">
                          <td colSpan={6} className="py-4 px-2">
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

      <Dialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Удаление урока
            </DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить урок{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{assignmentToDelete?.title || 'Без названия'}&rdquo;
              </span>?
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Это действие нельзя отменить. Урок будет скрыт от студентов, но их результаты сохранятся.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={!!deletingId}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!deletingId}
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

      <Dialog open={duplicateDialogOpen} onOpenChange={closeDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Назначить урок в группу
            </DialogTitle>
            <DialogDescription>
              Создайте копию урока для другой группы
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-group">Группа *</Label>
              <Select
                value={duplicateGroupId}
                onValueChange={setDuplicateGroupId}
                disabled={isDuplicating || groups.length === 0}
              >
                <SelectTrigger id="duplicate-group">
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.member_count} студентов)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-title">Название</Label>
              <Input
                id="duplicate-title"
                value={duplicateTitle}
                onChange={(e) => setDuplicateTitle(e.target.value)}
                placeholder="Название урока"
                disabled={isDuplicating}
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым, чтобы использовать название оригинала
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-topic">Тема</Label>
              <Input
                id="duplicate-topic"
                value={duplicateTopic}
                onChange={(e) => setDuplicateTopic(e.target.value)}
                placeholder="Тема урока"
                disabled={isDuplicating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-level">Уровень</Label>
              <Select
                value={duplicateLevel}
                onValueChange={setDuplicateLevel}
                disabled={isDuplicating}
              >
                <SelectTrigger id="duplicate-level">
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDuplicateDialog}
              disabled={isDuplicating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={isDuplicating || !duplicateGroupId || groups.length === 0}
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


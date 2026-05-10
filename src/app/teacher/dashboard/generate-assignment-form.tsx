'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Sparkles, BookOpen, RotateCcw, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { generateAssignment } from './assignment-actions'

type Level = 'Beginner' | 'Intermediate' | 'Advanced'

const levelLabels: Record<Level, string> = {
  'Beginner': 'Начальный (A1-A2)',
  'Intermediate': 'Средний (B1-B2)',
  'Advanced': 'Продвинутый (C1-C2)',
}

interface Group {
  id: string
  name: string
  member_count: number
}

interface GenerateAssignmentFormProps {
  groups: Group[]
  onAssignmentCreated?: (assignment: import('@/types/supabase').Database['public']['Tables']['assignments']['Row']) => void
}

export function GenerateAssignmentForm({ groups, onAssignmentCreated }: GenerateAssignmentFormProps) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<Level>('Intermediate')
  const [groupId, setGroupId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [failureCount, setFailureCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<{
    title: string
    content: string
    vocabulary_hints: Array<{ word: string; translation: string }>
  } | null>(null)

  useEffect(() => {
    if (groups.length > 0 && !groupId) {
      setGroupId(groups[0].id)
    }
  }, [groups, groupId])

  async function handleGenerate() {
    if (isGenerating) return

    if (!topic.trim()) {
      toast.error('Введите тему урока')
      return
    }

    if (!groupId) {
      toast.error('Выберите группу для задания')
      return
    }

    setIsGenerating(true)
    setLastGenerated(null)
    setLastError(null)

    try {
      const result = await generateAssignment(topic.trim(), level, groupId)

      if (result.error) {
        setLastError(result.error)
        if (result.errorType !== 'RATE_LIMIT') {
          setFailureCount(prev => prev + 1)
        }
        toast.error(result.error)
        return
      }

      if (result.success && result.title && result.content && result.vocabulary_hints) {
        toast.success('Урок успешно создан!')
        setLastGenerated({
          title: result.title,
          content: result.content,
          vocabulary_hints: result.vocabulary_hints,
        })
        setTopic('')
        setFailureCount(0)
        setLastError(null)
        if (result.assignment && onAssignmentCreated) {
          onAssignmentCreated(result.assignment)
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('student-dashboard-updated', Date.now().toString())
          // Manually dispatch storage event for same-tab listeners.
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'student-dashboard-updated',
            newValue: Date.now().toString()
          }))
        }
      }
    } catch (error) {
      console.error('Error generating assignment:', error)
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setLastError(errorMessage)
      setFailureCount(prev => prev + 1)
      toast.error('Произошла ошибка при генерации')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleRetry() {
    handleGenerate()
  }

  function handleManualCreate() {
    const params = new URLSearchParams()
    if (topic.trim()) {
      params.set('topic', topic.trim())
    }
    if (level) {
      params.set('level', level)
    }
    if (groupId) {
      params.set('groupId', groupId)
    }
    router.push(`/teacher/assignments/create?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Создать урок с ИИ
          </CardTitle>
          <CardDescription>
            Автоматически сгенерируйте текст для чтения на заданную тему
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Тема урока</Label>
            <Input
              id="topic"
              placeholder="например: В кофейне, Путешествия, Бизнес"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Уровень сложности</Label>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as Level)}
              disabled={isGenerating}
            >
              <SelectTrigger id="level" className="w-full">
                <SelectValue placeholder="Выберите уровень" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(levelLabels) as Level[]).map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {levelLabels[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Группа *</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Создайте группу сначала, чтобы добавить задание
              </p>
            ) : (
              <Select
                value={groupId}
                onValueChange={setGroupId}
                disabled={isGenerating}
              >
                <SelectTrigger id="group" className="w-full">
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
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim() || !groupId || groups.length === 0}
            className="w-full"
          >
            <Loader2 className={`h-4 w-4 ${isGenerating ? 'animate-spin' : 'hidden'}`} />
            <Sparkles className={`h-4 w-4 ${isGenerating ? 'hidden' : ''}`} />
            <span>{isGenerating ? 'Генерация...' : 'Сгенерировать урок'}</span>
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Обычно 5–10 секунд
          </p>

          {lastError && !isGenerating && (
            <div className="space-y-2 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">{lastError}</p>
              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  <span>Повторить генерацию</span>
                </Button>
              </div>
            </div>
          )}

          {failureCount >= 2 && !isGenerating && (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Генерация не удалась несколько раз
              </p>
              <p className="text-xs text-amber-700">
                Вы можете создать урок вручную, сохранив выбранные параметры
              </p>
              <Button
                onClick={handleManualCreate}
                variant="outline"
                size="sm"
                className="w-full rounded-full border-amber-300"
              >
                <FileText className="h-3 w-3 mr-1" />
                <span>Создать урок вручную</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {lastGenerated && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-4 w-4 text-green-600" />
              Создано: {lastGenerated.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Текст:</p>
              <p className="text-sm leading-relaxed">{lastGenerated.content}</p>
            </div>
            
            {lastGenerated.vocabulary_hints.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Словарь:</p>
                <div className="flex flex-wrap gap-2">
                  {lastGenerated.vocabulary_hints.map((hint, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-background rounded-md text-xs border"
                    >
                      <span className="font-medium">{hint.word}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-muted-foreground">{hint.translation}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

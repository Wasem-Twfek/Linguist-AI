'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { createManualAssignment } from './assignment-actions'

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

interface CreateManualAssignmentFormProps {
  groups: Group[]
  onAssignmentCreated?: (assignment: import('@/types/supabase').Database['public']['Tables']['assignments']['Row']) => void
}

export function CreateManualAssignmentForm({ groups, onAssignmentCreated }: CreateManualAssignmentFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<Level>('Intermediate')
  const [groupId, setGroupId] = useState<string>('')
  const [textContent, setTextContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (groups.length > 0 && !groupId) {
      setGroupId(groups[0].id)
    }
  }, [groups, groupId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || title.trim().length < 2) {
      toast.error('Название должно содержать минимум 2 символа')
      return
    }

    if (!textContent.trim() || textContent.trim().length < 20) {
      toast.error('Текст должен содержать минимум 20 символов')
      return
    }

    if (!groupId) {
      toast.error('Выберите группу')
      return
    }

    setIsCreating(true)

    try {
      const result = await createManualAssignment({
        title: title.trim(),
        topic: topic.trim() || undefined,
        level,
        groupId,
        textContent: textContent.trim(),
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.success && result.assignment) {
        toast.success('Урок успешно создан')
        setTitle('')
        setTopic('')
        setTextContent('')
        if (onAssignmentCreated) {
          onAssignmentCreated(result.assignment)
        }
        router.refresh()
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
      console.error('Error creating manual assignment:', error)
      toast.error('Произошла ошибка при создании урока')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Создать урок вручную
        </CardTitle>
        <CardDescription>
          Создайте урок с собственным текстом для чтения
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-title">Название *</Label>
            <Input
              id="manual-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название урока"
              required
              minLength={2}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-topic">Тема (необязательно)</Label>
            <Input
              id="manual-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Тема урока"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-level">Уровень *</Label>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as Level)}
              disabled={isCreating}
            >
              <SelectTrigger id="manual-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(levelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-group">Группа *</Label>
            <Select
              value={groupId}
              onValueChange={setGroupId}
              disabled={isCreating || groups.length === 0}
            >
              <SelectTrigger id="manual-group">
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
            <Label htmlFor="manual-text">Текст для чтения *</Label>
            <Textarea
              id="manual-text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Введите текст урока..."
              required
              minLength={20}
              rows={8}
              disabled={isCreating}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Минимум 20 символов
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isCreating || groups.length === 0}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Создать урок
              </>
            )}
          </Button>

          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Сначала создайте группу, чтобы добавить урок
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}


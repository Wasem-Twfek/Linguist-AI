'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createAssignment } from './actions'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'
import { cn } from '@/lib/utils'

type StudyGroup = Database['public']['Tables']['study_groups']['Row']

interface CreateAssignmentFormProps {
  groups: StudyGroup[]
}

export function CreateAssignmentForm({ groups }: CreateAssignmentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groupId, setGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'reading' | 'essay' | ''>('reading')
  const [textContent, setTextContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const topicParam = searchParams.get('topic')
    const groupIdParam = searchParams.get('groupId')

    if (topicParam) {
      setTitle(topicParam)
    }
    if (groupIdParam && groups.some(g => g.id === groupIdParam)) {
      setGroupId(groupIdParam)
    }
  }, [searchParams, groups])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        groupId,
        title,
        type: type as 'reading' | 'essay',
        textContent,
      }

      const result = await createAssignment(data)

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Задание создано')
        if (typeof window !== 'undefined') {
          localStorage.setItem('student-dashboard-updated', Date.now().toString())
          // Manually dispatch storage event for same-tab listeners.
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'student-dashboard-updated',
            newValue: Date.now().toString()
          }))
        }
        setTimeout(() => {
          router.push('/teacher/dashboard')
        }, 500)
      }
    } catch (err) {
      console.error(err)
      toast.error('Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group_id">Выберите группу</Label>
        <select
          id="group_id"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          required
          disabled={loading || groups.length === 0}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          )}
        >
          <option value="">Выберите группу</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Название</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          type="text"
          placeholder="Введите название задания"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Тип задания</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as 'reading' | 'essay')}
          required
          disabled={loading}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          )}
        >
          <option value="">Выберите тип задания</option>
          <option value="reading">Чтение</option>
          <option value="essay">Эссе</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text_content">Текст для чтения</Label>
        <Textarea
          id="text_content"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Введите текст задания"
          rows={10}
          required
          disabled={loading}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1" disabled={loading || groups.length === 0}>
          {loading ? 'Создание...' : 'Создать задание'}
        </Button>
        <Button type="button" variant="outline" asChild disabled={loading}>
          <Link href="/teacher/dashboard">Отмена</Link>
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Сначала создайте группу, чтобы добавить задание
        </p>
      )}
    </form>
  )
}

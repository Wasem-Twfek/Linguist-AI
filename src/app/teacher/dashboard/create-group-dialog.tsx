'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGroup } from './group-actions'
import { toast } from 'sonner'

interface CreateGroupDialogProps {
  onGroupCreated?: (group: { id: string; name: string; description: string | null; created_at: string | null; member_count: number }) => void
}

export function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createGroup(name)

      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success && result.group) {
        toast.success('Группа создана')
        setOpen(false)
        setName('')
        if (onGroupCreated) {
          onGroupCreated(result.group)
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="rounded-xl"
        >
          Создать группу
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-0">
          <DialogHeader className="space-y-2 border-b border-blue-100 bg-blue-50/70 px-6 py-5 pr-14 text-left sm:px-8">
            <DialogTitle className="text-[1.35rem] text-slate-950">Создать новую группу</DialogTitle>
            <DialogDescription>
              Введите название группы для ваших учеников
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-6 sm:px-8">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-900">
                Название группы
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Группа А"
                required
                disabled={loading}
                className="h-12 rounded-xl border-blue-100 bg-white px-4 text-base shadow-sm focus-visible:border-blue-400 focus-visible:ring-blue-200"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-blue-100 bg-slate-50/80 px-6 py-4 sm:gap-3 sm:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setName('')
              }}
              disabled={loading}
              className="h-11 rounded-xl px-5"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl px-6"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

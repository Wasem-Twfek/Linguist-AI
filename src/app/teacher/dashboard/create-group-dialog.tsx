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
import { createGroup } from './actions'
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
        // Immediately update parent component state
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
        <Button>Создать группу</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Создать новую группу</DialogTitle>
            <DialogDescription>
              Введите название группы для ваших учеников
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название группы</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Группа А"
                required
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setName('')
              }}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

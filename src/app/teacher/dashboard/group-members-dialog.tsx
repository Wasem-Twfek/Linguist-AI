'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getGroupMembers, addStudentToGroup, removeStudentFromGroup } from './group-actions'
import { toast } from 'sonner'
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react'
import { getDisplayName } from '@/lib/display-name'

interface GroupMember {
  id: string
  user_id: string
  joined_at: string | null
  profile: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

interface GroupMembersDialogProps {
  groupId: string
  groupName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberCountUpdate?: (groupId: string, newCount: number) => void
}

export function GroupMembersDialog({ 
  groupId, 
  groupName, 
  open, 
  onOpenChange,
  onMemberCountUpdate
}: GroupMembersDialogProps) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [addingStudent, setAddingStudent] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [studentEmail, setStudentEmail] = useState('')

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getGroupMembers(groupId)
      if (result.error) {
        toast.error(result.error)
      } else if (result.members) {
        setMembers(result.members)
      }
    } catch (err) {
      console.error('Error fetching members:', err)
      toast.error('Ошибка при загрузке участников')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    if (open && groupId) {
      fetchMembers()
    }
  }, [open, groupId, fetchMembers])

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!studentEmail.trim()) return

    setAddingStudent(true)
    try {
      const result = await addStudentToGroup(groupId, studentEmail.trim())
      if (result.error) {
        toast.error(result.error)
      } else if (result.success) {
        toast.success('Студент добавлен в группу')
        setStudentEmail('')
        fetchMembers()
        if (result.memberCount !== undefined && onMemberCountUpdate) {
          onMemberCountUpdate(groupId, result.memberCount)
        }
      }
    } catch (err) {
      console.error('Error adding student:', err)
      toast.error('Ошибка при добавлении студента')
    } finally {
      setAddingStudent(false)
    }
  }

  async function handleRemoveStudent(memberId: string) {
    setRemovingId(memberId)
    try {
      const result = await removeStudentFromGroup(groupId, memberId)
      if (result.error) {
        toast.error(result.error)
      } else if (result.success) {
        toast.success('Студент удален из группы')
        fetchMembers()
        if (result.memberCount !== undefined && onMemberCountUpdate) {
          onMemberCountUpdate(groupId, result.memberCount)
        }
      }
    } catch (err) {
      console.error('Error removing student:', err)
      toast.error('Ошибка при удалении студента')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,40rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="space-y-1 border-b border-blue-100 bg-blue-50/70 px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-3 pr-10 text-left text-[1.35rem] text-slate-950">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 break-words">{groupName}</span>
            </DialogTitle>
            <DialogDescription className="text-left">
              Управление участниками группы
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          <form onSubmit={handleAddStudent} className="space-y-2">
            <Label htmlFor="studentEmail" className="text-sm font-semibold text-slate-900">
              Добавить студента по email
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@example.com"
                disabled={addingStudent}
                className="h-12 min-w-0 flex-1 rounded-xl border-blue-100 bg-white px-4 text-base shadow-sm focus-visible:border-blue-400 focus-visible:ring-blue-200"
              />
              <Button
                type="submit"
                disabled={addingStudent || !studentEmail.trim()}
                className="h-12 min-w-[8.75rem] shrink-0 gap-2 rounded-xl px-5 sm:w-auto"
                aria-label="Добавить студента в группу"
              >
                {addingStudent ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden />
                )}
                Добавить
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-900">
              Участники ({members.length})
            </Label>

            {loading ? (
              <div className="flex justify-center rounded-2xl border border-blue-100 bg-white py-8 shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden />
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm text-slate-500">
                В группе пока нет студентов
              </div>
            ) : (
              <div className="divide-y divide-blue-100 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 bg-white p-4 transition-colors hover:bg-blue-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {getDisplayName(member.profile?.full_name, member.profile?.email)}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {member.profile?.email ? (
                          <span className="block truncate">{member.profile.email}</span>
                        ) : (
                          <span className="block truncate">—</span>
                        )}
                        Добавлен:{' '}
                        {member.joined_at
                          ? new Date(member.joined_at).toLocaleDateString('ru-RU')
                          : '—'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStudent(member.id)}
                      disabled={removingId === member.id}
                      className="size-10 shrink-0 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-200"
                      aria-label="Удалить студента из группы"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

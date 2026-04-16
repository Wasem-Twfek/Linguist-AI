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
import { getGroupMembers, addStudentToGroup, removeStudentFromGroup } from './actions'
import { toast } from 'sonner'
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react'
import { getDisplayName } from '@/lib/display-name'

// Type for group member with profile info
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

/**
 * Dialog for managing group members
 * Teachers can view, add (by email), and remove students
 */
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

  // Memoized fetch function
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

  // Fetch group members when dialog opens
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
        fetchMembers() // Refresh list
        // Immediately update member count in parent
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
        fetchMembers() // Refresh list
        // Immediately update member count in parent
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {groupName}
          </DialogTitle>
          <DialogDescription>
            Управление участниками группы
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add Student Form */}
          <form onSubmit={handleAddStudent} className="space-y-2">
            <Label htmlFor="studentEmail">Добавить студента по email</Label>
            <div className="flex gap-2">
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@example.com"
                disabled={addingStudent}
                className="flex-1"
              />
              <Button type="submit" disabled={addingStudent || !studentEmail.trim()}>
                {addingStudent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-2">
            <Label>Участники ({members.length})</Label>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                В группе пока нет студентов
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getDisplayName(member.profile?.full_name, member.profile?.email)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email ? (
                          <span className="block truncate">{member.profile.email}</span>
                        ) : (
                          <span className="block truncate">—</span>
                        )}
                        Добавлен: {member.joined_at 
                          ? new Date(member.joined_at).toLocaleDateString('ru-RU')
                          : '—'
                        }
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStudent(member.id)}
                      disabled={removingId === member.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
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

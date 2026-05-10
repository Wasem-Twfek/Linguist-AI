'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteGroup } from './group-actions'
import { CreateGroupDialog } from './create-group-dialog'
import { GroupMembersDialog } from './group-members-dialog'
import { toast } from 'sonner'
import { Loader2, Users, FolderOpen, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface GroupWithCount {
  id: string
  name: string
  description: string | null
  created_at: string | null
  member_count: number
}

interface GroupsPanelProps {
  groups: GroupWithCount[]
  onGroupCreated: (group: GroupWithCount) => void
  onGroupDeleted: (groupId: string) => void
  onMemberCountUpdated: (groupId: string, newCount: number) => void
}

export function GroupsPanel({ groups, onGroupCreated, onGroupDeleted, onMemberCountUpdated }: GroupsPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupWithCount | null>(null)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<GroupWithCount | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleManageMembers(group: GroupWithCount) {
    setSelectedGroup(group)
    setMembersDialogOpen(true)
  }

  function handleMembersDialogClose(open: boolean) {
    setMembersDialogOpen(open)
  }

  function handleDeleteClick(group: GroupWithCount) {
    setDeletingGroup(group)
    setDeleteDialogOpen(true)
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (open) {
      setDeleteDialogOpen(true)
      return
    }

    if (deletingId) return
    setDeleteDialogOpen(false)
  }

  async function handleConfirmDelete() {
    if (!deletingGroup) return

    setDeletingId(deletingGroup.id)
    try {
      const result = await deleteGroup(deletingGroup.id)
      if (result.error) {
        toast.error(result.error)
        setDeletingId(null)
      } else if (result.success && result.deletedGroupId) {
        toast.success(`Группа "${deletingGroup.name}" удалена`)
        onGroupDeleted(result.deletedGroupId)
        setDeleteDialogOpen(false)
        setDeletingId(null)
      }
    } catch (err) {
      console.error('Error deleting group:', err)
      toast.error('Ошибка при удалении группы')
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Мои группы
          </CardTitle>
          <CreateGroupDialog onGroupCreated={onGroupCreated} />
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">У вас пока нет групп</p>
              <p className="text-xs mt-1">Создайте группу для организации студентов</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div 
                  key={group.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.member_count} {
                        group.member_count === 1 ? 'студент' : 
                        group.member_count < 5 ? 'студента' : 'студентов'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageMembers(group)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Участники
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(group)}
                      disabled={deletingId === group.id || deleteDialogOpen}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingId === group.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGroup && (
        <GroupMembersDialog
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          open={membersDialogOpen}
          onOpenChange={handleMembersDialogClose}
          onMemberCountUpdate={onMemberCountUpdated}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить группу?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить группу &quot;{deletingGroup?.name}&quot;?
              <br />
              Это действие нельзя отменить. Все участники будут удалены из группы.
              {deletingGroup && deletingGroup.member_count > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  В группе {deletingGroup.member_count} {deletingGroup.member_count === 1 ? 'студент' : 'студентов'}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
              }}
              disabled={!!deletingId}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
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
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateProfileName } from './actions'
import { toast } from 'sonner'

interface ProfileEditFormProps {
  currentFullName: string | null
  email: string
}

export function ProfileEditForm({ currentFullName, email }: ProfileEditFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(currentFullName || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateProfileName(fullName)
      
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        toast.success('Сохранено')
        router.refresh()
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error('Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Редактировать профиль</CardTitle>
        <CardDescription>
          Обновите ваше имя для отображения
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Электронная почта</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email нельзя изменить
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Имя и фамилия *</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
              minLength={2}
              maxLength={80}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Минимум 2 символа, максимум 80 символов
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}


'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Save, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileName } from './actions'

interface ProfileEditFormProps {
  currentFullName: string | null
  email: string
}

export function ProfileEditForm({ currentFullName, email }: ProfileEditFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(currentFullName || '')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      const result = await updateProfileName(fullName)

      if (result?.error) {
        setStatus({ type: 'error', message: result.error })
        toast.error(result.error)
      } else if (result?.success) {
        setStatus({ type: 'success', message: 'Изменения сохранены' })
        toast.success('Изменения сохранены')
        router.refresh()
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setStatus({ type: 'error', message: 'Произошла ошибка. Попробуйте еще раз.' })
      toast.error('Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-blue-100 bg-white shadow-soft">
      <CardHeader className="border-b border-blue-100 bg-blue-50/60">
        <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
          <UserRound className="h-5 w-5 text-blue-700" />
          Редактировать профиль
        </CardTitle>
        <CardDescription>
          Обновите имя, которое будет отображаться в Linguist AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Электронная почта</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-600"
            />
            <p className="text-xs text-muted-foreground">
              Адрес электронной почты доступен только для просмотра.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Отображаемое имя</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иван Иванов"
              required
              minLength={2}
              maxLength={80}
              disabled={loading}
              className="h-11 rounded-xl border-blue-100 bg-white focus-visible:border-blue-400 focus-visible:ring-blue-200"
            />
            <p className="text-xs text-muted-foreground">
              Так вас будут видеть в панелях и отчетах.
            </p>
          </div>

          {status ? (
            <div
              className={
                status.type === 'success'
                  ? 'flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'
                  : 'rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'
              }
              aria-live="polite"
            >
              {status.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
              <span>{status.message}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Сохранить изменения
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

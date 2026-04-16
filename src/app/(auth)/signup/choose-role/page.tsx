import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChooseRoleForm } from './choose-role-form'

export default async function ChooseRolePage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'teacher' || profile?.role === 'student') {
    redirect(
      profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-900 dark:to-zinc-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Выберите роль</CardTitle>
          <CardDescription>
            Как вы планируете использовать приложение?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChooseRoleForm />
        </CardContent>
      </Card>
    </div>
  )
}

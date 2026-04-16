import { createClient } from '@/utils/supabase/server'
import { LogoutButton } from '@/components/logout-button'

export async function DashboardHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const userEmail = user.email || 'Пользователь'

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Linguist AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{userEmail}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}


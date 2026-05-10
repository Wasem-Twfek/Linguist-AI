import { createClient } from '@/utils/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'

export async function DashboardHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const userEmail = user.email || 'Пользователь'

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3" aria-label="Linguist AI">
          <Image
            src="/logo.svg"
            alt=""
            width={36}
            height={36}
            priority
            className="size-9 rounded-lg shadow-soft"
          />
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Linguist <span className="text-accent">AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[220px] truncate text-sm font-medium text-muted-foreground sm:inline">
            {userEmail}
          </span>
          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <Link href="/settings/profile" prefetch>
              <UserRound className="h-4 w-4 text-blue-700" aria-hidden />
              <span className="hidden sm:inline">Профиль</span>
            </Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}

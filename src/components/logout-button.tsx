'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    
    await supabase.auth.signOut()
    
    window.location.replace('/')
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleLogout}
      className="rounded-full px-4"
    >
      Выйти
    </Button>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    
    // Sign out
    await supabase.auth.signOut()
    
    // Use window.location.replace() to navigate and remove current page from history
    // This prevents the back button from going back to the protected page
    // Using replace instead of href prevents adding to history
    window.location.replace('/')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Выйти
    </Button>
  )
}


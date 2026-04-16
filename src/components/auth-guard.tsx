'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface AuthGuardProps {
  requiredRole?: 'student' | 'teacher'
  children: React.ReactNode
}

/**
 * Client-side auth guard to prevent showing cached protected pages
 * after logout when user presses browser back button
 */
export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      // If not authenticated, redirect to login
      if (!user || error) {
        router.replace('/login')
        return
      }

      // If role is required, check it
      if (requiredRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== requiredRole) {
          // Redirect based on actual role
          if (profile?.role === 'teacher') {
            router.replace('/teacher/dashboard')
          } else if (profile?.role === 'student') {
            router.replace('/student/dashboard')
          } else {
            router.replace('/login')
          }
        }
      }
    }

    checkAuth()

    // Re-check auth on visibility change (when user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [requiredRole, router])

  return <>{children}</>
}


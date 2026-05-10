'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { completeOAuthRedirect } from '@/app/(auth)/actions'

/**
 * PKCE code_verifier lives in browser storage (cookies via createBrowserClient).
 * exchangeCodeForSession must run here — the Route Handler cannot see the verifier.
 */
export function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Завершение входа…')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function run() {
      const oauthError = searchParams.get('error')
      const oauthDesc = searchParams.get('error_description')

      if (oauthError) {
        console.error('[auth/callback] OAuth error', oauthError, oauthDesc)
        let hint = ''
        const d = oauthDesc?.toLowerCase() ?? ''
        if (d.includes('missing') && d.includes('provider')) {
          hint =
            'Проверьте в Supabase Authentication → Providers, что провайдер включён и совпадает с приложением.'
        } else if (oauthError === 'invalid_scope' || d.includes('scope')) {
          hint =
            'Проверьте scopes в настройках провайдера в Supabase и во внешнем OAuth-приложении.'
        }
        setMessage(hint || 'Ошибка входа через провайдера.')
        router.replace(
          `/login?error=oauth${oauthDesc ? `&detail=${encodeURIComponent(oauthDesc)}` : ''}`
        )
        return
      }

      const code = searchParams.get('code')
      if (!code) {
        router.replace('/login?error=oauth')
        return
      }

      const supabase = createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          console.error('[auth/callback] exchangeCodeForSession', exchangeError)
          router.replace('/login?error=oauth')
          return
        }
      }

      await completeOAuthRedirect()
    }

    void run()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-900 dark:to-zinc-800">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

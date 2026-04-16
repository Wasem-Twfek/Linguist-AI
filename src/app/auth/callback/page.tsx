import { Suspense } from 'react'
import { AuthCallbackClient } from './callback-client'

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-900 dark:to-zinc-800">
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  )
}

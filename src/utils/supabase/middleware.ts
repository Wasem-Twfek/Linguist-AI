import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Handle invalid/expired refresh tokens gracefully
  if (authError && authError.message?.includes('refresh_token')) {
    // Clear invalid session and continue (user will be redirected to login if accessing protected route)
    // Don't log this as an error - it's expected when sessions expire
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/signup-student', '/signup-teacher', '/']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // Redirect unauthenticated users to login (except for public routes)
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    // Preserve the original path as a redirect parameter
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    // Copy cookies to the redirect response
    const redirectResponse = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        maxAge: cookie.maxAge,
        httpOnly: cookie.httpOnly,
        priority: cookie.priority,
      })
    })
    return redirectResponse
  }

  // Set cache control headers for protected routes to prevent browser back button issues
  if (!isPublicRoute && user) {
    // Protected routes should not be cached
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    supabaseResponse.headers.set('Pragma', 'no-cache')
    supabaseResponse.headers.set('Expires', '0')
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from './types/supabase'

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Public routes that don't require authentication */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/signup-student',
  '/signup-teacher',
  '/signup/choose-role',
  '/auth/callback',
  '/api/auth/callback',
  '/api/test-models',
]

/** Role-specific protected route prefixes */
const TEACHER_ROUTES = ['/teacher']
const STUDENT_ROUTES = ['/student']

/** Dashboard routes for role-based redirects */
const TEACHER_DASHBOARD = '/teacher/dashboard'
const STUDENT_DASHBOARD = '/student/dashboard'
const CHOOSE_ROLE_ROUTE = '/signup/choose-role'
const LOGIN_ROUTE = '/login'

/** Debug mode - enable logging in development */
const DEBUG = process.env.NODE_ENV === 'development'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a path is a public route
 */
function isPublicRoute(path: string): boolean {
  // Exact match for root
  if (path === '/') return true
  
  // Check exact matches
  if (PUBLIC_ROUTES.includes(path)) return true
  
  // Check prefix matches for auth-related routes
  if (path.startsWith('/auth/')) return true
  if (path.startsWith('/api/auth/')) return true
  
  return false
}

/**
 * Check if path starts with any of the given prefixes
 */
function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix))
}

/**
 * Determine required role for a route
 */
function getRequiredRole(path: string): 'teacher' | 'student' | null {
  if (matchesPrefix(path, TEACHER_ROUTES)) return 'teacher'
  if (matchesPrefix(path, STUDENT_ROUTES)) return 'student'
  return null
}

/**
 * Get redirect URL for a role
 */
function getDashboardForRole(role: string): string {
  return role === 'teacher' ? TEACHER_DASHBOARD : STUDENT_DASHBOARD
}

/**
 * Debug logger
 */
function debug(message: string, data?: Record<string, unknown>) {
  if (DEBUG) {
    console.log(`[Middleware] ${message}`, data || '')
  }
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  debug('Processing request', { path: pathname })
  
  // -------------------------------------------------------------------------
  // Step 1: Create Supabase client with cookie handling
  // -------------------------------------------------------------------------
  let response = NextResponse.next({ request })
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  
  // -------------------------------------------------------------------------
  // Step 2: Refresh session and get user
  // -------------------------------------------------------------------------
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    debug('Auth error (treating as unauthenticated)', { 
      error: authError.message,
      path: pathname 
    })
  }
  
  const isAuthenticated = !!user
  const userId = user?.id
  
  debug('Auth state', { 
    path: pathname, 
    isAuthenticated, 
    userId: userId || 'none' 
  })
  
  // -------------------------------------------------------------------------
  // Step 3: Handle public routes
  // -------------------------------------------------------------------------
  if (isPublicRoute(pathname)) {
    // If authenticated user visits login page, redirect to their dashboard
    if (isAuthenticated && pathname === LOGIN_ROUTE) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId!)
        .maybeSingle()

      const role = profile?.role
      if (role) {
        const dashboard = getDashboardForRole(role)
        debug('Redirecting authenticated user from login', {
          from: pathname,
          to: dashboard,
          role,
        })
        return NextResponse.redirect(new URL(dashboard, request.url))
      }

      debug('Authenticated user on login without role — choose-role', {
        userId,
      })
      return NextResponse.redirect(new URL(CHOOSE_ROLE_ROUTE, request.url))
    }
    
    debug('Allowing public route', { path: pathname })
    return response
  }
  
  // -------------------------------------------------------------------------
  // Step 4: Handle unauthenticated users on protected routes
  // -------------------------------------------------------------------------
  if (!isAuthenticated) {
    const requiredRole = getRequiredRole(pathname)
    
    if (requiredRole) {
      debug('Redirecting unauthenticated user to login', { 
        from: pathname, 
        to: LOGIN_ROUTE 
      })
      
      const redirectUrl = new URL(LOGIN_ROUTE, request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Route doesn't require specific role, allow through
    return response
  }
  
  // -------------------------------------------------------------------------
  // Step 5: Fetch user role for authenticated users
  // -------------------------------------------------------------------------
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId!)
    .single()
  
  if (profileError || !profile?.role) {
    debug('Failed to fetch role or no role assigned', { 
      userId,
      error: profileError?.message,
      path: pathname 
    })
    
    // User has no role - treat as unauthenticated on protected routes
    const requiredRole = getRequiredRole(pathname)
    if (requiredRole) {
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    }
    
    return response
  }
  
  const userRole = profile.role as 'teacher' | 'student'
  const requiredRole = getRequiredRole(pathname)
  
  debug('Role check', { 
    path: pathname, 
    userRole, 
    requiredRole 
  })
  
  // -------------------------------------------------------------------------
  // Step 6: Role-based access control with redirect loop prevention
  // -------------------------------------------------------------------------
  
  if (requiredRole) {
    // Check if user has correct role for this route
    if (userRole !== requiredRole) {
      // User is accessing wrong role's routes
      const correctDashboard = getDashboardForRole(userRole)
      
      // CRITICAL: Prevent redirect loops
      // Only redirect if not already on the correct dashboard
      if (pathname !== correctDashboard) {
        debug('Role mismatch - redirecting to correct dashboard', { 
          from: pathname, 
          to: correctDashboard,
          userRole,
          requiredRole 
        })
        return NextResponse.redirect(new URL(correctDashboard, request.url))
      }
      
      // Already on correct dashboard, allow through (prevents loop)
      debug('Already on correct dashboard, allowing', { 
        path: pathname,
        role: userRole 
      })
    }
    
    // User has correct role, allow access
    debug('Role match - allowing access', { 
      path: pathname, 
      role: userRole 
    })
  }
  
  // -------------------------------------------------------------------------
  // Step 7: Set cache headers for protected routes
  // -------------------------------------------------------------------------
  if (requiredRole) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
  
  return response
}

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder contents (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}


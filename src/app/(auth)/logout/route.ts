import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Prevent caching of logout route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Sign out and clear all session data
  await supabase.auth.signOut()
  
  // Create redirect URL to home page
  const redirectUrl = new URL('/', request.url)
  
  // Create redirect response with cache control headers
  const response = NextResponse.redirect(redirectUrl, {
    status: 302,
  })
  
  // Clear all auth-related cookies explicitly
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  response.cookies.delete('supabase-auth-token')
  
  // Set cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  
  return response
}


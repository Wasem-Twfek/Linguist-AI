import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  const redirectUrl = new URL('/', request.url)
  
  const response = NextResponse.redirect(redirectUrl, {
    status: 302,
  })
  
  // Security: clear auth cookies explicitly.
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  response.cookies.delete('supabase-auth-token')
  
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  
  return response
}


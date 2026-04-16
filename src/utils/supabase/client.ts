import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please set it in your .env.local file. ' +
      'Get your project URL from https://app.supabase.com/project/_/settings/api'
    )
  }

  if (!supabaseKey) {
    throw new Error(
      'Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please set it in your .env.local file. ' +
      'Get your anon key from https://app.supabase.com/project/_/settings/api'
    )
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}
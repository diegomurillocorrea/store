import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Una sola llamada a auth.getUser() por request RSC. */
export const getCurrentUser = cache(async function getCurrentUser (): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

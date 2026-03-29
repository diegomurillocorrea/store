/**
 * Next.js solo inyecta NEXT_PUBLIC_* en el bundle del cliente si el acceso es
 * estático (process.env.NEXT_PUBLIC_…). process.env[nombreDinámico] queda vacío en el navegador.
 */
export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value?.trim()) {
    throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL')
  }
  return value.trim()
}

/** Anon legacy o publishable (sb_publishable_…); Supabase acepta ambos en el cliente. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    (() => {
      throw new Error(
        'Define NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
      )
    })()
  )
}

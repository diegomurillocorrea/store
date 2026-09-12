/** Solo servidor. Nunca exponer con NEXT_PUBLIC_. */
export function getDatabaseUrl (): string {
  const value = process.env.DATABASE_URL?.trim()
  if (!value) {
    throw new Error(
      'Falta DATABASE_URL. Usa la URI del Transaction pooler de Supabase (puerto 6543).'
    )
  }
  return value
}

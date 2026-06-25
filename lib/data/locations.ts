import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getDefaultLocationId(
  organizationId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  const { data: defaultLocation, error: defaultError } = await supabase
    .from('locations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .maybeSingle()

  if (!defaultError && defaultLocation?.id) {
    return defaultLocation.id
  }

  const { data: anyLocation, error: anyError } = await supabase
    .from('locations')
    .select('id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (anyError || !anyLocation?.id) {
    return null
  }

  return anyLocation.id
}

export async function getOrCreateDefaultLocationId(
  organizationId: string
): Promise<string | null> {
  const existing = await getDefaultLocationId(organizationId)
  if (existing) return existing

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('locations')
    .insert({
      organization_id: organizationId,
      name: 'Principal',
      is_default: true,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('getOrCreateDefaultLocationId', error)
    return null
  }

  return data.id
}

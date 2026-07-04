import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createDefaultBusinessHours,
  parseBusinessHours,
  parseSocialLinks,
  type OrganizationProfile,
} from '@/lib/organization/profile-types'

export async function getOrganizationProfile(
  organizationId: string
): Promise<OrganizationProfile | null> {
  const supabase = await createSupabaseServerClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle()

  if (orgError || !org) {
    console.error('getOrganizationProfile org', orgError)
    return null
  }

  const { data: settings, error: settingsError } = await supabase
    .from('organization_settings')
    .select(
      'description, location_address, location_lat, location_lng, business_hours, social_links'
    )
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (settingsError) {
    console.error('getOrganizationProfile settings', settingsError)
    return null
  }

  const row = settings as {
    description: string | null
    location_address: string | null
    location_lat: number | null
    location_lng: number | null
    business_hours: unknown
    social_links: unknown
  } | null

  return {
    organizationId: org.id,
    name: org.name,
    slug: org.slug,
    description: row?.description?.trim() ?? '',
    locationAddress: row?.location_address?.trim() ?? '',
    locationLat: row?.location_lat ?? null,
    locationLng: row?.location_lng ?? null,
    businessHours: parseBusinessHours(row?.business_hours ?? createDefaultBusinessHours()),
    socialLinks: parseSocialLinks(row?.social_links),
  }
}

export async function isOrganizationSlugAvailable(
  slug: string,
  excludeOrganizationId?: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('is_organization_slug_available', {
    p_slug: slug,
    p_exclude_org_id: excludeOrganizationId ?? null,
  })

  if (error) {
    console.error('isOrganizationSlugAvailable', error)
    return false
  }

  return Boolean(data)
}

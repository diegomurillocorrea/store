import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations, organizationSettings } from '@/lib/db/schema'
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
  try {
    const [[org], [settings]] = await Promise.all([
      db
        .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
      db
        .select({
          description: organizationSettings.description,
          locationAddress: organizationSettings.locationAddress,
          locationLat: organizationSettings.locationLat,
          locationLng: organizationSettings.locationLng,
          businessHours: organizationSettings.businessHours,
          socialLinks: organizationSettings.socialLinks,
        })
        .from(organizationSettings)
        .where(eq(organizationSettings.organizationId, organizationId))
        .limit(1),
    ])

    if (!org) return null

    return {
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      description: settings?.description?.trim() ?? '',
      locationAddress: settings?.locationAddress?.trim() ?? '',
      locationLat: settings?.locationLat ?? null,
      locationLng: settings?.locationLng ?? null,
      businessHours: parseBusinessHours(settings?.businessHours ?? createDefaultBusinessHours()),
      socialLinks: parseSocialLinks(settings?.socialLinks),
    }
  } catch (err) {
    console.error('getOrganizationProfile', err)
    return null
  }
}

// Stays on Supabase: uses auth.uid()-scoped RPC is_organization_slug_available
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

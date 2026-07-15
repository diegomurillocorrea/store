import { cache } from 'react'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getMemberPermissionCodes } from '@/lib/data/member-permissions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  timezone: string
}

export interface OrgMemberAccess {
  organization: OrganizationRow
  memberId: string
  permissions: Set<string>
}

export interface MembershipWithOrg {
  memberId: string
  status: string
  organization: OrganizationRow
}

export async function getMyOrganizations(): Promise<MembershipWithOrg[]> {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(
      `
      id,
      status,
      organizations (
        id,
        name,
        slug
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMyOrganizations', error)
    return []
  }

  type RawRow = {
    id: string
    status: string
    organizations: OrganizationRow | OrganizationRow[] | null
  }

  const rows = (data ?? []) as unknown as RawRow[]

  return rows
    .map((r) => {
      const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations
      if (!org) return null
      return {
        memberId: r.id,
        status: r.status,
        organization: org,
      }
    })
    .filter((x): x is MembershipWithOrg => x !== null)
}

export async function getOrgAccessBySlug(slug: string): Promise<{
  organization: OrganizationRow
} | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createSupabaseServerClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, timezone')
    .eq('slug', slug)
    .maybeSingle()

  if (orgError || !org) {
    return null
  }

  const { data: member, error: memError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (memError || !member) {
    return null
  }

  return { organization: org as OrganizationRow }
}

/** Deduplica layout + requireViewAccess en el mismo request RSC. */
export const getOrgMemberAccess = cache(async function getOrgMemberAccess (
  slug: string
): Promise<OrgMemberAccess | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createSupabaseServerClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, timezone')
    .eq('slug', slug)
    .maybeSingle()

  if (orgError || !org) {
    return null
  }

  const { data: member, error: memError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (memError || !member) {
    return null
  }

  const permissions = await getMemberPermissionCodes(member.id)

  return {
    organization: org as OrganizationRow,
    memberId: member.id,
    permissions,
  }
})

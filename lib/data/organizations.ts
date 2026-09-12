import { cache } from 'react'
import { and, asc, eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getMemberPermissionCodes } from '@/lib/data/member-permissions'
import { db } from '@/lib/db'
import { organizationMembers, organizations } from '@/lib/db/schema'

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

export async function getMyOrganizations (): Promise<MembershipWithOrg[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const rows = await db
    .select({
      memberId: organizationMembers.id,
      status: organizationMembers.status,
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgTimezone: organizations.timezone,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, user.id))
    .orderBy(asc(organizationMembers.createdAt))

  return rows.map((r) => ({
    memberId: r.memberId,
    status: r.status,
    organization: {
      id: r.orgId,
      name: r.orgName,
      slug: r.orgSlug,
      timezone: r.orgTimezone,
    },
  }))
}

export async function getOrgAccessBySlug (slug: string): Promise<{
  organization: OrganizationRow
} | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!org) return null

  const [member] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, org.id),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, 'active')
      )
    )
    .limit(1)

  if (!member) return null

  return { organization: org }
}

/** Deduplica layout + requireViewAccess en el mismo request RSC. */
export const getOrgMemberAccess = cache(async function getOrgMemberAccess (
  slug: string
): Promise<OrgMemberAccess | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!org) return null

  const [member] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, org.id),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, 'active')
      )
    )
    .limit(1)

  if (!member) return null

  const permissions = await getMemberPermissionCodes(member.id)

  return {
    organization: org,
    memberId: member.id,
    permissions,
  }
})

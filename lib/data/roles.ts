import { and, eq, inArray } from 'drizzle-orm'
import {
  ASSIGNABLE_EMPLOYEE_ROLE_SLUGS,
  ROLE_SLUGS,
  SYSTEM_ROLE_SLUGS,
  type RoleSlug,
} from '@/lib/permissions/views'
import { db } from '@/lib/db'
import { roles } from '@/lib/db/schema'

export interface RoleOption {
  id: string
  name: string
  slug: RoleSlug
}

function sortRolesBySystemOrder<T extends { slug: string }> (roles: T[]): T[] {
  return [...roles].sort(
    (a, b) =>
      SYSTEM_ROLE_SLUGS.indexOf(a.slug as RoleSlug) -
      SYSTEM_ROLE_SLUGS.indexOf(b.slug as RoleSlug)
  )
}

export async function getRolesByOrganizationId (
  organizationId: string
): Promise<RoleOption[]> {
  const rows = await db
    .select({ id: roles.id, name: roles.name, slug: roles.slug })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, organizationId),
        inArray(roles.slug, [...SYSTEM_ROLE_SLUGS])
      )
    )

  const filtered = rows.filter((row): row is RoleOption =>
    SYSTEM_ROLE_SLUGS.includes(row.slug as RoleSlug)
  )

  return sortRolesBySystemOrder(filtered)
}

export async function getAssignableEmployeeRolesByOrganizationId (
  organizationId: string
): Promise<RoleOption[]> {
  const all = await getRolesByOrganizationId(organizationId)
  return all.filter((role) => ASSIGNABLE_EMPLOYEE_ROLE_SLUGS.includes(role.slug))
}

export async function getPropietarioRoleByOrganizationId (
  organizationId: string
): Promise<RoleOption | null> {
  const all = await getRolesByOrganizationId(organizationId)
  return all.find((role) => role.slug === ROLE_SLUGS.propietario) ?? null
}

export async function isAssignableEmployeeRoleForOrganization (
  organizationId: string,
  roleId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.id, roleId),
        eq(roles.organizationId, organizationId),
        inArray(roles.slug, [...ASSIGNABLE_EMPLOYEE_ROLE_SLUGS])
      )
    )
    .limit(1)

  return rows.length > 0
}

export async function isPropietarioRoleForOrganization (
  organizationId: string,
  roleId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.id, roleId),
        eq(roles.organizationId, organizationId),
        eq(roles.slug, ROLE_SLUGS.propietario)
      )
    )
    .limit(1)

  return rows.length > 0
}

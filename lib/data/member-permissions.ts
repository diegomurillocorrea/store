import { cache } from 'react'
import { and, asc, count, eq, inArray } from 'drizzle-orm'
import {
  buildPermissionCode,
  getAllViewPermissionCodes,
  PERMISSION_ACTIONS,
  PERMISSION_VIEWS,
  ROLE_SLUGS,
  SYSTEM_ROLE_SLUGS,
  isLockedRoleSlug,
  isManageableByPropietarioRoleSlug,
  type PermissionAction,
  type RoleSlug,
} from '@/lib/permissions/views'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { memberRoles, rolePermissions, roles } from '@/lib/db/schema'
import type { OrganizationRow } from '@/lib/data/organizations'

export interface RoleWithPermissions {
  id: string
  name: string
  slug: string
  isSystem: boolean
  permissions: Set<string>
}

export interface RolesPermissionsSnapshot {
  roles: RoleWithPermissions[]
  allPermissionCodes: string[]
}

export const getMemberPermissionCodes = cache(async function getMemberPermissionCodes (
  memberId: string
): Promise<Set<string>> {
  const memberRoleRows = await db
    .select({ roleId: memberRoles.roleId })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))

  const roleIds = memberRoleRows.map((r) => r.roleId)
  if (roleIds.length === 0) return new Set()

  const [roleRows, permRows] = await Promise.all([
    db.select({ id: roles.id, slug: roles.slug }).from(roles).where(inArray(roles.id, roleIds)),
    db
      .select({ permissionCode: rolePermissions.permissionCode })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds)),
  ])

  const codes = new Set(permRows.map((r) => r.permissionCode))

  if (roleRows.some((role) => role.slug === ROLE_SLUGS.propietario)) {
    for (const code of getAllViewPermissionCodes()) {
      codes.add(code)
    }
  }

  return codes
})

export async function memberHasRoleSlug (
  memberId: string,
  organizationId: string,
  roleSlug: RoleSlug
): Promise<boolean> {
  const memberRoleRows = await db
    .select({ roleId: memberRoles.roleId })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))

  if (!memberRoleRows.length) return false

  const roleIds = memberRoleRows.map((r) => r.roleId)

  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, organizationId),
        eq(roles.slug, roleSlug),
        inArray(roles.id, roleIds)
      )
    )
    .limit(1)

  return rows.length > 0
}

export async function isMemberPropietario (
  memberId: string,
  organizationId: string
): Promise<boolean> {
  return memberHasRoleSlug(memberId, organizationId, ROLE_SLUGS.propietario)
}

export async function getRolesPermissionsByOrganizationId (
  organizationId: string
): Promise<RolesPermissionsSnapshot> {
  const roleRows = await db
    .select({ id: roles.id, name: roles.name, slug: roles.slug, isSystem: roles.isSystem })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, organizationId),
        inArray(roles.slug, [...SYSTEM_ROLE_SLUGS])
      )
    )
    .orderBy(asc(roles.name))

  if (roleRows.length === 0) {
    return { roles: [], allPermissionCodes: getAllViewPermissionCodes() }
  }

  const roleIds = roleRows.map((r) => r.id)

  const permRows = await db
    .select({ roleId: rolePermissions.roleId, permissionCode: rolePermissions.permissionCode })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleId, roleIds))

  const permissionsByRole = new Map<string, Set<string>>()
  for (const row of permRows) {
    const current = permissionsByRole.get(row.roleId) ?? new Set<string>()
    current.add(row.permissionCode)
    permissionsByRole.set(row.roleId, current)
  }

  return {
    roles: roleRows.map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      isSystem: role.isSystem,
      permissions: permissionsByRole.get(role.id) ?? new Set<string>(),
    })),
    allPermissionCodes: getAllViewPermissionCodes(),
  }
}

export async function updateRolePermissions (
  organizationId: string,
  roleId: string,
  permissionCodes: string[]
): Promise<{ error: string | null }> {
  const allowedCodes = new Set(getAllViewPermissionCodes())
  const normalizedCodes = [...new Set(permissionCodes.filter((code) => allowedCodes.has(code)))]

  const roleRows = await db
    .select({ id: roles.id, slug: roles.slug, isSystem: roles.isSystem })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1)

  if (!roleRows.length) {
    return { error: 'Rol no encontrado.' }
  }

  const role = roleRows[0]

  if (isLockedRoleSlug(role.slug)) {
    return { error: 'Los permisos de Propietario no se pueden modificar.' }
  }

  if (!isManageableByPropietarioRoleSlug(role.slug)) {
    return { error: 'Este rol no se puede modificar.' }
  }

  const viewCodes = normalizedCodes.filter((code) =>
    PERMISSION_VIEWS.some((view) => code.startsWith(`${view.id}.`))
  )

  const codesToDelete = PERMISSION_VIEWS.flatMap((view) =>
    PERMISSION_ACTIONS.map((action: PermissionAction) => buildPermissionCode(view.id, action))
  )

  try {
    await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          inArray(rolePermissions.permissionCode, codesToDelete)
        )
      )
  } catch (err) {
    console.error('updateRolePermissions.delete', err)
    return { error: 'No se pudieron actualizar los permisos.' }
  }

  if (viewCodes.length === 0) {
    return { error: null }
  }

  try {
    await db.insert(rolePermissions).values(
      viewCodes.map((permissionCode) => ({ roleId, permissionCode }))
    )
  } catch (err) {
    console.error('updateRolePermissions.insert', err)
    return { error: 'No se pudieron guardar los permisos.' }
  }

  return { error: null }
}

export async function organizationHasSystemRoles (organizationId: string): Promise<boolean> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, organizationId),
        inArray(roles.slug, [...SYSTEM_ROLE_SLUGS])
      )
    )

  return Number(total) >= SYSTEM_ROLE_SLUGS.length
}

export async function ensureOrganizationRolesSeeded (
  organizationId: string
): Promise<void> {
  const hasRoles = await organizationHasSystemRoles(organizationId)
  if (hasRoles) return

  // seed_organization_roles usa auth.uid() internamente — sigue con Supabase RPC
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('seed_organization_roles', {
    p_org_id: organizationId,
  })

  if (error) {
    console.error(
      'ensureOrganizationRolesSeeded',
      error.message ?? error.code ?? JSON.stringify(error)
    )
    return
  }

  if (data !== true) {
    console.error('ensureOrganizationRolesSeeded: respuesta inesperada', data)
  }
}

export type { OrganizationRow }

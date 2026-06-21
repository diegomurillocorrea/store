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

export async function getMemberPermissionCodes(
  memberId: string
): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient()

  const { data: memberRoles, error: rolesError } = await supabase
    .from('member_roles')
    .select('role_id')
    .eq('member_id', memberId)

  if (rolesError) {
    console.error('getMemberPermissionCodes.member_roles', rolesError)
    return new Set()
  }

  const roleIds = (memberRoles ?? []).map((row) => row.role_id)
  if (roleIds.length === 0) {
    return new Set()
  }

  const { data: rolePermissions, error: permError } = await supabase
    .from('role_permissions')
    .select('permission_code')
    .in('role_id', roleIds)

  if (permError) {
    console.error('getMemberPermissionCodes.role_permissions', permError)
    return new Set()
  }

  return new Set((rolePermissions ?? []).map((row) => row.permission_code))
}

export async function memberHasRoleSlug(
  memberId: string,
  organizationId: string,
  roleSlug: RoleSlug
): Promise<boolean> {
  const supabase = await createSupabaseServerClient()

  const { data: memberRoles, error: memberRolesError } = await supabase
    .from('member_roles')
    .select('role_id')
    .eq('member_id', memberId)

  if (memberRolesError || !memberRoles?.length) {
    return false
  }

  const roleIds = memberRoles.map((row) => row.role_id)
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', roleSlug)
    .in('id', roleIds)
    .maybeSingle()

  if (roleError) {
    console.error('memberHasRoleSlug', roleError)
    return false
  }

  return role !== null
}

export async function isMemberPropietario(
  memberId: string,
  organizationId: string
): Promise<boolean> {
  return memberHasRoleSlug(memberId, organizationId, ROLE_SLUGS.propietario)
}

export async function getRolesPermissionsByOrganizationId(
  organizationId: string
): Promise<RolesPermissionsSnapshot> {
  const supabase = await createSupabaseServerClient()

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name, slug, is_system')
    .eq('organization_id', organizationId)
    .in('slug', [...SYSTEM_ROLE_SLUGS])
    .order('name', { ascending: true })

  if (rolesError) {
    console.error('getRolesPermissionsByOrganizationId.roles', rolesError)
    return { roles: [], allPermissionCodes: getAllViewPermissionCodes() }
  }

  const roleIds = (roles ?? []).map((role) => role.id)
  if (roleIds.length === 0) {
    return { roles: [], allPermissionCodes: getAllViewPermissionCodes() }
  }

  const { data: rolePermissions, error: permError } = await supabase
    .from('role_permissions')
    .select('role_id, permission_code')
    .in('role_id', roleIds)

  if (permError) {
    console.error('getRolesPermissionsByOrganizationId.role_permissions', permError)
    return { roles: [], allPermissionCodes: getAllViewPermissionCodes() }
  }

  const permissionsByRole = new Map<string, Set<string>>()
  for (const row of rolePermissions ?? []) {
    const current = permissionsByRole.get(row.role_id) ?? new Set<string>()
    current.add(row.permission_code)
    permissionsByRole.set(row.role_id, current)
  }

  return {
    roles: (roles ?? []).map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      isSystem: role.is_system,
      permissions: permissionsByRole.get(role.id) ?? new Set<string>(),
    })),
    allPermissionCodes: getAllViewPermissionCodes(),
  }
}

export async function updateRolePermissions(
  organizationId: string,
  roleId: string,
  permissionCodes: string[]
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const allowedCodes = new Set(getAllViewPermissionCodes())
  const normalizedCodes = [...new Set(permissionCodes.filter((code) => allowedCodes.has(code)))]

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id, slug, is_system')
    .eq('id', roleId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (roleError || !role) {
    return { error: 'Rol no encontrado.' }
  }

  if (isLockedRoleSlug(role.slug)) {
    return { error: 'Los permisos de Propietario no se pueden modificar.' }
  }

  if (!isManageableByPropietarioRoleSlug(role.slug)) {
    return { error: 'Este rol no se puede modificar.' }
  }

  const viewCodes = normalizedCodes.filter((code) => PERMISSION_VIEWS.some((view) => code.startsWith(`${view.id}.`)))

  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .in(
      'permission_code',
      PERMISSION_VIEWS.flatMap((view) =>
        PERMISSION_ACTIONS.map((action: PermissionAction) => buildPermissionCode(view.id, action))
      )
    )

  if (deleteError) {
    console.error('updateRolePermissions.delete', deleteError)
    return { error: 'No se pudieron actualizar los permisos.' }
  }

  if (viewCodes.length === 0) {
    return { error: null }
  }

  const { error: insertError } = await supabase.from('role_permissions').insert(
    viewCodes.map((permissionCode) => ({
      role_id: roleId,
      permission_code: permissionCode,
    }))
  )

  if (insertError) {
    console.error('updateRolePermissions.insert', insertError)
    return { error: 'No se pudieron guardar los permisos.' }
  }

  return { error: null }
}

export async function organizationHasSystemRoles(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()

  const { count, error } = await supabase
    .from('roles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('slug', [...SYSTEM_ROLE_SLUGS])

  if (error) {
    console.error('organizationHasSystemRoles', error.message ?? error)
    return false
  }

  return (count ?? 0) >= SYSTEM_ROLE_SLUGS.length
}

export async function ensureOrganizationRolesSeeded(
  organizationId: string
): Promise<void> {
  const hasRoles = await organizationHasSystemRoles(organizationId)
  if (hasRoles) {
    return
  }

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

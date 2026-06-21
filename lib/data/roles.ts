import {
  ASSIGNABLE_EMPLOYEE_ROLE_SLUGS,
  ROLE_SLUGS,
  SYSTEM_ROLE_SLUGS,
  type RoleSlug,
} from '@/lib/permissions/views'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface RoleOption {
  id: string
  name: string
  slug: RoleSlug
}

function sortRolesBySystemOrder<T extends { slug: string }>(roles: T[]): T[] {
  return [...roles].sort(
    (a, b) =>
      SYSTEM_ROLE_SLUGS.indexOf(a.slug as RoleSlug) -
      SYSTEM_ROLE_SLUGS.indexOf(b.slug as RoleSlug)
  )
}

export async function getRolesByOrganizationId(
  organizationId: string
): Promise<RoleOption[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('roles')
    .select('id, name, slug')
    .eq('organization_id', organizationId)
    .in('slug', [...SYSTEM_ROLE_SLUGS])

  if (error) {
    console.error('getRolesByOrganizationId', error)
    return []
  }

  const roles = (data ?? []).filter((row): row is RoleOption =>
    SYSTEM_ROLE_SLUGS.includes(row.slug as RoleSlug)
  )

  return sortRolesBySystemOrder(roles)
}

export async function getAssignableEmployeeRolesByOrganizationId(
  organizationId: string
): Promise<RoleOption[]> {
  const roles = await getRolesByOrganizationId(organizationId)
  return roles.filter((role) => ASSIGNABLE_EMPLOYEE_ROLE_SLUGS.includes(role.slug))
}

export async function getPropietarioRoleByOrganizationId(
  organizationId: string
): Promise<RoleOption | null> {
  const roles = await getRolesByOrganizationId(organizationId)
  return roles.find((role) => role.slug === ROLE_SLUGS.propietario) ?? null
}

export async function isAssignableEmployeeRoleForOrganization(
  organizationId: string,
  roleId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .eq('organization_id', organizationId)
    .in('slug', [...ASSIGNABLE_EMPLOYEE_ROLE_SLUGS])
    .maybeSingle()

  if (error || !data) {
    return false
  }

  return true
}

export async function isPropietarioRoleForOrganization(
  organizationId: string,
  roleId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .eq('organization_id', organizationId)
    .eq('slug', ROLE_SLUGS.propietario)
    .maybeSingle()

  if (error || !data) {
    return false
  }

  return true
}

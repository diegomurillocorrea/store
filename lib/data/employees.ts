import type { EmployeeRow, EmployeeStatus } from '@/lib/data/employee-types'
import { SYSTEM_ROLE_SLUGS, type RoleSlug } from '@/lib/permissions/views'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type { EmployeeRow, EmployeeStatus } from '@/lib/data/employee-types'
export {
  EMPLOYEE_STATUS_LABELS,
  getEmployeeFullName,
} from '@/lib/data/employee-types'

interface RawEmployeeRow {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  status: EmployeeStatus
  role_id: string | null
  created_at: string
  created_by: string | null
  role: { name: string; slug: string } | { name: string; slug: string }[] | null
  creator: { display_name: string | null } | { display_name: string | null }[] | null
}

function mapEmployeeRow(row: RawEmployeeRow): EmployeeRow {
  const role = Array.isArray(row.role) ? row.role[0] : row.role
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    roleId: row.role_id,
    roleName: role?.name?.trim() || null,
    roleSlug: SYSTEM_ROLE_SLUGS.includes(role?.slug as RoleSlug)
      ? (role?.slug as RoleSlug)
      : null,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: creator?.display_name?.trim() || null,
  }
}

export async function getEmployeesByOrganizationId(
  organizationId: string
): Promise<EmployeeRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      id,
      first_name,
      last_name,
      phone,
      email,
      status,
      role_id,
      created_at,
      created_by,
      role:roles!employees_role_id_fkey ( name, slug ),
      creator:organization_members!employees_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })

  if (error) {
    console.error('getEmployeesByOrganizationId', error.message, error.code, error.hint)
    return []
  }

  return (data ?? []).map((row) => mapEmployeeRow(row as unknown as RawEmployeeRow))
}

export async function getEmployeeFullNameByMemberId(
  organizationId: string,
  memberId: string | null | undefined
): Promise<string | null> {
  if (!memberId?.trim()) return null

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('member_employee_full_name', {
    p_organization_id: organizationId,
    p_member_id: memberId,
  })

  if (error) {
    console.error('getEmployeeFullNameByMemberId', error)
    return null
  }

  const name = typeof data === 'string' ? data.trim() : ''
  return name.length > 0 ? name : null
}

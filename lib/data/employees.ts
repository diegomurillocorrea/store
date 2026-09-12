import { asc, eq } from 'drizzle-orm'
import type { EmployeeRow, EmployeeStatus } from '@/lib/data/employee-types'
import { SYSTEM_ROLE_SLUGS, type RoleSlug } from '@/lib/permissions/views'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { employees, organizationMembers, roles } from '@/lib/db/schema'

export type { EmployeeRow, EmployeeStatus } from '@/lib/data/employee-types'
export {
  EMPLOYEE_STATUS_LABELS,
  getEmployeeFullName,
} from '@/lib/data/employee-types'

export async function getEmployeesByOrganizationId (
  organizationId: string
): Promise<EmployeeRow[]> {
  const rows = await db
    .select({
      id: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      phone: employees.phone,
      email: employees.email,
      status: employees.status,
      roleId: employees.roleId,
      createdAt: employees.createdAt,
      createdBy: employees.createdBy,
      roleName: roles.name,
      roleSlug: roles.slug,
      creatorDisplayName: organizationMembers.displayName,
    })
    .from(employees)
    .leftJoin(roles, eq(employees.roleId, roles.id))
    .leftJoin(organizationMembers, eq(employees.createdBy, organizationMembers.id))
    .where(eq(employees.organizationId, organizationId))
    .orderBy(asc(employees.firstName), asc(employees.lastName))

  return rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    status: row.status as EmployeeStatus,
    roleId: row.roleId,
    roleName: row.roleName?.trim() || null,
    roleSlug: SYSTEM_ROLE_SLUGS.includes(row.roleSlug as RoleSlug)
      ? (row.roleSlug as RoleSlug)
      : null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    createdByName: row.creatorDisplayName?.trim() || null,
  }))
}

export async function getEmployeeFullNameByMemberId (
  organizationId: string,
  memberId: string | null | undefined
): Promise<string | null> {
  if (!memberId?.trim()) return null

  // member_employee_full_name usa auth.uid() internamente — sigue con Supabase RPC
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

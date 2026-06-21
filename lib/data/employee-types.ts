import { ROLE_SLUGS, type RoleSlug } from '@/lib/permissions/views'
import type { RoleOption } from '@/lib/data/roles'

export type EmployeeStatus = 'active' | 'inactive'

export interface EmployeeRow {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  status: EmployeeStatus
  roleId: string | null
  roleName: string | null
  roleSlug: RoleSlug | null
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
}

export function getEmployeeFullName(
  employee: Pick<EmployeeRow, 'firstName' | 'lastName'>
): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim()
}

export function isPropietarioEmployee(
  employee: Pick<EmployeeRow, 'roleId' | 'roleSlug'>,
  propietarioRole?: RoleOption | null
): boolean {
  if (employee.roleSlug === ROLE_SLUGS.propietario) return true
  if (propietarioRole && employee.roleId === propietarioRole.id) return true
  return false
}

export function getLockedPropietarioRole(
  employee: Pick<EmployeeRow, 'roleId' | 'roleName' | 'roleSlug'>,
  propietarioRole?: RoleOption | null
): RoleOption | null {
  if (!isPropietarioEmployee(employee, propietarioRole)) return null

  if (propietarioRole) return propietarioRole

  if (employee.roleId) {
    return {
      id: employee.roleId,
      name: employee.roleName?.trim() || 'Propietario',
      slug: ROLE_SLUGS.propietario,
    }
  }

  return null
}

'use server'

import { revalidatePath } from 'next/cache'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import type { EmployeeStatus } from '@/lib/data/employee-types'
import {
  isAssignableEmployeeRoleForOrganization,
  isPropietarioRoleForOrganization,
} from '@/lib/data/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parsePhoneFormValue } from '@/lib/utils/phone'

export interface EmployeeFormState {
  error: string | null
  ok: boolean
}

interface ParsedEmployeeForm {
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  status: EmployeeStatus
  roleId: string | null
}

const EMPLOYEE_STATUSES: EmployeeStatus[] = ['active', 'inactive']

function parseEmployeeForm(formData: FormData): { error: string } | ParsedEmployeeForm {
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()
  const emailRaw = String(formData.get('email') ?? '').trim()
  const statusRaw = String(formData.get('status') ?? 'active').trim()
  const roleIdRaw = String(formData.get('roleId') ?? '').trim()

  if (firstName.length < 2) {
    return { error: 'Los nombres son obligatorios (mín. 2 caracteres).' }
  }

  if (lastName.length < 2) {
    return { error: 'Los apellidos son obligatorios (mín. 2 caracteres).' }
  }

  if (!EMPLOYEE_STATUSES.includes(statusRaw as EmployeeStatus)) {
    return { error: 'El estado seleccionado no es válido.' }
  }

  const parsedPhone = parsePhoneFormValue(phoneRaw)
  if ('error' in parsedPhone) {
    return { error: parsedPhone.error }
  }

  const email = emailRaw.length > 0 ? emailRaw : null
  const roleId = roleIdRaw.length > 0 ? roleIdRaw : null

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El correo electrónico no es válido.' }
  }

  return {
    firstName,
    lastName,
    phone: parsedPhone.phone,
    email,
    status: statusRaw as EmployeeStatus,
    roleId,
  }
}

async function validateRoleForCreate(
  organizationId: string,
  roleId: string | null
): Promise<string | null> {
  if (!roleId) return null

  const isValid = await isAssignableEmployeeRoleForOrganization(organizationId, roleId)
  if (!isValid) {
    return 'El rol seleccionado no es válido para empleados.'
  }

  return null
}

async function validateRoleForUpdate(
  organizationId: string,
  employeeId: string,
  roleId: string | null
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  const { data: employee, error } = await supabase
    .from('employees')
    .select('role_id')
    .eq('id', employeeId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error || !employee) {
    return 'Empleado no encontrado.'
  }

  if (employee.role_id && (await isPropietarioRoleForOrganization(organizationId, employee.role_id))) {
    if (roleId !== employee.role_id) {
      return 'El rol Propietario no se puede modificar.'
    }
    return null
  }

  if (roleId && (await isPropietarioRoleForOrganization(organizationId, roleId))) {
    return 'No se puede asignar el rol Propietario.'
  }

  if (!roleId) return null

  const isValid = await isAssignableEmployeeRoleForOrganization(organizationId, roleId)
  if (!isValid) {
    return 'El rol seleccionado no es válido para empleados.'
  }

  return null
}

export async function createEmployeeAction(
  orgSlug: string,
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const access = await getActionAccess(orgSlug, 'empleados', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseEmployeeForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const roleError = await validateRoleForCreate(access.organization.id, parsed.roleId)
  if (roleError) {
    return { error: roleError, ok: false }
  }

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from('employees').insert({
    organization_id: access.organization.id,
    first_name: parsed.firstName,
    last_name: parsed.lastName,
    phone: parsed.phone,
    email: parsed.email,
    status: parsed.status,
    role_id: parsed.roleId,
    created_by: memberId,
  })

  if (error) {
    return { error: error.message || 'No se pudo crear el empleado.', ok: false }
  }

  revalidatePath(`/${orgSlug}/empleados`)
  return { error: null, ok: true }
}

export async function updateEmployeeAction(
  orgSlug: string,
  employeeId: string,
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const access = await getActionAccess(orgSlug, 'empleados', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseEmployeeForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const roleError = await validateRoleForUpdate(
    access.organization.id,
    employeeId,
    parsed.roleId
  )
  if (roleError) {
    return { error: roleError, ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('employees')
    .update({
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      phone: parsed.phone,
      email: parsed.email,
      status: parsed.status,
      role_id: parsed.roleId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)
    .eq('organization_id', access.organization.id)

  if (error) {
    return { error: error.message || 'No se pudo actualizar el empleado.', ok: false }
  }

  revalidatePath(`/${orgSlug}/empleados`)
  return { error: null, ok: true }
}

export async function deleteEmployeeAction(
  orgSlug: string,
  employeeId: string,
  _prevState: EmployeeFormState,
  _formData: FormData
): Promise<EmployeeFormState> {
  const access = await getActionAccess(orgSlug, 'empleados', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)
    .eq('organization_id', access.organization.id)

  if (error) {
    return { error: error.message || 'No se pudo eliminar el empleado.', ok: false }
  }

  revalidatePath(`/${orgSlug}/empleados`)
  return { error: null, ok: true }
}

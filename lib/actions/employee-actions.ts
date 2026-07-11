'use server'

import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import type { EmployeeStatus } from '@/lib/data/employee-types'
import {
  getCreateFanOutTargets,
  newOwnerSharedKey,
  resolveRoleIdBySlugInOrg,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import {
  isAssignableEmployeeRoleForOrganization,
  isPropietarioRoleForOrganization,
} from '@/lib/data/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parsePhoneFormValue } from '@/lib/utils/phone'
import { revalidatePath } from 'next/cache'

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

interface ParsedCreateEmployeeForm extends ParsedEmployeeForm {
  email: string
  password: string
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

function parseCreateEmployeeForm(
  formData: FormData
): { error: string } | ParsedCreateEmployeeForm {
  const parsed = parseEmployeeForm(formData)
  if ('error' in parsed) {
    return parsed
  }

  if (!parsed.email) {
    return { error: 'El correo electrónico es obligatorio para crear el acceso.' }
  }

  const password = String(formData.get('password') ?? '')
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  return {
    ...parsed,
    email: parsed.email,
    password,
  }
}

function employeeDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

function memberStatusFromEmployee(status: EmployeeStatus): 'active' | 'suspended' {
  return status === 'active' ? 'active' : 'suspended'
}

async function ensureEmployeeMembership(
  organizationId: string,
  userId: string,
  displayName: string,
  status: EmployeeStatus,
  roleId: string | null
): Promise<{ error: string } | { memberId: string }> {
  const supabase = await createSupabaseServerClient()

  const { data: existing, error: existingError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) {
    return { error: existingError.message || 'No se pudo verificar la membresía.' }
  }

  let memberId = existing?.id ?? null

  if (!memberId) {
    const { data: created, error: createError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        status: memberStatusFromEmployee(status),
        display_name: displayName || null,
      })
      .select('id')
      .single()

    if (createError || !created) {
      return { error: createError?.message || 'No se pudo registrar la membresía.' }
    }

    memberId = created.id
  } else {
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({
        status: memberStatusFromEmployee(status),
        display_name: displayName || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (updateError) {
      return { error: updateError.message || 'No se pudo actualizar la membresía.' }
    }
  }

  if (roleId) {
    const { error: roleError } = await supabase.from('member_roles').upsert(
      { member_id: memberId, role_id: roleId },
      { onConflict: 'member_id,role_id' }
    )

    if (roleError) {
      return { error: roleError.message || 'No se pudo asignar el rol al usuario.' }
    }
  }

  return { memberId }
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

  const parsed = parseCreateEmployeeForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const roleError = await validateRoleForCreate(access.organization.id, parsed.roleId)
  if (roleError) {
    return { error: roleError, ok: false }
  }

  const targets = await getCreateFanOutTargets(access.organization.id)
  if (targets.length === 0) {
    return { error: 'No se pudo resolver la sucursal actual.', ok: false }
  }

  const displayName = employeeDisplayName(parsed.firstName, parsed.lastName)
  const sharedKey = newOwnerSharedKey()
  const supabase = await createSupabaseServerClient()

  const { data: userId, error: authError } = await supabase.rpc('create_confirmed_auth_user', {
    p_email: parsed.email,
    p_password: parsed.password,
    p_full_name: displayName,
  })

  if (authError || !userId) {
    const message = authError?.message || 'No se pudo crear el usuario del empleado.'
    if (message.includes('Ya existe un usuario')) {
      return { error: 'Ya existe un usuario con ese correo electrónico.', ok: false }
    }
    return { error: message, ok: false }
  }

  for (const target of targets) {
    const roleId =
      target.organizationId === access.organization.id
        ? parsed.roleId
        : await resolveRoleIdBySlugInOrg(
          target.organizationId,
          parsed.roleId,
          access.organization.id
        )

    const membership = await ensureEmployeeMembership(
      target.organizationId,
      userId as string,
      displayName,
      parsed.status,
      roleId
    )

    if ('error' in membership) {
      return { error: membership.error, ok: false }
    }

    const { error } = await supabase.from('employees').insert({
      organization_id: target.organizationId,
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      phone: parsed.phone,
      email: parsed.email,
      status: parsed.status,
      role_id: roleId,
      user_id: userId as string,
      owner_shared_key: sharedKey,
      created_by: target.memberId,
    })

    if (error) {
      return { error: error.message || 'No se pudo crear el empleado.', ok: false }
    }
  }

  revalidateCatalogPaths(targets, 'employees', orgSlug)
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

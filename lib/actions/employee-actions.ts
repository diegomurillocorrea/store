'use server'

import { and, eq } from 'drizzle-orm'
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
import { db } from '@/lib/db'
import { employees, memberRoles, organizationMembers } from '@/lib/db/schema'
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

function parseEmployeeForm (formData: FormData): { error: string } | ParsedEmployeeForm {
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

function parseCreateEmployeeForm (
  formData: FormData
): { error: string } | ParsedCreateEmployeeForm {
  const parsed = parseEmployeeForm(formData)
  if ('error' in parsed) return parsed

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

function employeeDisplayName (firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

function memberStatusFromEmployee (status: EmployeeStatus): 'active' | 'suspended' {
  return status === 'active' ? 'active' : 'suspended'
}

async function ensureEmployeeMembership (
  organizationId: string,
  userId: string,
  displayName: string,
  status: EmployeeStatus,
  roleId: string | null
): Promise<{ error: string } | { memberId: string }> {
  const [existing] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1)

  let memberId = existing?.id ?? null

  if (!memberId) {
    try {
      const [created] = await db
        .insert(organizationMembers)
        .values({
          organizationId,
          userId,
          status: memberStatusFromEmployee(status),
          displayName: displayName || null,
        })
        .returning({ id: organizationMembers.id })

      if (!created) {
        return { error: 'No se pudo registrar la membresía.' }
      }
      memberId = created.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar la membresía.'
      return { error: msg }
    }
  } else {
    try {
      await db
        .update(organizationMembers)
        .set({
          status: memberStatusFromEmployee(status),
          displayName: displayName || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(organizationMembers.id, memberId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la membresía.'
      return { error: msg }
    }
  }

  if (roleId) {
    try {
      await db
        .insert(memberRoles)
        .values({ memberId, roleId })
        .onConflictDoNothing()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo asignar el rol al usuario.'
      return { error: msg }
    }
  }

  return { memberId }
}

async function validateRoleForCreate (
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

async function validateRoleForUpdate (
  organizationId: string,
  employeeId: string,
  roleId: string | null
): Promise<string | null> {
  const [employee] = await db
    .select({ roleId: employees.roleId })
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)))
    .limit(1)

  if (!employee) {
    return 'Empleado no encontrado.'
  }

  if (employee.roleId && (await isPropietarioRoleForOrganization(organizationId, employee.roleId))) {
    if (roleId !== employee.roleId) {
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

export async function createEmployeeAction (
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

  // create_confirmed_auth_user crea usuario en auth — sigue con Supabase RPC
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

    try {
      await db.insert(employees).values({
        organizationId: target.organizationId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        email: parsed.email,
        status: parsed.status,
        roleId,
        userId: userId as string,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear el empleado.'
      return { error: msg, ok: false }
    }
  }

  revalidateCatalogPaths(targets, 'employees', orgSlug)
  return { error: null, ok: true }
}

export async function updateEmployeeAction (
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

  try {
    await db
      .update(employees)
      .set({
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        email: parsed.email,
        status: parsed.status,
        roleId: parsed.roleId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.organizationId, access.organization.id)
        )
      )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo actualizar el empleado.'
    return { error: msg, ok: false }
  }

  revalidatePath(`/${orgSlug}/empleados`)
  return { error: null, ok: true }
}

export async function deleteEmployeeAction (
  orgSlug: string,
  employeeId: string,
  _prevState: EmployeeFormState,
  _formData: FormData
): Promise<EmployeeFormState> {
  const access = await getActionAccess(orgSlug, 'empleados', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  try {
    await db
      .delete(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.organizationId, access.organization.id)
        )
      )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo eliminar el empleado.'
    return { error: msg, ok: false }
  }

  revalidatePath(`/${orgSlug}/empleados`)
  return { error: null, ok: true }
}

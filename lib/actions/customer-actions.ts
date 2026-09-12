'use server'

import { and, eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  getCreateFanOutTargets,
  newOwnerSharedKey,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { parsePhoneFormValue } from '@/lib/utils/phone'
import { revalidatePath } from 'next/cache'

export interface CustomerFormState {
  error: string | null
  ok: boolean
}

interface ParsedCustomerForm {
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
}

function mapDbError (error: unknown, fallback: string): string {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } }
  const code = err.code ?? err.cause?.code
  if (code === '23503') {
    return 'No se puede eliminar: el cliente tiene ventas o cuentas por cobrar asociadas.'
  }
  return err.message ?? err.cause?.message ?? fallback
}

function parseCustomerForm (formData: FormData): { error: string } | ParsedCustomerForm {
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()
  const emailRaw = String(formData.get('email') ?? '').trim()

  if (firstName.length < 2) {
    return { error: 'Los nombres son obligatorios (mín. 2 caracteres).' }
  }

  if (lastName.length < 2) {
    return { error: 'Los apellidos son obligatorios (mín. 2 caracteres).' }
  }

  const parsedPhone = parsePhoneFormValue(phoneRaw)
  if ('error' in parsedPhone) {
    return { error: parsedPhone.error }
  }

  const email = emailRaw.length > 0 ? emailRaw : null

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El correo electrónico no es válido.' }
  }

  return { firstName, lastName, phone: parsedPhone.phone, email }
}

export async function createCustomerAction (
  orgSlug: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const access = await getActionAccess(orgSlug, 'clientes', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseCustomerForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const targets = await getCreateFanOutTargets(access.organization.id)
  if (targets.length === 0) {
    return { error: 'No se pudo resolver la sucursal actual.', ok: false }
  }

  const sharedKey = newOwnerSharedKey()

  try {
    for (const target of targets) {
      await db.insert(customers).values({
        organizationId: target.organizationId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        email: parsed.email,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      })
    }
  } catch (error) {
    return { error: mapDbError(error, 'No se pudo crear el cliente.'), ok: false }
  }

  revalidateCatalogPaths(targets, 'customers', orgSlug)
  return { error: null, ok: true }
}

export async function updateCustomerAction (
  orgSlug: string,
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const access = await getActionAccess(orgSlug, 'clientes', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseCustomerForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  try {
    await db
      .update(customers)
      .set({
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        email: parsed.email,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    return { error: mapDbError(error, 'No se pudo actualizar el cliente.'), ok: false }
  }

  revalidatePath(`/${orgSlug}/clientes`)
  return { error: null, ok: true }
}

export async function deleteCustomerAction (
  orgSlug: string,
  customerId: string,
  _prevState: CustomerFormState,
  _formData: FormData
): Promise<CustomerFormState> {
  const access = await getActionAccess(orgSlug, 'clientes', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  try {
    await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    return { error: mapDbError(error, 'No se pudo eliminar el cliente.'), ok: false }
  }

  revalidatePath(`/${orgSlug}/clientes`)
  return { error: null, ok: true }
}

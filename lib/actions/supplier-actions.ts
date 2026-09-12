'use server'

import { and, eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  getCreateFanOutTargets,
  newOwnerSharedKey,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import { db } from '@/lib/db'
import { suppliers } from '@/lib/db/schema'
import { parsePhoneFormValue } from '@/lib/utils/phone'
import { revalidatePath } from 'next/cache'

export interface SupplierFormState {
  error: string | null
  ok: boolean
}

interface ParsedSupplierForm {
  name: string
  phone: string | null
  email: string | null
}

function mapDbError (error: unknown, fallback: string): string {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } }
  const code = err.code ?? err.cause?.code
  if (code === '23503') {
    return 'No se puede eliminar: el proveedor tiene compras o cuentas por pagar asociadas.'
  }
  return err.message ?? err.cause?.message ?? fallback
}

function parseSupplierForm (formData: FormData): { error: string } | ParsedSupplierForm {
  const name = String(formData.get('name') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()
  const emailRaw = String(formData.get('email') ?? '').trim()

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }

  const parsedPhone = parsePhoneFormValue(phoneRaw)
  if ('error' in parsedPhone) {
    return { error: parsedPhone.error }
  }

  const email = emailRaw.length > 0 ? emailRaw : null

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El correo electrónico no es válido.' }
  }

  return { name, phone: parsedPhone.phone, email }
}

export async function createSupplierAction (
  orgSlug: string,
  _prevState: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const access = await getActionAccess(orgSlug, 'proveedores', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseSupplierForm(formData)
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
      await db.insert(suppliers).values({
        organizationId: target.organizationId,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      })
    }
  } catch (error) {
    return { error: mapDbError(error, 'No se pudo crear el proveedor.'), ok: false }
  }

  revalidateCatalogPaths(targets, 'suppliers', orgSlug)
  return { error: null, ok: true }
}

export async function updateSupplierAction (
  orgSlug: string,
  supplierId: string,
  _prevState: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const access = await getActionAccess(orgSlug, 'proveedores', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseSupplierForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  try {
    await db
      .update(suppliers)
      .set({
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    return { error: mapDbError(error, 'No se pudo actualizar el proveedor.'), ok: false }
  }

  revalidatePath(`/${orgSlug}/proveedores`)
  return { error: null, ok: true }
}

export async function deleteSupplierAction (
  orgSlug: string,
  supplierId: string,
  _prevState: SupplierFormState,
  _formData: FormData
): Promise<SupplierFormState> {
  const access = await getActionAccess(orgSlug, 'proveedores', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  try {
    await db
      .delete(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    return { error: mapDbError(error, 'No se pudo eliminar el proveedor.'), ok: false }
  }

  revalidatePath(`/${orgSlug}/proveedores`)
  return { error: null, ok: true }
}

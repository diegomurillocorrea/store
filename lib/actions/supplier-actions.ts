'use server'

import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  getCreateFanOutTargets,
  newOwnerSharedKey,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

function parseSupplierForm(formData: FormData): { error: string } | ParsedSupplierForm {
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

export async function createSupplierAction(
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
  const supabase = await createSupabaseServerClient()

  for (const target of targets) {
    const payload = {
      organization_id: target.organizationId,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      owner_shared_key: sharedKey,
      created_by: target.memberId,
    }

    let { error } = await supabase.from('suppliers').insert(payload)

    if (error?.message?.includes('created_by')) {
      const { created_by: _ignored, ...payloadWithoutCreator } = payload
      ;({ error } = await supabase.from('suppliers').insert(payloadWithoutCreator))
    } else if (error?.message?.includes('owner_shared_key')) {
      const { owner_shared_key: _key, ...payloadWithoutKey } = payload
      ;({ error } = await supabase.from('suppliers').insert(payloadWithoutKey))
    }

    if (error) {
      return { error: error.message || 'No se pudo crear el proveedor.', ok: false }
    }
  }

  revalidateCatalogPaths(targets, 'suppliers', orgSlug)
  return { error: null, ok: true }
}

export async function updateSupplierAction(
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

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('suppliers')
    .update({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supplierId)
    .eq('organization_id', access.organization.id)

  if (error) {
    return { error: error.message || 'No se pudo actualizar el proveedor.', ok: false }
  }

  revalidatePath(`/${orgSlug}/proveedores`)
  return { error: null, ok: true }
}

export async function deleteSupplierAction(
  orgSlug: string,
  supplierId: string,
  _prevState: SupplierFormState,
  _formData: FormData
): Promise<SupplierFormState> {
  const access = await getActionAccess(orgSlug, 'proveedores', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId)
    .eq('organization_id', access.organization.id)

  if (error) {
    const message = error.code === '23503'
      ? 'No se puede eliminar: el proveedor tiene compras o cuentas por pagar asociadas.'
      : error.message || 'No se pudo eliminar el proveedor.'
    return { error: message, ok: false }
  }

  revalidatePath(`/${orgSlug}/proveedores`)
  return { error: null, ok: true }
}

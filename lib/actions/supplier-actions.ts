'use server'

import { revalidatePath } from 'next/cache'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parsePhoneFormValue } from '@/lib/utils/phone'

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

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)

  const supabase = await createSupabaseServerClient()
  const payload = {
    organization_id: access.organization.id,
    name: parsed.name,
    phone: parsed.phone,
    email: parsed.email,
    created_by: memberId,
  }

  let { error } = await supabase.from('suppliers').insert(payload)

  if (error?.message?.includes('created_by')) {
    const { created_by: _ignored, ...payloadWithoutCreator } = payload
    ;({ error } = await supabase.from('suppliers').insert(payloadWithoutCreator))
  }

  if (error) {
    return { error: error.message || 'No se pudo crear el proveedor.', ok: false }
  }

  revalidatePath(`/${orgSlug}/proveedores`)
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

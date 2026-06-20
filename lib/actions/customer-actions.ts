'use server'

import { revalidatePath } from 'next/cache'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

function isMissingCustomerNameColumns(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false

  return (
    error.code === '42703' ||
    error.code === 'PGRST200' ||
    error.code === 'PGRST204' ||
    Boolean(error.message?.includes('first_name')) ||
    Boolean(error.message?.includes('schema cache'))
  )
}

function buildCustomerFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}

function parseCustomerForm(formData: FormData): { error: string } | ParsedCustomerForm {
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

  const phone = phoneRaw.length > 0 ? phoneRaw : null
  const email = emailRaw.length > 0 ? emailRaw : null

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El correo electrónico no es válido.' }
  }

  return { firstName, lastName, phone, email }
}

export async function createCustomerAction(
  orgSlug: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const parsed = parseCustomerForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)

  const supabase = await createSupabaseServerClient()
  const fullName = buildCustomerFullName(parsed.firstName, parsed.lastName)

  let { error } = await supabase.from('customers').insert({
    organization_id: access.organization.id,
    first_name: parsed.firstName,
    last_name: parsed.lastName,
    phone: parsed.phone,
    email: parsed.email,
    created_by: memberId,
  })

  if (isMissingCustomerNameColumns(error)) {
    ;({ error } = await supabase.from('customers').insert({
      organization_id: access.organization.id,
      name: fullName,
      phone: parsed.phone,
      email: parsed.email,
    }))
  } else if (error?.message?.includes('created_by')) {
    ;({ error } = await supabase.from('customers').insert({
      organization_id: access.organization.id,
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      phone: parsed.phone,
      email: parsed.email,
    }))
  }

  if (error) {
    return { error: error.message || 'No se pudo crear el cliente.', ok: false }
  }

  revalidatePath(`/${orgSlug}/clientes`)
  return { error: null, ok: true }
}

export async function updateCustomerAction(
  orgSlug: string,
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const parsed = parseCustomerForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const fullName = buildCustomerFullName(parsed.firstName, parsed.lastName)

  let { error } = await supabase
    .from('customers')
    .update({
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      phone: parsed.phone,
      email: parsed.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('organization_id', access.organization.id)

  if (isMissingCustomerNameColumns(error)) {
    ;({ error } = await supabase
      .from('customers')
      .update({
        name: fullName,
        phone: parsed.phone,
        email: parsed.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('organization_id', access.organization.id))
  }

  if (error) {
    return { error: error.message || 'No se pudo actualizar el cliente.', ok: false }
  }

  revalidatePath(`/${orgSlug}/clientes`)
  return { error: null, ok: true }
}

export async function deleteCustomerAction(
  orgSlug: string,
  customerId: string,
  _prevState: CustomerFormState,
  _formData: FormData
): Promise<CustomerFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('organization_id', access.organization.id)

  if (error) {
    const message = error.code === '23503'
      ? 'No se puede eliminar: el cliente tiene ventas o cuentas por cobrar asociadas.'
      : error.message || 'No se pudo eliminar el cliente.'
    return { error: message, ok: false }
  }

  revalidatePath(`/${orgSlug}/clientes`)
  return { error: null, ok: true }
}

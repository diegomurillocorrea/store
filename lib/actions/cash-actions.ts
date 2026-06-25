'use server'

import { revalidatePath } from 'next/cache'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import {
  getOpenCashSession,
  getOrCreateDefaultCashRegisterId,
} from '@/lib/data/balance'
import { getOrCreateDefaultLocationId } from '@/lib/data/locations'
import { roundMoney } from '@/lib/utils/money'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface CashActionState {
  error: string | null
  ok: boolean
}

const initialSuccess: CashActionState = { error: null, ok: true }
const initialFailure = (message: string): CashActionState => ({
  error: message,
  ok: false,
})

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (value == null || value === '') return 0
  const parsed = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return roundMoney(parsed)
}

export async function openCashSessionAction(
  orgSlug: string,
  _prev: CashActionState,
  formData: FormData
): Promise<CashActionState> {
  const access = await getActionAccess(orgSlug, 'caja', 'create')
  if (!access) return permissionDeniedState()

  const openingAmount = parseAmount(formData.get('openingAmount'))
  if (openingAmount == null) {
    return initialFailure('El monto de apertura no es válido.')
  }

  const existing = await getOpenCashSession(access.organization.id)
  if (existing) {
    return initialFailure('Ya hay una caja abierta. Ciérrala antes de abrir otra.')
  }

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  if (!memberId) {
    return initialFailure('No se pudo identificar al usuario activo.')
  }

  const locationId = await getOrCreateDefaultLocationId(access.organization.id)
  const registerId = await getOrCreateDefaultCashRegisterId(
    access.organization.id,
    locationId
  )

  if (!registerId) {
    return initialFailure('No se pudo preparar la caja registradora.')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('cash_sessions').insert({
    organization_id: access.organization.id,
    cash_register_id: registerId,
    status: 'open',
    opening_amount: openingAmount,
    opened_by: memberId,
    notes: String(formData.get('notes') ?? '').trim() || null,
  })

  if (error) {
    console.error('openCashSessionAction', error)
    return initialFailure('No se pudo abrir la caja.')
  }

  revalidatePath(`/${orgSlug}/caja`)
  return initialSuccess
}

export async function closeCashSessionAction(
  orgSlug: string,
  _prev: CashActionState,
  formData: FormData
): Promise<CashActionState> {
  const access = await getActionAccess(orgSlug, 'caja', 'delete')
  if (!access) return permissionDeniedState()

  const closingAmount = parseAmount(formData.get('closingAmount'))
  if (closingAmount == null) {
    return initialFailure('El monto de cierre no es válido.')
  }

  const session = await getOpenCashSession(access.organization.id)
  if (!session) {
    return initialFailure('No hay una caja abierta para cerrar.')
  }

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  if (!memberId) {
    return initialFailure('No se pudo identificar al usuario activo.')
  }

  const difference = roundMoney(closingAmount - session.openingAmount)
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('cash_sessions')
    .update({
      status: 'closed',
      closing_amount: closingAmount,
      difference,
      closed_by: memberId,
      closed_at: new Date().toISOString(),
      notes: String(formData.get('notes') ?? '').trim() || session.notes,
    })
    .eq('id', session.id)
    .eq('organization_id', access.organization.id)
    .eq('status', 'open')

  if (error) {
    console.error('closeCashSessionAction', error)
    return initialFailure('No se pudo cerrar la caja.')
  }

  revalidatePath(`/${orgSlug}/caja`)
  return initialSuccess
}

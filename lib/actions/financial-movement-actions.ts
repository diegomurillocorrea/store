'use server'

import { revalidatePath } from 'next/cache'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import { getOpenCashSession } from '@/lib/data/balance'
import type { FinancialMovementType } from '@/lib/data/financial-movement-types'
import { roundMoney } from '@/lib/utils/money'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface FinancialMovementFormState {
  error: string | null
  ok: boolean
}

const initialSuccess: FinancialMovementFormState = { error: null, ok: true }
const initialFailure = (message: string): FinancialMovementFormState => ({
  error: message,
  ok: false,
})

const allowedMethods = new Set(['cash', 'card', 'transfer', 'other'])

function parseMovementType(value: FormDataEntryValue | null): FinancialMovementType | null {
  if (value === 'income' || value === 'expense') return value
  return null
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (value == null || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return roundMoney(parsed)
}

function parseDate(value: FormDataEntryValue | null): string | null {
  const date = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (Number.isNaN(Date.parse(date))) return null
  return date
}

export async function createFinancialMovementAction(
  orgSlug: string,
  _prev: FinancialMovementFormState,
  formData: FormData
): Promise<FinancialMovementFormState> {
  const access = await getActionAccess(orgSlug, 'caja', 'create')
  if (!access) return permissionDeniedState()

  const movementType = parseMovementType(formData.get('movementType'))
  if (!movementType) {
    return initialFailure('Tipo de movimiento inválido.')
  }

  const concept = String(formData.get('concept') ?? '').trim()
  if (concept.length < 2) {
    return initialFailure('El concepto debe tener al menos 2 caracteres.')
  }

  const amount = parseAmount(formData.get('amount'))
  if (amount == null) {
    return initialFailure('El monto debe ser mayor a cero.')
  }

  const movementDate = parseDate(formData.get('movementDate'))
  if (!movementDate) {
    return initialFailure('La fecha del movimiento no es válida.')
  }

  const paymentMethodRaw = String(formData.get('paymentMethod') ?? '').trim()
  const paymentMethod = allowedMethods.has(paymentMethodRaw) ? paymentMethodRaw : null
  const reference = String(formData.get('reference') ?? '').trim() || null

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  const openSession = await getOpenCashSession(access.organization.id)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('financial_movements').insert({
    organization_id: access.organization.id,
    cash_session_id: openSession?.id ?? null,
    movement_type: movementType,
    concept,
    amount,
    movement_date: movementDate,
    payment_method: paymentMethod,
    reference,
    created_by: memberId,
  })

  if (error) {
    console.error('createFinancialMovementAction', error)
    return initialFailure('No se pudo registrar el movimiento.')
  }

  revalidatePath(`/${orgSlug}/caja`)
  return initialSuccess
}

'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import {
  getOpenCashSession,
  getOrCreateDefaultCashRegisterId,
} from '@/lib/data/balance'
import { getOrCreateDefaultLocationId } from '@/lib/data/locations'
import { roundMoney } from '@/lib/utils/money'
import { db } from '@/lib/db'
import { cashSessions, organizationMembers } from '@/lib/db/schema'

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

  const currentMemberId = access.memberId
  const requestedOpenedBy = String(formData.get('openedBy') ?? '').trim()
  let openedBy = currentMemberId

  if (requestedOpenedBy && requestedOpenedBy !== currentMemberId) {
    try {
      const [operator] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.id, requestedOpenedBy),
          eq(organizationMembers.organizationId, access.organization.id),
          eq(organizationMembers.status, 'active')
        ))
        .limit(1)

      if (!operator) {
        return initialFailure('El empleado encargado no es válido.')
      }
      openedBy = operator.id
    } catch (err) {
      console.error('openCashSessionAction operator lookup', err)
      return initialFailure('El empleado encargado no es válido.')
    }
  }

  const locationId = await getOrCreateDefaultLocationId(access.organization.id)
  const registerId = await getOrCreateDefaultCashRegisterId(
    access.organization.id,
    locationId
  )

  if (!registerId) {
    return initialFailure('No se pudo preparar la caja registradora.')
  }

  try {
    await db.insert(cashSessions).values({
      organizationId: access.organization.id,
      cashRegisterId: registerId,
      status: 'open',
      openingAmount: String(openingAmount),
      openedBy,
      notes: String(formData.get('notes') ?? '').trim() || null,
    })
  } catch (err) {
    console.error('openCashSessionAction', err)
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

  try {
    await db
      .update(cashSessions)
      .set({
        status: 'closed',
        closingAmount: String(closingAmount),
        difference: String(difference),
        closedBy: memberId,
        closedAt: new Date().toISOString(),
        notes: String(formData.get('notes') ?? '').trim() || session.notes,
      })
      .where(and(
        eq(cashSessions.id, session.id),
        eq(cashSessions.organizationId, access.organization.id),
        eq(cashSessions.status, 'open')
      ))
  } catch (err) {
    console.error('closeCashSessionAction', err)
    return initialFailure('No se pudo cerrar la caja.')
  }

  revalidatePath(`/${orgSlug}/caja`)
  return initialSuccess
}

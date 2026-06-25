'use server'

import { getActionAccess } from '@/lib/auth/access'
import { getSaleDetailById } from '@/lib/data/sales'
import type { SaleDetail } from '@/lib/data/sale-detail-types'

export async function getSaleDetailAction(
  orgSlug: string,
  saleId: string
): Promise<SaleDetail | null> {
  const access = await getActionAccess(orgSlug, 'caja', 'view')
  if (!access) return null

  if (!saleId?.trim()) return null

  return getSaleDetailById(access.organization.id, saleId.trim())
}

import type { SalesStatistics } from '@/lib/data/statistics-types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getDateRangeBoundsInTimeZone } from '@/lib/utils/local-date'
import { roundMoney } from '@/lib/utils/money'

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getSalesStatistics(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<SalesStatistics> {
  const supabase = await createSupabaseServerClient()
  const { start, end } = getDateRangeBoundsInTimeZone(startDate, endDate, timeZone)

  const { data: sales, error } = await supabase
    .from('sales')
    .select(
      `
      id,
      lines:sale_lines (
        quantity,
        line_total,
        product:products ( cost_price )
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error || !sales) {
    console.error('getSalesStatistics', error)
    return {
      totalSold: 0,
      totalInvested: 0,
      profit: null,
      salesCount: 0,
      linesWithoutCost: 0,
      totalLines: 0,
    }
  }

  let totalSold = 0
  let totalInvested = 0
  let profitSum = 0
  let hasCost = false
  let linesWithoutCost = 0
  let totalLines = 0

  for (const sale of sales) {
    for (const line of sale.lines ?? []) {
      const quantity = toNumber(line.quantity)
      const lineTotal = toNumber(line.line_total)
      const product = Array.isArray(line.product) ? line.product[0] : line.product
      const costPrice = product?.cost_price != null ? toNumber(product.cost_price) : null

      totalSold += lineTotal
      totalLines += 1

      if (costPrice == null) {
        linesWithoutCost += 1
        continue
      }

      hasCost = true
      const lineCost = roundMoney(costPrice * quantity)
      totalInvested = roundMoney(totalInvested + lineCost)
      profitSum = roundMoney(profitSum + roundMoney(lineTotal - lineCost))
    }
  }

  return {
    totalSold: roundMoney(totalSold),
    totalInvested: roundMoney(totalInvested),
    profit: hasCost ? roundMoney(profitSum) : null,
    salesCount: sales.length,
    linesWithoutCost,
    totalLines,
  }
}

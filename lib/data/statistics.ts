import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { toNumber, toNumberOrZero } from '@/lib/db/numeric'
import { products, saleLines, sales } from '@/lib/db/schema'
import type { SalesStatistics } from '@/lib/data/statistics-types'
import { getDateRangeBoundsInTimeZone } from '@/lib/utils/local-date'
import { roundMoney } from '@/lib/utils/money'

export async function getSalesStatistics (
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<SalesStatistics> {
  const { start, end } = getDateRangeBoundsInTimeZone(startDate, endDate, timeZone)

  try {
    const rows = await db
      .select({
        saleId: sales.id,
        quantity: saleLines.quantity,
        lineTotal: saleLines.lineTotal,
        costPrice: products.costPrice,
      })
      .from(sales)
      .innerJoin(saleLines, eq(saleLines.saleId, sales.id))
      .leftJoin(products, eq(saleLines.productId, products.id))
      .where(
        and(
          eq(sales.organizationId, organizationId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, start),
          lte(sales.createdAt, end)
        )
      )

    const saleIds = new Set<string>()
    let totalSold = 0
    let totalInvested = 0
    let profitSum = 0
    let hasCost = false
    let linesWithoutCost = 0
    let totalLines = 0

    for (const row of rows) {
      saleIds.add(row.saleId)
      const quantity = toNumberOrZero(row.quantity)
      const lineTotal = toNumberOrZero(row.lineTotal)
      const costPrice = row.costPrice != null ? toNumber(row.costPrice) : null

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

    return {
      totalSold: roundMoney(totalSold),
      totalInvested: roundMoney(totalInvested),
      profit: hasCost ? roundMoney(profitSum) : null,
      salesCount: saleIds.size,
      linesWithoutCost,
      totalLines,
    }
  } catch (error) {
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
}

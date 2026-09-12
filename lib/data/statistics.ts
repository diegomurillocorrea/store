import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { toNumber, toNumberOrZero } from '@/lib/db/numeric'
import { products, saleLines, sales } from '@/lib/db/schema'
import {
  buildStatisticsSeries,
  getStatisticsBucketKey,
  resolveStatisticsGranularity,
} from '@/lib/data/statistics-series'
import type {
  SalesStatistics,
  StatisticsProductHighlight,
} from '@/lib/data/statistics-types'
import { getDateRangeBoundsInTimeZone } from '@/lib/utils/local-date'
import { roundMoney } from '@/lib/utils/money'

interface ProductAggregate {
  productId: string
  name: string
  imageUrl: string | null
  quantity: number
  sold: number
  invested: number
  profit: number
  hasCost: boolean
}

function toHighlight (aggregate: ProductAggregate): StatisticsProductHighlight {
  return {
    productId: aggregate.productId,
    name: aggregate.name,
    imageUrl: aggregate.imageUrl,
    quantity: aggregate.quantity,
    sold: roundMoney(aggregate.sold),
    invested: roundMoney(aggregate.invested),
    profit: aggregate.hasCost ? roundMoney(aggregate.profit) : null,
  }
}

function isBetterSeller (candidate: ProductAggregate, current: ProductAggregate): boolean {
  if (candidate.quantity !== current.quantity) {
    return candidate.quantity > current.quantity
  }
  return candidate.sold > current.sold
}

function isBetterProfit (candidate: ProductAggregate, current: ProductAggregate): boolean {
  if (candidate.profit !== current.profit) {
    return candidate.profit > current.profit
  }
  return candidate.quantity > current.quantity
}

function emptyStatistics (
  startDate: string,
  endDate: string
): SalesStatistics {
  const seriesGranularity = resolveStatisticsGranularity(startDate, endDate)

  return {
    totalSold: 0,
    totalInvested: 0,
    profit: null,
    salesCount: 0,
    linesWithoutCost: 0,
    totalLines: 0,
    bestSellingProduct: null,
    highestProfitProduct: null,
    series: buildStatisticsSeries(startDate, endDate, seriesGranularity),
    seriesGranularity,
  }
}

export async function getSalesStatistics (
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<SalesStatistics> {
  const { start, end } = getDateRangeBoundsInTimeZone(startDate, endDate, timeZone)
  const fallback = emptyStatistics(startDate, endDate)

  try {
    const rows = await db
      .select({
        saleId: sales.id,
        createdAt: sales.createdAt,
        productId: saleLines.productId,
        description: saleLines.description,
        quantity: saleLines.quantity,
        lineTotal: saleLines.lineTotal,
        costPrice: products.costPrice,
        productName: products.name,
        imageUrl: products.imageUrl,
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
    const productsById = new Map<string, ProductAggregate>()
    const series = fallback.series.map((point) => ({ ...point }))
    const seriesByKey = new Map(series.map((point) => [point.key, point]))
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
      const lineCost = costPrice == null ? null : roundMoney(costPrice * quantity)
      const lineProfit = lineCost == null ? null : roundMoney(lineTotal - lineCost)

      totalSold += lineTotal
      totalLines += 1

      const bucket = seriesByKey.get(
        getStatisticsBucketKey(row.createdAt, fallback.seriesGranularity, timeZone)
      )
      if (bucket) {
        bucket.sold = roundMoney(bucket.sold + lineTotal)
        if (lineCost != null && lineProfit != null) {
          bucket.invested = roundMoney(bucket.invested + lineCost)
          bucket.profit = roundMoney(bucket.profit + lineProfit)
        }
      }

      const productId = row.productId
      const existing = productsById.get(productId)
      const productName =
        row.productName?.trim() || row.description?.trim() || 'Producto'

      if (existing) {
        existing.quantity += quantity
        existing.sold = roundMoney(existing.sold + lineTotal)
        if (lineCost != null && lineProfit != null) {
          existing.hasCost = true
          existing.invested = roundMoney(existing.invested + lineCost)
          existing.profit = roundMoney(existing.profit + lineProfit)
        }
        if (!existing.imageUrl && row.imageUrl) {
          existing.imageUrl = row.imageUrl
        }
      } else {
        productsById.set(productId, {
          productId,
          name: productName,
          imageUrl: row.imageUrl ?? null,
          quantity,
          sold: lineTotal,
          invested: lineCost ?? 0,
          profit: lineProfit ?? 0,
          hasCost: lineCost != null,
        })
      }

      if (costPrice == null) {
        linesWithoutCost += 1
        continue
      }

      hasCost = true
      totalInvested = roundMoney(totalInvested + (lineCost ?? 0))
      profitSum = roundMoney(profitSum + (lineProfit ?? 0))
    }

    let bestSelling: ProductAggregate | null = null
    let highestProfit: ProductAggregate | null = null

    for (const aggregate of productsById.values()) {
      if (!bestSelling || isBetterSeller(aggregate, bestSelling)) {
        bestSelling = aggregate
      }
      if (
        aggregate.hasCost &&
        (!highestProfit || isBetterProfit(aggregate, highestProfit))
      ) {
        highestProfit = aggregate
      }
    }

    return {
      totalSold: roundMoney(totalSold),
      totalInvested: roundMoney(totalInvested),
      profit: hasCost ? roundMoney(profitSum) : null,
      salesCount: saleIds.size,
      linesWithoutCost,
      totalLines,
      bestSellingProduct: bestSelling ? toHighlight(bestSelling) : null,
      highestProfitProduct: highestProfit ? toHighlight(highestProfit) : null,
      series,
      seriesGranularity: fallback.seriesGranularity,
    }
  } catch (error) {
    console.error('getSalesStatistics', error)
    return fallback
  }
}

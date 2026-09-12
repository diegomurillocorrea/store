export type StatisticsSeriesGranularity = 'hour' | 'day' | 'month'

export interface StatisticsSeriesPoint {
  key: string
  label: string
  sold: number
  invested: number
  profit: number
}

export interface StatisticsProductHighlight {
  productId: string
  name: string
  imageUrl: string | null
  quantity: number
  sold: number
  invested: number
  profit: number | null
}

export interface SalesStatistics {
  totalSold: number
  totalInvested: number
  profit: number | null
  salesCount: number
  linesWithoutCost: number
  totalLines: number
  bestSellingProduct: StatisticsProductHighlight | null
  highestProfitProduct: StatisticsProductHighlight | null
  series: StatisticsSeriesPoint[]
  seriesGranularity: StatisticsSeriesGranularity
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

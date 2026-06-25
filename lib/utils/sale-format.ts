function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export interface SaleLineConceptInput {
  quantity: unknown
  productName: string
}

export function formatSaleLinesConcept(lines: SaleLineConceptInput[]): string {
  if (lines.length === 0) return 'Venta'

  return lines
    .map((line) => {
      const qty = toNumber(line.quantity)
      const qtyLabel = Number.isInteger(qty) ? String(qty) : String(qty)
      const name = line.productName.trim() || 'Producto'
      return `${qtyLabel} ${name}`
    })
    .join(', ')
}

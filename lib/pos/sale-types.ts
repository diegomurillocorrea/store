export type PosSaleType = 'paid' | 'credit'

export type PosPaymentMethod = 'cash' | 'card' | 'transfer' | 'other' | 'credit'

export interface PosSaleLineInput {
  productId: string
  quantity: number
  unitPrice: number
}

export interface CompletePosSaleInput {
  lines: PosSaleLineInput[]
  customerId: string | null
  saleType: PosSaleType
  paymentMethod: PosPaymentMethod
  discountPercent: number
  amountTendered: number | null
}

export interface SaleActionState {
  error: string | null
  ok: boolean
  saleId?: string
}

export const POS_PAYMENT_METHOD_LABELS: Record<
  Exclude<PosPaymentMethod, 'credit'>,
  string
> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateSaleTotals(
  subtotal: number,
  discountPercent: number
): { discountAmount: number; total: number } {
  const safePercent = Math.min(100, Math.max(0, discountPercent))
  const discountAmount = roundMoney(subtotal * (safePercent / 100))
  const total = roundMoney(Math.max(0, subtotal - discountAmount))
  return { discountAmount, total }
}

export function calculateChange(amountTendered: number, total: number): number {
  return roundMoney(Math.max(0, amountTendered - total))
}

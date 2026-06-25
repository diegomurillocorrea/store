export type BalanceMainTab = 'transacciones' | 'cierres'
export type BalanceTransactionTab = 'ingresos' | 'egresos' | 'por-cobrar' | 'por-pagar'

export type BalanceTransactionSource =
  | 'sale'
  | 'receivable_payment'
  | 'payable_payment'
  | 'manual'

export interface CashSessionSummary {
  id: string
  status: 'open' | 'closed'
  openingAmount: number
  closingAmount: number | null
  difference: number | null
  openedAt: string
  closedAt: string | null
  openedByName: string | null
  closedByName: string | null
  notes: string | null
  registerName: string | null
}

export interface BalanceSummary {
  balance: number
  totalSales: number
  totalExpenses: number
}

export interface BalanceTransactionRow {
  id: string
  source: BalanceTransactionSource
  referenceId: string | null
  concept: string
  amount: number
  occurredAt: string
  paymentMethod: string | null
  reference: string | null
  counterpartyName: string | null
}

export interface ReceivableBalanceRow {
  id: string
  documentNumber: string | null
  customerName: string
  total: number
  balanceDue: number
  issuedAt: string
  dueAt: string | null
  status: string
}

export interface PayableBalanceRow {
  id: string
  documentNumber: string | null
  supplierName: string
  total: number
  balanceDue: number
  issuedAt: string
  dueAt: string | null
  status: string
}

export interface CashClosingRow {
  id: string
  openedAt: string
  closedAt: string | null
  openingAmount: number
  closingAmount: number | null
  difference: number | null
  openedByName: string | null
  closedByName: string | null
  registerName: string | null
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
  credit: 'Crédito',
}

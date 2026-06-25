export interface SaleDetailLine {
  id: string
  productId: string
  productName: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  costPrice: number | null
}

export type SalePaymentStatus = 'paid' | 'credit' | 'voided' | 'draft'

export interface SaleDetail {
  id: string
  saleNumber: string | null
  displayNumber: string
  status: 'draft' | 'completed' | 'voided'
  concept: string
  subtotal: number
  discountTotal: number
  discountPercent: number | null
  total: number
  profit: number | null
  createdAt: string
  paymentMethod: string | null
  paymentStatus: SalePaymentStatus
  customerName: string | null
  employeeName: string | null
  lines: SaleDetailLine[]
}

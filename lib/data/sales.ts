import { formatSaleLinesConcept } from '@/lib/utils/sale-format'
import { getEmployeeFullNameByMemberId } from '@/lib/data/employees'
import type { SaleDetail, SaleDetailLine, SalePaymentStatus } from '@/lib/data/sale-detail-types'
import { roundMoney } from '@/lib/utils/money'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapMemberName(
  member:
    | { id: string; display_name: string | null }
    | { id: string; display_name: string | null }[]
    | null
): { id: string | null; displayName: string | null } {
  const row = Array.isArray(member) ? member[0] : member
  return {
    id: row?.id ?? null,
    displayName: row?.display_name?.trim() || null,
  }
}

function getDisplayNumber(saleNumber: string | null, saleId: string): string {
  if (!saleNumber?.trim()) {
    return saleId.slice(0, 8).toUpperCase()
  }

  const digits = saleNumber.replace(/\D/g, '')
  if (digits.length > 0) {
    return String(Number.parseInt(digits, 10))
  }

  return saleNumber
}

function calculateProfit(lines: SaleDetailLine[]): number | null {
  let hasCost = false
  const profit = lines.reduce((sum, line) => {
    if (line.costPrice == null) return sum
    hasCost = true
    const lineCost = roundMoney(line.costPrice * line.quantity)
    return sum + roundMoney(line.lineTotal - lineCost)
  }, 0)

  return hasCost ? roundMoney(profit) : null
}

function resolvePaymentStatus(
  status: string,
  paymentMethod: string | null,
  total: number,
  paidAmount: number
): SalePaymentStatus {
  if (status === 'voided') return 'voided'
  if (status === 'draft') return 'draft'
  if (paymentMethod === 'credit' || paidAmount <= 0) return 'credit'
  return 'paid'
}

export async function getSaleDetailById(
  organizationId: string,
  saleId: string
): Promise<SaleDetail | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('sales')
    .select(
      `
      id,
      sale_number,
      status,
      subtotal,
      discount_total,
      discount_percent,
      total,
      created_at,
      customer:customers ( first_name, last_name ),
      creator:organization_members!sales_created_by_fkey ( id, display_name ),
      payments:sale_payments ( method, amount, created_at ),
      lines:sale_lines (
        id,
        quantity,
        unit_price,
        line_total,
        product:products ( id, name, image_url, cost_price )
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('id', saleId)
    .maybeSingle()

  if (error || !data) {
    console.error('getSaleDetailById', error)
    return null
  }

  const customer = Array.isArray(data.customer) ? data.customer[0] : data.customer
  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null

  const lines: SaleDetailLine[] = (data.lines ?? []).map((line) => {
    const product = Array.isArray(line.product) ? line.product[0] : line.product

    return {
      id: line.id,
      productId: product?.id ?? '',
      productName: product?.name ?? 'Producto',
      imageUrl: product?.image_url ?? null,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unit_price),
      lineTotal: toNumber(line.line_total),
      costPrice: product?.cost_price != null ? toNumber(product.cost_price) : null,
    }
  })

  const payments = data.payments ?? []
  const paidAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const primaryPayment =
    payments.find((payment) => toNumber(payment.amount) > 0) ?? payments[0] ?? null

  const concept = formatSaleLinesConcept(
    lines.map((line) => ({
      quantity: line.quantity,
      productName: line.productName,
    }))
  )

  const creator = mapMemberName(data.creator)
  const employeeName =
    (await getEmployeeFullNameByMemberId(organizationId, creator.id)) ??
    creator.displayName

  return {
    id: data.id,
    saleNumber: data.sale_number,
    displayNumber: getDisplayNumber(data.sale_number, data.id),
    status: data.status,
    concept,
    subtotal: toNumber(data.subtotal),
    discountTotal: toNumber(data.discount_total),
    discountPercent: data.discount_percent != null ? toNumber(data.discount_percent) : null,
    total: toNumber(data.total),
    profit: calculateProfit(lines),
    createdAt: data.created_at,
    paymentMethod: primaryPayment?.method ?? null,
    paymentStatus: resolvePaymentStatus(
      data.status,
      primaryPayment?.method ?? null,
      toNumber(data.total),
      paidAmount
    ),
    customerName,
    employeeName,
    lines,
  }
}

import { and, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { toNumber, toNumberOrZero } from '@/lib/db/numeric'
import {
  customers,
  organizationMembers,
  products,
  saleLines,
  salePayments,
  sales,
} from '@/lib/db/schema'
import { formatSaleLinesConcept } from '@/lib/utils/sale-format'
import { getEmployeeFullNameByMemberId } from '@/lib/data/employees'
import type { SaleDetail, SaleDetailLine, SalePaymentStatus } from '@/lib/data/sale-detail-types'
import { roundMoney } from '@/lib/utils/money'

function mapMemberName (
  id: string | null,
  displayName: string | null
): { id: string | null; displayName: string | null } {
  return {
    id: id ?? null,
    displayName: displayName?.trim() || null,
  }
}

function getDisplayNumber (saleNumber: string | null, saleId: string): string {
  if (!saleNumber?.trim()) {
    return saleId.slice(0, 8).toUpperCase()
  }

  const digits = saleNumber.replace(/\D/g, '')
  if (digits.length > 0) {
    return String(Number.parseInt(digits, 10))
  }

  return saleNumber
}

function calculateProfit (lines: SaleDetailLine[]): number | null {
  let hasCost = false
  const profit = lines.reduce((sum, line) => {
    if (line.costPrice == null) return sum
    hasCost = true
    const lineCost = roundMoney(line.costPrice * line.quantity)
    return sum + roundMoney(line.lineTotal - lineCost)
  }, 0)

  return hasCost ? roundMoney(profit) : null
}

function resolvePaymentStatus (
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

export async function getSaleDetailById (
  organizationId: string,
  saleId: string
): Promise<SaleDetail | null> {
  try {
    const saleCreator = alias(organizationMembers, 'sale_creator')

    const [saleRow] = await db
      .select({
        id: sales.id,
        saleNumber: sales.saleNumber,
        status: sales.status,
        subtotal: sales.subtotal,
        discountTotal: sales.discountTotal,
        discountPercent: sales.discountPercent,
        total: sales.total,
        createdAt: sales.createdAt,
        customerId: sales.customerId,
        createdBy: sales.createdBy,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        creatorId: saleCreator.id,
        creatorDisplayName: saleCreator.displayName,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(saleCreator, eq(sales.createdBy, saleCreator.id))
      .where(and(eq(sales.organizationId, organizationId), eq(sales.id, saleId)))
      .limit(1)

    if (!saleRow) return null

    const payments = await db
      .select({
        method: salePayments.method,
        amount: salePayments.amount,
        createdAt: salePayments.createdAt,
      })
      .from(salePayments)
      .where(eq(salePayments.saleId, saleId))

    const lineRows = await db
      .select({
        id: saleLines.id,
        quantity: saleLines.quantity,
        unitPrice: saleLines.unitPrice,
        lineTotal: saleLines.lineTotal,
        productId: products.id,
        productName: products.name,
        imageUrl: products.imageUrl,
        costPrice: products.costPrice,
      })
      .from(saleLines)
      .leftJoin(products, eq(saleLines.productId, products.id))
      .where(eq(saleLines.saleId, saleId))

    const customerName = saleRow.customerFirstName
      ? `${saleRow.customerFirstName} ${saleRow.customerLastName ?? ''}`.trim()
      : null

    const lines: SaleDetailLine[] = lineRows.map((line) => ({
      id: line.id,
      productId: line.productId ?? '',
      productName: line.productName ?? 'Producto',
      imageUrl: line.imageUrl ?? null,
      quantity: toNumberOrZero(line.quantity),
      unitPrice: toNumberOrZero(line.unitPrice),
      lineTotal: toNumberOrZero(line.lineTotal),
      costPrice: line.costPrice != null ? toNumber(line.costPrice) : null,
    }))

    const paidAmount = payments.reduce((sum, p) => sum + toNumberOrZero(p.amount), 0)
    const primaryPayment =
      payments.find((p) => toNumberOrZero(p.amount) > 0) ?? payments[0] ?? null

    const concept = formatSaleLinesConcept(
      lines.map((line) => ({
        quantity: line.quantity,
        productName: line.productName,
      }))
    )

    const creator = mapMemberName(saleRow.creatorId, saleRow.creatorDisplayName)
    const employeeName =
      (await getEmployeeFullNameByMemberId(organizationId, creator.id)) ??
      creator.displayName

    return {
      id: saleRow.id,
      saleNumber: saleRow.saleNumber,
      displayNumber: getDisplayNumber(saleRow.saleNumber, saleRow.id),
      status: saleRow.status,
      concept,
      subtotal: toNumberOrZero(saleRow.subtotal),
      discountTotal: toNumberOrZero(saleRow.discountTotal),
      discountPercent: saleRow.discountPercent != null ? toNumber(saleRow.discountPercent) : null,
      total: toNumberOrZero(saleRow.total),
      profit: calculateProfit(lines),
      createdAt: saleRow.createdAt,
      paymentMethod: primaryPayment?.method ?? null,
      paymentStatus: resolvePaymentStatus(
        saleRow.status,
        primaryPayment?.method ?? null,
        toNumberOrZero(saleRow.total),
        paidAmount
      ),
      customerId: saleRow.customerId ?? null,
      customerName,
      employeeName,
      lines,
    }
  } catch (error) {
    console.error('getSaleDetailById', error)
    return null
  }
}

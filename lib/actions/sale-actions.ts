'use server'

import { and, count, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import { getOrCreateDefaultLocationId } from '@/lib/data/locations'
import {
  calculateChange,
  calculateSaleTotals,
  roundMoney,
  type CompletePosSaleInput,
  type PosPaymentMethod,
  type SaleActionState,
} from '@/lib/pos/sale-types'
import { db } from '@/lib/db'
import {
  customers,
  inventoryMovements,
  products,
  receivables,
  saleLines,
  salePayments,
  sales,
} from '@/lib/db/schema'
import { toNumberOrZero } from '@/lib/db/numeric'
import {
  combineDateWithTimeInTimeZone,
  DEFAULT_TIME_ZONE,
  isValidDateString,
} from '@/lib/utils/local-date'

function parseSaleInput (input: CompletePosSaleInput): { error: string } | CompletePosSaleInput {
  const customerId = input.customerId?.trim() || null

  if (input.saleType === 'credit' && !customerId) {
    return { error: 'Selecciona un cliente para ventas al crédito.' }
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { error: 'El carrito está vacío.' }
  }

  for (const line of input.lines) {
    if (!line.productId?.trim()) {
      return { error: 'Línea de venta inválida.' }
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { error: 'Cantidad inválida en el carrito.' }
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      return { error: 'Precio inválido en el carrito.' }
    }
  }

  if (input.saleType !== 'paid' && input.saleType !== 'credit') {
    return { error: 'Tipo de venta inválido.' }
  }

  const allowedMethods: PosPaymentMethod[] = ['cash', 'card', 'transfer', 'other', 'credit']
  if (!allowedMethods.includes(input.paymentMethod)) {
    return { error: 'Método de pago inválido.' }
  }

  if (input.saleType === 'paid' && input.paymentMethod === 'credit') {
    return { error: 'El método de pago no puede ser crédito en una venta pagada.' }
  }

  if (input.saleType === 'credit' && input.paymentMethod !== 'credit') {
    return { error: 'Las ventas al crédito deben usar el método crédito.' }
  }

  if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) {
    return { error: 'El porcentaje de descuento debe estar entre 0 y 100.' }
  }

  const saleDate = String(input.saleDate ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
    return { error: 'Fecha de la venta inválida.' }
  }

  return { ...input, customerId, saleDate }
}

async function generateSaleNumber (organizationId: string): Promise<string> {
  try {
    const [row] = await db
      .select({ total: count() })
      .from(sales)
      .where(eq(sales.organizationId, organizationId))
    const next = (row?.total ?? 0) + 1
    return `V-${String(next).padStart(6, '0')}`
  } catch (err) {
    console.error('generateSaleNumber', err)
    return `V-${Date.now()}`
  }
}

export async function completePosSaleAction (
  orgSlug: string,
  input: CompletePosSaleInput
): Promise<SaleActionState> {
  const access = await getActionAccess(orgSlug, 'pos', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseSaleInput(input)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const organizationId = access.organization.id
  const memberId = await getActiveMemberIdForOrganization(organizationId)
  const productIds = [...new Set(parsed.lines.map((line) => line.productId))]

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      availableQuantity: products.availableQuantity,
      isActive: products.isActive,
    })
    .from(products)
    .where(and(
      eq(products.organizationId, organizationId),
      inArray(products.id, productIds)
    ))

  if (!productRows.length) {
    return { error: 'No se pudieron validar los productos del carrito.', ok: false }
  }

  const productById = new Map(productRows.map((p) => [p.id, p]))

  for (const line of parsed.lines) {
    const product = productById.get(line.productId)
    if (!product) {
      return { error: 'Un producto del carrito ya no existe.', ok: false }
    }
    if (!product.isActive) {
      return { error: `El producto "${product.name}" ya no está activo.`, ok: false }
    }
    const available = toNumberOrZero(product.availableQuantity)
    if (line.quantity > available) {
      return {
        error: `Stock insuficiente para "${product.name}" (disponible: ${available}).`,
        ok: false,
      }
    }
  }

  if (parsed.customerId) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(
        eq(customers.organizationId, organizationId),
        eq(customers.id, parsed.customerId)
      ))
      .limit(1)

    if (!customer) {
      return { error: 'El cliente seleccionado no es válido.', ok: false }
    }
  }

  const subtotal = roundMoney(
    parsed.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  )
  const { discountAmount, total } = calculateSaleTotals(subtotal, parsed.discountPercent)

  if (total <= 0) {
    return { error: 'El total de la venta debe ser mayor a cero.', ok: false }
  }

  const isCashPaid = parsed.saleType === 'paid' && parsed.paymentMethod === 'cash'
  const amountTendered = parsed.amountTendered ?? 0

  if (isCashPaid) {
    if (!Number.isFinite(amountTendered) || amountTendered < total) {
      return { error: 'El monto pagado debe ser mayor o igual al total de la venta.', ok: false }
    }
  }

  const changeAmount = isCashPaid ? calculateChange(amountTendered, total) : 0
  const saleNumber = await generateSaleNumber(organizationId)
  const locationId = await getOrCreateDefaultLocationId(organizationId)

  const parsedSaleDate = parseSaleDateInput(
    parsed.saleDate,
    new Date().toISOString(),
    DEFAULT_TIME_ZONE
  )
  if (typeof parsedSaleDate === 'object') {
    return { error: parsedSaleDate.error, ok: false }
  }

  const paymentMethod = parsed.saleType === 'credit' ? 'credit' : parsed.paymentMethod
  const paymentAmount = parsed.saleType === 'credit' ? 0 : total

  let saleId: string

  try {
    saleId = await db.transaction(async (tx) => {
      const [saleRow] = await tx
        .insert(sales)
        .values({
          organizationId,
          customerId: parsed.customerId ?? null,
          status: 'completed',
          saleNumber,
          subtotal: String(subtotal),
          taxTotal: '0',
          discountTotal: String(discountAmount),
          discountPercent: String(parsed.discountPercent),
          total: String(total),
          createdBy: memberId,
          createdAt: parsedSaleDate,
        })
        .returning({ id: sales.id })

      if (!saleRow?.id) throw new Error('insert sale failed')

      const saleLinesPayload = parsed.lines.map((line) => {
        const lineSubtotal = roundMoney(line.unitPrice * line.quantity)
        const lineDiscountShare =
          subtotal > 0 ? roundMoney((lineSubtotal / subtotal) * discountAmount) : 0
        const lineTotal = roundMoney(Math.max(0, lineSubtotal - lineDiscountShare))

        return {
          saleId: saleRow.id,
          productId: line.productId,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          lineDiscount: String(lineDiscountShare),
          lineTax: '0',
          lineTotal: String(lineTotal),
        }
      })

      await tx.insert(saleLines).values(saleLinesPayload)

      await tx.insert(salePayments).values({
        saleId: saleRow.id,
        method: paymentMethod,
        amount: String(paymentAmount),
        amountTendered: isCashPaid ? String(amountTendered) : null,
        changeAmount: String(changeAmount),
      })

      if (parsed.saleType === 'credit') {
        await tx.insert(receivables).values({
          organizationId,
          customerId: parsed.customerId!,
          saleId: saleRow.id,
          documentNumber: saleNumber,
          issuedAt: parsed.saleDate,
          total: String(total),
          balanceDue: String(total),
          status: 'open',
        })
      }

      // Re-fetch latest stock inside transaction before updating
      const freshProducts = await tx
        .select({ id: products.id, availableQuantity: products.availableQuantity })
        .from(products)
        .where(and(
          eq(products.organizationId, organizationId),
          inArray(products.id, productIds)
        ))

      const freshById = new Map(freshProducts.map((p) => [p.id, p]))

      for (const line of parsed.lines) {
        const product = freshById.get(line.productId)
        const currentQty = product ? toNumberOrZero(product.availableQuantity) : 0
        const nextQty = roundMoney(Math.max(0, currentQty - line.quantity))

        await tx
          .update(products)
          .set({ availableQuantity: String(nextQty) })
          .where(and(
            eq(products.id, line.productId),
            eq(products.organizationId, organizationId)
          ))

        if (locationId) {
          await tx.insert(inventoryMovements).values({
            organizationId,
            productId: line.productId,
            locationId,
            movementType: 'sale',
            quantityDelta: String(-line.quantity),
            referenceType: 'sale',
            referenceId: saleRow.id,
            createdBy: memberId,
          })
        }
      }

      return saleRow.id
    })
  } catch (err) {
    console.error('completePosSaleAction:transaction', err)
    return { error: 'No se pudo registrar la venta.', ok: false }
  }

  revalidatePath(`/${orgSlug}/pos`)
  revalidatePath(`/${orgSlug}/caja`)
  revalidatePath(`/${orgSlug}/productos`)
  revalidatePath(`/${orgSlug}/inventario`)

  return { error: null, ok: true, saleId }
}

function revalidateSalePaths (orgSlug: string) {
  revalidatePath(`/${orgSlug}/caja`)
  revalidatePath(`/${orgSlug}/pos`)
  revalidatePath(`/${orgSlug}/productos`)
  revalidatePath(`/${orgSlug}/inventario`)
  revalidatePath(`/${orgSlug}/clientes`)
}

export async function voidSaleAction (
  orgSlug: string,
  saleId: string,
  _prevState: SaleActionState,
  formData: FormData
): Promise<SaleActionState> {
  const access = await getActionAccess(orgSlug, 'pos', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  const trimmedSaleId = saleId.trim()
  if (!trimmedSaleId) {
    return { error: 'Venta inválida.', ok: false }
  }

  const voidReason = String(formData.get('voidReason') ?? '').trim() || null
  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  const locationId = await getOrCreateDefaultLocationId(access.organization.id)
  const organizationId = access.organization.id

  const [saleRow] = await db
    .select({ id: sales.id, status: sales.status, total: sales.total })
    .from(sales)
    .where(and(
      eq(sales.organizationId, organizationId),
      eq(sales.id, trimmedSaleId)
    ))
    .limit(1)

  if (!saleRow) {
    return { error: 'No se encontró la venta.', ok: false }
  }

  if (saleRow.status === 'voided') {
    return { error: 'Esta venta ya está anulada.', ok: false }
  }

  if (saleRow.status !== 'completed') {
    return { error: 'Solo se pueden anular ventas completadas.', ok: false }
  }

  const lines = await db
    .select({ id: saleLines.id, productId: saleLines.productId, quantity: saleLines.quantity })
    .from(saleLines)
    .where(eq(saleLines.saleId, trimmedSaleId))

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(sales)
        .set({
          status: 'voided',
          voidReason,
          voidedAt: new Date().toISOString(),
        })
        .where(and(
          eq(sales.id, saleRow.id),
          eq(sales.organizationId, organizationId)
        ))

      const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))] as string[]

      if (productIds.length > 0) {
        const productRows = await tx
          .select({ id: products.id, availableQuantity: products.availableQuantity })
          .from(products)
          .where(and(
            eq(products.organizationId, organizationId),
            inArray(products.id, productIds)
          ))

        const productById = new Map(productRows.map((p) => [p.id, p]))

        for (const line of lines) {
          const product = productById.get(line.productId)
          if (!product) continue

          const quantity = toNumberOrZero(line.quantity)
          if (quantity <= 0) continue

          const currentQty = toNumberOrZero(product.availableQuantity)
          const nextQty = roundMoney(currentQty + quantity)

          await tx
            .update(products)
            .set({ availableQuantity: String(nextQty) })
            .where(and(
              eq(products.id, line.productId),
              eq(products.organizationId, organizationId)
            ))

          if (locationId) {
            await tx.insert(inventoryMovements).values({
              organizationId,
              productId: line.productId,
              locationId,
              movementType: 'return_customer',
              quantityDelta: String(quantity),
              referenceType: 'sale',
              referenceId: saleRow.id,
              notes: 'Anulación de venta',
              createdBy: memberId,
            })
          }
        }
      }

      await tx
        .update(receivables)
        .set({ status: 'written_off', balanceDue: '0' })
        .where(and(
          eq(receivables.organizationId, organizationId),
          eq(receivables.saleId, saleRow.id),
          inArray(receivables.status, ['open', 'partial'])
        ))
    })
  } catch (err) {
    console.error('voidSaleAction:transaction', err)
    return { error: 'No se pudo anular la venta.', ok: false }
  }

  revalidateSalePaths(orgSlug)

  return { error: null, ok: true, saleId: saleRow.id }
}

function parseSaleDateInput (
  value: string,
  originalIso: string,
  timeZone: string
): string | { error: string } {
  const trimmed = value.trim()
  if (!isValidDateString(trimmed)) {
    return { error: 'Fecha de la venta inválida.' }
  }

  const combined = combineDateWithTimeInTimeZone(trimmed, originalIso, timeZone)
  if (!combined) {
    return { error: 'Fecha de la venta inválida.' }
  }

  return combined
}

export async function updateSaleAction (
  orgSlug: string,
  saleId: string,
  _prevState: SaleActionState,
  formData: FormData
): Promise<SaleActionState> {
  const access = await getActionAccess(orgSlug, 'pos', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const trimmedSaleId = saleId.trim()
  if (!trimmedSaleId) {
    return { error: 'Venta inválida.', ok: false }
  }

  const customerIdRaw = String(formData.get('customerId') ?? '').trim()
  const customerId = customerIdRaw || null
  const paymentMethod = String(formData.get('paymentMethod') ?? '').trim() as PosPaymentMethod
  const allowedMethods: PosPaymentMethod[] = ['cash', 'card', 'transfer', 'other', 'credit']
  const saleDateRaw = String(formData.get('saleDate') ?? '').trim()
  const discountPercent = Number(String(formData.get('discountPercent') ?? '').replace(',', '.'))

  if (!allowedMethods.includes(paymentMethod)) {
    return { error: 'Método de pago inválido.', ok: false }
  }

  if (paymentMethod === 'credit' && !customerId) {
    return { error: 'Selecciona un cliente para ventas al crédito.', ok: false }
  }

  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: 'El porcentaje de descuento debe estar entre 0 y 100.', ok: false }
  }

  const organizationId = access.organization.id

  const [saleRow] = await db
    .select({
      id: sales.id,
      status: sales.status,
      subtotal: sales.subtotal,
      total: sales.total,
      saleNumber: sales.saleNumber,
      customerId: sales.customerId,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(and(
      eq(sales.organizationId, organizationId),
      eq(sales.id, trimmedSaleId)
    ))
    .limit(1)

  if (!saleRow) {
    return { error: 'No se encontró la venta.', ok: false }
  }

  if (saleRow.status === 'voided') {
    return { error: 'No se puede editar una venta anulada.', ok: false }
  }

  if (saleRow.status !== 'completed') {
    return { error: 'Solo se pueden editar ventas completadas.', ok: false }
  }

  const [linesRows, paymentsRows] = await Promise.all([
    db
      .select({ id: saleLines.id, quantity: saleLines.quantity, unitPrice: saleLines.unitPrice })
      .from(saleLines)
      .where(eq(saleLines.saleId, trimmedSaleId)),
    db
      .select({ id: salePayments.id, method: salePayments.method, amount: salePayments.amount })
      .from(salePayments)
      .where(eq(salePayments.saleId, trimmedSaleId)),
  ])

  const parsedSaleDate = parseSaleDateInput(
    saleDateRaw,
    saleRow.createdAt,
    DEFAULT_TIME_ZONE
  )
  if (typeof parsedSaleDate === 'object') {
    return { error: parsedSaleDate.error, ok: false }
  }

  if (customerId) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(
        eq(customers.organizationId, organizationId),
        eq(customers.id, customerId)
      ))
      .limit(1)

    if (!customer) {
      return { error: 'El cliente seleccionado no es válido.', ok: false }
    }
  }

  const subtotal = roundMoney(toNumberOrZero(saleRow.subtotal))
  const { discountAmount, total } = calculateSaleTotals(subtotal, discountPercent)

  if (total <= 0) {
    return { error: 'El total de la venta debe ser mayor a cero.', ok: false }
  }

  const wasCredit =
    paymentsRows.some((p) => p.method === 'credit') ||
    paymentsRows.every((p) => toNumberOrZero(p.amount) <= 0)
  const willBeCredit = paymentMethod === 'credit'

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(sales)
        .set({
          customerId,
          createdAt: parsedSaleDate,
          discountPercent: String(discountPercent),
          discountTotal: String(discountAmount),
          total: String(total),
          updatedAt: new Date().toISOString(),
        })
        .where(and(
          eq(sales.id, saleRow.id),
          eq(sales.organizationId, organizationId)
        ))

      for (const line of linesRows) {
        const lineSubtotal = roundMoney(toNumberOrZero(line.unitPrice) * toNumberOrZero(line.quantity))
        const lineDiscountShare =
          subtotal > 0 ? roundMoney((lineSubtotal / subtotal) * discountAmount) : 0
        const lineTotal = roundMoney(Math.max(0, lineSubtotal - lineDiscountShare))

        await tx
          .update(saleLines)
          .set({
            lineDiscount: String(lineDiscountShare),
            lineTotal: String(lineTotal),
          })
          .where(and(
            eq(saleLines.id, line.id),
            eq(saleLines.saleId, saleRow.id)
          ))
      }

      const primaryPayment = paymentsRows[0] ?? null
      const paymentAmount = willBeCredit ? 0 : total

      if (primaryPayment?.id) {
        await tx
          .update(salePayments)
          .set({ method: paymentMethod, amount: String(paymentAmount) })
          .where(and(
            eq(salePayments.id, primaryPayment.id),
            eq(salePayments.saleId, saleRow.id)
          ))
      } else {
        await tx.insert(salePayments).values({
          saleId: saleRow.id,
          method: paymentMethod,
          amount: String(paymentAmount),
        })
      }

      if (!wasCredit && willBeCredit && customerId) {
        const [existingReceivable] = await tx
          .select({ id: receivables.id, total: receivables.total, balanceDue: receivables.balanceDue })
          .from(receivables)
          .where(and(
            eq(receivables.organizationId, organizationId),
            eq(receivables.saleId, saleRow.id)
          ))
          .limit(1)

        if (!existingReceivable) {
          await tx.insert(receivables).values({
            organizationId,
            customerId,
            saleId: saleRow.id,
            documentNumber: saleRow.saleNumber,
            issuedAt: saleDateRaw,
            total: String(total),
            balanceDue: String(total),
            status: 'open',
          })
        } else {
          await tx
            .update(receivables)
            .set({
              customerId,
              status: 'open',
              balanceDue: String(total),
              total: String(total),
            })
            .where(eq(receivables.id, existingReceivable.id))
        }
      }

      if (wasCredit && !willBeCredit) {
        await tx
          .update(receivables)
          .set({ status: 'paid', balanceDue: '0', total: String(total) })
          .where(and(
            eq(receivables.organizationId, organizationId),
            eq(receivables.saleId, saleRow.id),
            inArray(receivables.status, ['open', 'partial'])
          ))
      }

      if (wasCredit && willBeCredit) {
        const [receivable] = await tx
          .select({ id: receivables.id, total: receivables.total, balanceDue: receivables.balanceDue })
          .from(receivables)
          .where(and(
            eq(receivables.organizationId, organizationId),
            eq(receivables.saleId, saleRow.id),
            inArray(receivables.status, ['open', 'partial'])
          ))
          .limit(1)

        if (receivable) {
          const paidSoFar = roundMoney(
            toNumberOrZero(receivable.total) - toNumberOrZero(receivable.balanceDue)
          )
          const nextBalanceDue = roundMoney(Math.max(0, total - paidSoFar))
          const nextStatus: 'paid' | 'partial' | 'open' =
            nextBalanceDue <= 0 ? 'paid' : paidSoFar > 0 ? 'partial' : 'open'

          await tx
            .update(receivables)
            .set({
              customerId: customerId!,
              total: String(total),
              balanceDue: String(nextBalanceDue),
              status: nextStatus,
            })
            .where(eq(receivables.id, receivable.id))
        }
      }
    })
  } catch (err) {
    console.error('updateSaleAction:transaction', err)
    return { error: 'No se pudo actualizar la venta.', ok: false }
  }

  revalidateSalePaths(orgSlug)

  return { error: null, ok: true, saleId: saleRow.id }
}

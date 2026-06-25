'use server'

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
import { createSupabaseServerClient } from '@/lib/supabase/server'

function parseSaleInput(input: CompletePosSaleInput): { error: string } | CompletePosSaleInput {
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

  return { ...input, customerId }
}

async function generateSaleNumber(
  organizationId: string
): Promise<string> {
  const supabase = await createSupabaseServerClient()

  const { count, error } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) {
    console.error('generateSaleNumber', error)
    return `V-${Date.now()}`
  }

  const next = (count ?? 0) + 1
  return `V-${String(next).padStart(6, '0')}`
}

export async function completePosSaleAction(
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

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  const supabase = await createSupabaseServerClient()

  const productIds = [...new Set(parsed.lines.map((line) => line.productId))]

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, available_quantity, sale_price, is_active')
    .eq('organization_id', access.organization.id)
    .in('id', productIds)

  if (productsError || !products?.length) {
    console.error('completePosSaleAction:products', productsError)
    return { error: 'No se pudieron validar los productos del carrito.', ok: false }
  }

  const productById = new Map(products.map((product) => [product.id, product]))

  for (const line of parsed.lines) {
    const product = productById.get(line.productId)
    if (!product) {
      return { error: 'Un producto del carrito ya no existe.', ok: false }
    }
    if (!product.is_active) {
      return { error: `El producto "${product.name}" ya no está activo.`, ok: false }
    }

    const available = Number(product.available_quantity)
    if (!Number.isFinite(available) || line.quantity > available) {
      return {
        error: `Stock insuficiente para "${product.name}" (disponible: ${available}).`,
        ok: false,
      }
    }
  }

  if (parsed.customerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', access.organization.id)
      .eq('id', parsed.customerId)
      .maybeSingle()

    if (customerError || !customer) {
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
  const saleNumber = await generateSaleNumber(access.organization.id)
  const locationId = await getOrCreateDefaultLocationId(access.organization.id)

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      organization_id: access.organization.id,
      customer_id: parsed.customerId ?? null,
      status: 'completed',
      sale_number: saleNumber,
      subtotal,
      tax_total: 0,
      discount_total: discountAmount,
      discount_percent: parsed.discountPercent,
      total,
      created_by: memberId,
    })
    .select('id')
    .single()

  if (saleError || !sale?.id) {
    console.error('completePosSaleAction:sale', saleError)
    return { error: 'No se pudo registrar la venta.', ok: false }
  }

  const saleLinesPayload = parsed.lines.map((line) => {
    const lineSubtotal = roundMoney(line.unitPrice * line.quantity)
    const lineDiscountShare =
      subtotal > 0 ? roundMoney((lineSubtotal / subtotal) * discountAmount) : 0
    const lineTotal = roundMoney(Math.max(0, lineSubtotal - lineDiscountShare))

    return {
      sale_id: sale.id,
      product_id: line.productId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      line_discount: lineDiscountShare,
      line_tax: 0,
      line_total: lineTotal,
    }
  })

  const { error: linesError } = await supabase.from('sale_lines').insert(saleLinesPayload)

  if (linesError) {
    console.error('completePosSaleAction:sale_lines', linesError)
    await supabase.from('sales').delete().eq('id', sale.id)
    return { error: 'No se pudieron registrar los productos de la venta.', ok: false }
  }

  const paymentMethod = parsed.saleType === 'credit' ? 'credit' : parsed.paymentMethod
  const paymentAmount = parsed.saleType === 'credit' ? 0 : total

  const { error: paymentError } = await supabase.from('sale_payments').insert({
    sale_id: sale.id,
    method: paymentMethod,
    amount: paymentAmount,
    amount_tendered: isCashPaid ? amountTendered : null,
    change_amount: changeAmount,
  })

  if (paymentError) {
    console.error('completePosSaleAction:sale_payments', paymentError)

    const legacyPayload = {
      sale_id: sale.id,
      method: paymentMethod,
      amount: paymentAmount,
    }

    const { error: legacyPaymentError } = await supabase
      .from('sale_payments')
      .insert(legacyPayload)

    if (legacyPaymentError) {
      await supabase.from('sale_lines').delete().eq('sale_id', sale.id)
      await supabase.from('sales').delete().eq('id', sale.id)
      return { error: 'No se pudo registrar el pago de la venta.', ok: false }
    }
  }

  if (parsed.saleType === 'credit') {
    const { error: receivableError } = await supabase.from('receivables').insert({
      organization_id: access.organization.id,
      customer_id: parsed.customerId ?? null,
      sale_id: sale.id,
      document_number: saleNumber,
      total,
      balance_due: total,
      status: 'open',
    })

    if (receivableError) {
      console.error('completePosSaleAction:receivables', receivableError)
      await supabase.from('sale_payments').delete().eq('sale_id', sale.id)
      await supabase.from('sale_lines').delete().eq('sale_id', sale.id)
      await supabase.from('sales').delete().eq('id', sale.id)
      return { error: 'No se pudo registrar la cuenta por cobrar.', ok: false }
    }
  }

  for (const line of parsed.lines) {
    const product = productById.get(line.productId)!
    const currentQty = Number(product.available_quantity)
    const nextQty = roundMoney(Math.max(0, currentQty - line.quantity))

    const { error: stockError } = await supabase
      .from('products')
      .update({ available_quantity: nextQty })
      .eq('id', line.productId)
      .eq('organization_id', access.organization.id)

    if (stockError) {
      console.error('completePosSaleAction:stock', stockError)
    }

    if (locationId) {
      const { error: movementError } = await supabase.from('inventory_movements').insert({
        organization_id: access.organization.id,
        product_id: line.productId,
        location_id: locationId,
        movement_type: 'sale',
        quantity_delta: -line.quantity,
        reference_type: 'sale',
        reference_id: sale.id,
        created_by: memberId,
      })

      if (movementError) {
        console.error('completePosSaleAction:inventory_movements', movementError)
      }
    }
  }

  revalidatePath(`/${orgSlug}/pos`)
  revalidatePath(`/${orgSlug}/productos`)
  revalidatePath(`/${orgSlug}/inventario`)

  return { error: null, ok: true, saleId: sale.id }
}

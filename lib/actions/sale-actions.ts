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
  const supabase = await createSupabaseServerClient()
  const locationId = await getOrCreateDefaultLocationId(access.organization.id)

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(
      `
      id,
      status,
      total,
      lines:sale_lines ( id, product_id, quantity )
    `
    )
    .eq('organization_id', access.organization.id)
    .eq('id', trimmedSaleId)
    .maybeSingle()

  if (saleError || !sale) {
    console.error('voidSaleAction:sale', saleError)
    return { error: 'No se encontró la venta.', ok: false }
  }

  if (sale.status === 'voided') {
    return { error: 'Esta venta ya está anulada.', ok: false }
  }

  if (sale.status !== 'completed') {
    return { error: 'Solo se pueden anular ventas completadas.', ok: false }
  }

  const { error: voidError } = await supabase
    .from('sales')
    .update({
      status: 'voided',
      void_reason: voidReason,
      voided_at: new Date().toISOString(),
    })
    .eq('id', sale.id)
    .eq('organization_id', access.organization.id)

  if (voidError) {
    console.error('voidSaleAction:update', voidError)
    return { error: 'No se pudo anular la venta.', ok: false }
  }

  const lines = sale.lines ?? []
  const productIds = [...new Set(lines.map((line) => line.product_id).filter(Boolean))]

  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, available_quantity')
      .eq('organization_id', access.organization.id)
      .in('id', productIds)

    if (productsError) {
      console.error('voidSaleAction:products', productsError)
    } else {
      const productById = new Map((products ?? []).map((product) => [product.id, product]))

      for (const line of lines) {
        const product = productById.get(line.product_id)
        if (!product) continue

        const quantity = Number(line.quantity)
        if (!Number.isFinite(quantity) || quantity <= 0) continue

        const currentQty = Number(product.available_quantity)
        const nextQty = roundMoney(currentQty + quantity)

        const { error: stockError } = await supabase
          .from('products')
          .update({ available_quantity: nextQty })
          .eq('id', line.product_id)
          .eq('organization_id', access.organization.id)

        if (stockError) {
          console.error('voidSaleAction:stock', stockError)
        } else {
          product.available_quantity = nextQty
        }

        if (locationId) {
          const { error: movementError } = await supabase.from('inventory_movements').insert({
            organization_id: access.organization.id,
            product_id: line.product_id,
            location_id: locationId,
            movement_type: 'return_customer',
            quantity_delta: quantity,
            reference_type: 'sale',
            reference_id: sale.id,
            notes: 'Anulación de venta',
            created_by: memberId,
          })

          if (movementError) {
            console.error('voidSaleAction:inventory_movements', movementError)
          }
        }
      }
    }
  }

  const { error: receivableError } = await supabase
    .from('receivables')
    .update({
      status: 'written_off',
      balance_due: 0,
    })
    .eq('organization_id', access.organization.id)
    .eq('sale_id', sale.id)
    .in('status', ['open', 'partial'])

  if (receivableError) {
    console.error('voidSaleAction:receivables', receivableError)
  }

  revalidateSalePaths(orgSlug)

  return { error: null, ok: true, saleId: sale.id }
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

  if (!allowedMethods.includes(paymentMethod)) {
    return { error: 'Método de pago inválido.', ok: false }
  }

  if (paymentMethod === 'credit' && !customerId) {
    return { error: 'Selecciona un cliente para ventas al crédito.', ok: false }
  }

  const supabase = await createSupabaseServerClient()

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(
      `
      id,
      status,
      total,
      sale_number,
      customer_id,
      payments:sale_payments ( id, method, amount )
    `
    )
    .eq('organization_id', access.organization.id)
    .eq('id', trimmedSaleId)
    .maybeSingle()

  if (saleError || !sale) {
    console.error('updateSaleAction:sale', saleError)
    return { error: 'No se encontró la venta.', ok: false }
  }

  if (sale.status === 'voided') {
    return { error: 'No se puede editar una venta anulada.', ok: false }
  }

  if (sale.status !== 'completed') {
    return { error: 'Solo se pueden editar ventas completadas.', ok: false }
  }

  if (customerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', access.organization.id)
      .eq('id', customerId)
      .maybeSingle()

    if (customerError || !customer) {
      return { error: 'El cliente seleccionado no es válido.', ok: false }
    }
  }

  const wasCredit =
    (sale.payments ?? []).some((payment) => payment.method === 'credit') ||
    (sale.payments ?? []).every((payment) => Number(payment.amount) <= 0)
  const willBeCredit = paymentMethod === 'credit'

  const { error: updateSaleError } = await supabase
    .from('sales')
    .update({ customer_id: customerId })
    .eq('id', sale.id)
    .eq('organization_id', access.organization.id)

  if (updateSaleError) {
    console.error('updateSaleAction:update', updateSaleError)
    return { error: 'No se pudo actualizar la venta.', ok: false }
  }

  const primaryPayment = sale.payments?.[0] ?? null
  const paymentAmount = willBeCredit ? 0 : Number(sale.total)

  if (primaryPayment?.id) {
    const { error: paymentError } = await supabase
      .from('sale_payments')
      .update({
        method: paymentMethod,
        amount: paymentAmount,
      })
      .eq('id', primaryPayment.id)
      .eq('sale_id', sale.id)

    if (paymentError) {
      console.error('updateSaleAction:payment', paymentError)
      return { error: 'No se pudo actualizar el método de pago.', ok: false }
    }
  } else {
    const { error: paymentInsertError } = await supabase.from('sale_payments').insert({
      sale_id: sale.id,
      method: paymentMethod,
      amount: paymentAmount,
    })

    if (paymentInsertError) {
      console.error('updateSaleAction:paymentInsert', paymentInsertError)
      return { error: 'No se pudo registrar el método de pago.', ok: false }
    }
  }

  if (!wasCredit && willBeCredit && customerId) {
    const { data: existingReceivable } = await supabase
      .from('receivables')
      .select('id')
      .eq('organization_id', access.organization.id)
      .eq('sale_id', sale.id)
      .maybeSingle()

    if (!existingReceivable) {
      const { error: receivableError } = await supabase.from('receivables').insert({
        organization_id: access.organization.id,
        customer_id: customerId,
        sale_id: sale.id,
        document_number: sale.sale_number,
        total: sale.total,
        balance_due: sale.total,
        status: 'open',
      })

      if (receivableError) {
        console.error('updateSaleAction:receivable', receivableError)
        return { error: 'No se pudo crear la cuenta por cobrar.', ok: false }
      }
    } else {
      await supabase
        .from('receivables')
        .update({
          customer_id: customerId,
          status: 'open',
          balance_due: sale.total,
          total: sale.total,
        })
        .eq('id', existingReceivable.id)
    }
  }

  if (wasCredit && !willBeCredit) {
    const { error: receivableError } = await supabase
      .from('receivables')
      .update({
        status: 'paid',
        balance_due: 0,
      })
      .eq('organization_id', access.organization.id)
      .eq('sale_id', sale.id)
      .in('status', ['open', 'partial'])

    if (receivableError) {
      console.error('updateSaleAction:closeReceivable', receivableError)
    }
  }

  if (wasCredit && willBeCredit && customerId) {
    await supabase
      .from('receivables')
      .update({ customer_id: customerId })
      .eq('organization_id', access.organization.id)
      .eq('sale_id', sale.id)
      .in('status', ['open', 'partial'])
  }

  revalidateSalePaths(orgSlug)

  return { error: null, ok: true, saleId: sale.id }
}

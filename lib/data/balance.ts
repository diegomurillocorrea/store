import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  BalanceSummary,
  BalanceTransactionRow,
  CashClosingRow,
  CashSessionSummary,
  PayableBalanceRow,
  ReceivableBalanceRow,
} from '@/lib/data/balance-types'
import { roundMoney } from '@/lib/utils/money'
import { getDayBoundsInTimeZone } from '@/lib/utils/local-date'
import { formatSaleLinesConcept, type SaleLineConceptInput } from '@/lib/utils/sale-format'

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapMemberName(
  member: { display_name: string | null } | { display_name: string | null }[] | null
): string | null {
  const row = Array.isArray(member) ? member[0] : member
  return row?.display_name?.trim() || null
}

function mapSaleLines(
  lines: Array<{
    quantity: unknown
    product: { name: string } | { name: string }[] | null
  }> | null
): SaleLineConceptInput[] {
  if (!lines?.length) return []

  return lines.map((line) => {
    const product = Array.isArray(line.product) ? line.product[0] : line.product
    return {
      quantity: line.quantity,
      productName: product?.name ?? 'Producto',
    }
  })
}

export async function getOrCreateDefaultCashRegisterId(
  organizationId: string,
  locationId: string | null
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  const { data: existing, error: existingError } = await supabase
    .from('cash_registers')
    .select('id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!existingError && existing?.id) {
    return existing.id
  }

  const { data, error } = await supabase
    .from('cash_registers')
    .insert({
      organization_id: organizationId,
      location_id: locationId,
      name: 'Caja principal',
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('getOrCreateDefaultCashRegisterId', error)
    return null
  }

  return data.id
}

export async function getOpenCashSession(
  organizationId: string
): Promise<CashSessionSummary | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('cash_sessions')
    .select(
      `
      id,
      status,
      opening_amount,
      closing_amount,
      difference,
      opened_at,
      closed_at,
      notes,
      opener:organization_members!cash_sessions_opened_by_fkey ( display_name ),
      closer:organization_members!cash_sessions_closed_by_fkey ( display_name ),
      register:cash_registers ( name )
    `
    )
    .eq('organization_id', organizationId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('getOpenCashSession', error)
    return null
  }

  const register = Array.isArray(data.register) ? data.register[0] : data.register

  return {
    id: data.id,
    status: data.status,
    openingAmount: toNumber(data.opening_amount),
    closingAmount: data.closing_amount != null ? toNumber(data.closing_amount) : null,
    difference: data.difference != null ? toNumber(data.difference) : null,
    openedAt: data.opened_at,
    closedAt: data.closed_at,
    openedByName: mapMemberName(data.opener),
    closedByName: mapMemberName(data.closer),
    notes: data.notes,
    registerName: register?.name ?? null,
  }
}

export async function getCashClosings(
  organizationId: string,
  limit = 50
): Promise<CashClosingRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('cash_sessions')
    .select(
      `
      id,
      opening_amount,
      closing_amount,
      difference,
      opened_at,
      closed_at,
      opener:organization_members!cash_sessions_opened_by_fkey ( display_name ),
      closer:organization_members!cash_sessions_closed_by_fkey ( display_name ),
      register:cash_registers ( name )
    `
    )
    .eq('organization_id', organizationId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    console.error('getCashClosings', error)
    return []
  }

  return data.map((row) => {
    const register = Array.isArray(row.register) ? row.register[0] : row.register

    return {
      id: row.id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      openingAmount: toNumber(row.opening_amount),
      closingAmount: row.closing_amount != null ? toNumber(row.closing_amount) : null,
      difference: row.difference != null ? toNumber(row.difference) : null,
      openedByName: mapMemberName(row.opener),
      closedByName: mapMemberName(row.closer),
      registerName: register?.name ?? null,
    }
  })
}

async function getSaleIncomeTransactions(
  organizationId: string,
  date: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const supabase = await createSupabaseServerClient()
  const { start, end } = getDayBoundsInTimeZone(date, timeZone)

  const { data: sales, error } = await supabase
    .from('sales')
    .select(
      `
      id,
      sale_number,
      total,
      created_at,
      customer:customers ( first_name, last_name ),
      payments:sale_payments ( method, amount, created_at ),
      lines:sale_lines (
        quantity,
        product:products ( name )
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })

  if (error || !sales) {
    console.error('getSaleIncomeTransactions', error)
    return []
  }

  const rows: BalanceTransactionRow[] = []

  for (const sale of sales) {
    const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer
    const customerName = customer
      ? `${customer.first_name} ${customer.last_name}`.trim()
      : null
    const payments = sale.payments ?? []
    const concept = formatSaleLinesConcept(mapSaleLines(sale.lines))
    const primaryPayment =
      payments.find((payment) => toNumber(payment.amount) > 0) ?? payments[0] ?? null
    const paidAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
    const amount = paidAmount > 0 ? paidAmount : toNumber(sale.total)

    if (amount <= 0) continue

    rows.push({
      id: `sale-${sale.id}`,
      source: 'sale',
      referenceId: sale.id,
      concept,
      amount,
      occurredAt: primaryPayment?.created_at ?? sale.created_at,
      paymentMethod: primaryPayment?.method ?? null,
      reference: sale.sale_number,
      counterpartyName: customerName,
    })
  }

  return rows
}

async function getReceivablePaymentTransactions(
  organizationId: string,
  date: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const supabase = await createSupabaseServerClient()
  const { start, end } = getDayBoundsInTimeZone(date, timeZone)

  const { data, error } = await supabase
    .from('receivable_payments')
    .select(
      `
      id,
      amount,
      method,
      reference,
      paid_at,
      receivable:receivables!inner (
        organization_id,
        document_number,
        customer:customers ( first_name, last_name )
      )
    `
    )
    .eq('receivable.organization_id', organizationId)
    .gte('paid_at', start)
    .lte('paid_at', end)
    .order('paid_at', { ascending: false })

  if (error || !data) {
    console.error('getReceivablePaymentTransactions', error)
    return []
  }

  return data.map((row) => {
    const receivable = Array.isArray(row.receivable) ? row.receivable[0] : row.receivable
    const customer = receivable?.customer
      ? Array.isArray(receivable.customer)
        ? receivable.customer[0]
        : receivable.customer
      : null
    const customerName = customer
      ? `${customer.first_name} ${customer.last_name}`.trim()
      : null

    return {
      id: `receivable-payment-${row.id}`,
      source: 'receivable_payment',
      referenceId: row.id,
      concept: receivable?.document_number
        ? `Cobro ${receivable.document_number}`
        : 'Cobro a cliente',
      amount: toNumber(row.amount),
      occurredAt: row.paid_at,
      paymentMethod: row.method,
      reference: row.reference,
      counterpartyName: customerName,
    }
  })
}

async function getManualIncomeTransactions(
  organizationId: string,
  date: string
): Promise<BalanceTransactionRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('financial_movements')
    .select('id, concept, amount, payment_method, reference, created_at, movement_date')
    .eq('organization_id', organizationId)
    .eq('movement_type', 'income')
    .eq('movement_date', date)
    .order('created_at', { ascending: false })

  if (error || !data) {
    if (error?.code !== 'PGRST205') {
      console.error('getManualIncomeTransactions', error)
    }
    return []
  }

  return data.map((row) => ({
    id: `manual-income-${row.id}`,
    source: 'manual' as const,
    referenceId: row.id,
    concept: row.concept,
    amount: toNumber(row.amount),
    occurredAt: row.created_at,
    paymentMethod: row.payment_method,
    reference: row.reference,
    counterpartyName: null,
  }))
}

async function getPayablePaymentTransactions(
  organizationId: string,
  date: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const supabase = await createSupabaseServerClient()
  const { start, end } = getDayBoundsInTimeZone(date, timeZone)

  const { data, error } = await supabase
    .from('payable_payments')
    .select(
      `
      id,
      amount,
      method,
      reference,
      paid_at,
      payable:payables!inner (
        organization_id,
        document_number,
        supplier:suppliers ( name )
      )
    `
    )
    .eq('payable.organization_id', organizationId)
    .gte('paid_at', start)
    .lte('paid_at', end)
    .order('paid_at', { ascending: false })

  if (error || !data) {
    console.error('getPayablePaymentTransactions', error)
    return []
  }

  return data.map((row) => {
    const payable = Array.isArray(row.payable) ? row.payable[0] : row.payable
    const supplier = payable?.supplier
      ? Array.isArray(payable.supplier)
        ? payable.supplier[0]
        : payable.supplier
      : null

    return {
      id: `payable-payment-${row.id}`,
      source: 'payable_payment' as const,
      referenceId: row.id,
      concept: payable?.document_number
        ? `Pago ${payable.document_number}`
        : 'Pago a proveedor',
      amount: toNumber(row.amount),
      occurredAt: row.paid_at,
      paymentMethod: row.method,
      reference: row.reference,
      counterpartyName: supplier?.name ?? null,
    }
  })
}

async function getManualExpenseTransactions(
  organizationId: string,
  date: string
): Promise<BalanceTransactionRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('financial_movements')
    .select('id, concept, amount, payment_method, reference, created_at, movement_date')
    .eq('organization_id', organizationId)
    .eq('movement_type', 'expense')
    .eq('movement_date', date)
    .order('created_at', { ascending: false })

  if (error || !data) {
    if (error?.code !== 'PGRST205') {
      console.error('getManualExpenseTransactions', error)
    }
    return []
  }

  return data.map((row) => ({
    id: `manual-expense-${row.id}`,
    source: 'manual' as const,
    referenceId: row.id,
    concept: row.concept,
    amount: toNumber(row.amount),
    occurredAt: row.created_at,
    paymentMethod: row.payment_method,
    reference: row.reference,
    counterpartyName: null,
  }))
}

export async function getIncomeTransactions(
  organizationId: string,
  date: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const [sales, receivablePayments, manual] = await Promise.all([
    getSaleIncomeTransactions(organizationId, date, timeZone),
    getReceivablePaymentTransactions(organizationId, date, timeZone),
    getManualIncomeTransactions(organizationId, date),
  ])

  return [...sales, ...receivablePayments, ...manual].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export async function getExpenseTransactions(
  organizationId: string,
  date: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const [payablePayments, manual] = await Promise.all([
    getPayablePaymentTransactions(organizationId, date, timeZone),
    getManualExpenseTransactions(organizationId, date),
  ])

  return [...payablePayments, ...manual].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export async function getOpenReceivables(
  organizationId: string
): Promise<ReceivableBalanceRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('receivables')
    .select(
      `
      id,
      document_number,
      total,
      balance_due,
      issued_at,
      due_at,
      status,
      customer:customers ( first_name, last_name )
    `
    )
    .eq('organization_id', organizationId)
    .in('status', ['open', 'partial'])
    .gt('balance_due', 0)
    .order('issued_at', { ascending: false })

  if (error || !data) {
    console.error('getOpenReceivables', error)
    return []
  }

  return data.map((row) => {
    const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer

    return {
      id: row.id,
      documentNumber: row.document_number,
      customerName: customer
        ? `${customer.first_name} ${customer.last_name}`.trim()
        : 'Cliente',
      total: toNumber(row.total),
      balanceDue: toNumber(row.balance_due),
      issuedAt: row.issued_at,
      dueAt: row.due_at,
      status: row.status,
    }
  })
}

export async function getOpenPayables(organizationId: string): Promise<PayableBalanceRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('payables')
    .select(
      `
      id,
      document_number,
      total,
      balance_due,
      issued_at,
      due_at,
      status,
      supplier:suppliers ( name )
    `
    )
    .eq('organization_id', organizationId)
    .in('status', ['open', 'partial'])
    .gt('balance_due', 0)
    .order('issued_at', { ascending: false })

  if (error || !data) {
    console.error('getOpenPayables', error)
    return []
  }

  return data.map((row) => {
    const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier

    return {
      id: row.id,
      documentNumber: row.document_number,
      supplierName: supplier?.name ?? 'Proveedor',
      total: toNumber(row.total),
      balanceDue: toNumber(row.balance_due),
      issuedAt: row.issued_at,
      dueAt: row.due_at,
      status: row.status,
    }
  })
}

export async function getBalanceSummary(
  organizationId: string,
  date: string,
  timeZone: string
): Promise<BalanceSummary> {
  const [incomeRows, expenseRows] = await Promise.all([
    getIncomeTransactions(organizationId, date, timeZone),
    getExpenseTransactions(organizationId, date, timeZone),
  ])

  const totalSales = roundMoney(
    incomeRows
      .filter((row) => row.source === 'sale')
      .reduce((sum, row) => sum + row.amount, 0)
  )
  const totalIncome = roundMoney(incomeRows.reduce((sum, row) => sum + row.amount, 0))
  const totalExpenses = roundMoney(expenseRows.reduce((sum, row) => sum + row.amount, 0))

  return {
    totalSales,
    totalExpenses,
    balance: roundMoney(totalIncome - totalExpenses),
  }
}

import { and, asc, desc, eq, gte, gt, inArray, isNotNull, lte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { toNumberOrZero } from '@/lib/db/numeric'
import {
  cashRegisters,
  cashSessions,
  customers,
  employees,
  financialMovements,
  organizationMembers,
  payablePayments,
  payables,
  products,
  receivablePayments,
  receivables,
  saleLines,
  salePayments,
  sales,
  suppliers,
} from '@/lib/db/schema'
import type {
  BalanceSummary,
  BalanceTransactionRow,
  CashClosingRow,
  CashOperatorOption,
  CashSessionSummary,
  PayableBalanceRow,
  ReceivableBalanceRow,
} from '@/lib/data/balance-types'
import { roundMoney } from '@/lib/utils/money'
import { getDateRangeBoundsInTimeZone } from '@/lib/utils/local-date'
import { formatSaleLinesConcept } from '@/lib/utils/sale-format'

export async function getOrCreateDefaultCashRegisterId(
  organizationId: string,
  locationId: string | null
): Promise<string | null> {
  try {
    const [existing] = await db
      .select({ id: cashRegisters.id })
      .from(cashRegisters)
      .where(eq(cashRegisters.organizationId, organizationId))
      .orderBy(asc(cashRegisters.createdAt))
      .limit(1)

    if (existing?.id) return existing.id

    const [created] = await db
      .insert(cashRegisters)
      .values({
        organizationId,
        locationId,
        name: 'Caja principal',
      })
      .returning({ id: cashRegisters.id })

    return created?.id ?? null
  } catch (err) {
    console.error('getOrCreateDefaultCashRegisterId', err)
    return null
  }
}

export async function getCashOperators(
  organizationId: string
): Promise<CashOperatorOption[]> {
  try {
    const [membersRows, employeesRows] = await Promise.all([
      db
        .select({
          id: organizationMembers.id,
          displayName: organizationMembers.displayName,
          userId: organizationMembers.userId,
        })
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, 'active')
        ))
        .orderBy(asc(organizationMembers.displayName)),
      db
        .select({
          userId: employees.userId,
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(and(
          eq(employees.organizationId, organizationId),
          eq(employees.status, 'active'),
          isNotNull(employees.userId)
        )),
    ])

    const employeeNameByUserId = new Map<string, string>()
    for (const employee of employeesRows) {
      if (!employee.userId) continue
      const name = [employee.firstName, employee.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
      if (name) employeeNameByUserId.set(employee.userId, name)
    }

    return membersRows.map((member) => {
      const employeeName = member.userId
        ? employeeNameByUserId.get(member.userId)
        : null
      const displayName = member.displayName?.trim() || null
      return {
        id: member.id,
        name: employeeName || displayName || 'Sin nombre',
      }
    })
  } catch (err) {
    console.error('getCashOperators', err)
    return []
  }
}

export async function getOpenCashSession(
  organizationId: string
): Promise<CashSessionSummary | null> {
  try {
    const opener = alias(organizationMembers, 'opener')
    const closer = alias(organizationMembers, 'closer')

    const [row] = await db
      .select({
        id: cashSessions.id,
        status: cashSessions.status,
        openingAmount: cashSessions.openingAmount,
        closingAmount: cashSessions.closingAmount,
        difference: cashSessions.difference,
        openedAt: cashSessions.openedAt,
        closedAt: cashSessions.closedAt,
        notes: cashSessions.notes,
        openerName: opener.displayName,
        closerName: closer.displayName,
        registerName: cashRegisters.name,
      })
      .from(cashSessions)
      .leftJoin(opener, eq(cashSessions.openedBy, opener.id))
      .leftJoin(closer, eq(cashSessions.closedBy, closer.id))
      .leftJoin(cashRegisters, eq(cashSessions.cashRegisterId, cashRegisters.id))
      .where(and(
        eq(cashSessions.organizationId, organizationId),
        eq(cashSessions.status, 'open')
      ))
      .orderBy(desc(cashSessions.openedAt))
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      status: row.status,
      openingAmount: toNumberOrZero(row.openingAmount),
      closingAmount: row.closingAmount != null ? toNumberOrZero(row.closingAmount) : null,
      difference: row.difference != null ? toNumberOrZero(row.difference) : null,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      openedByName: row.openerName?.trim() || null,
      closedByName: row.closerName?.trim() || null,
      notes: row.notes,
      registerName: row.registerName ?? null,
    }
  } catch (err) {
    console.error('getOpenCashSession', err)
    return null
  }
}

export async function getCashClosings(
  organizationId: string,
  limit = 50
): Promise<CashClosingRow[]> {
  try {
    const opener = alias(organizationMembers, 'opener')
    const closer = alias(organizationMembers, 'closer')

    const rows = await db
      .select({
        id: cashSessions.id,
        openingAmount: cashSessions.openingAmount,
        closingAmount: cashSessions.closingAmount,
        difference: cashSessions.difference,
        openedAt: cashSessions.openedAt,
        closedAt: cashSessions.closedAt,
        openerName: opener.displayName,
        closerName: closer.displayName,
        registerName: cashRegisters.name,
      })
      .from(cashSessions)
      .leftJoin(opener, eq(cashSessions.openedBy, opener.id))
      .leftJoin(closer, eq(cashSessions.closedBy, closer.id))
      .leftJoin(cashRegisters, eq(cashSessions.cashRegisterId, cashRegisters.id))
      .where(and(
        eq(cashSessions.organizationId, organizationId),
        eq(cashSessions.status, 'closed')
      ))
      .orderBy(desc(cashSessions.closedAt))
      .limit(limit)

    return rows.map((row) => ({
      id: row.id,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      openingAmount: toNumberOrZero(row.openingAmount),
      closingAmount: row.closingAmount != null ? toNumberOrZero(row.closingAmount) : null,
      difference: row.difference != null ? toNumberOrZero(row.difference) : null,
      openedByName: row.openerName?.trim() || null,
      closedByName: row.closerName?.trim() || null,
      registerName: row.registerName ?? null,
    }))
  } catch (err) {
    console.error('getCashClosings', err)
    return []
  }
}

async function getSaleIncomeTransactions(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const { start, end } = getDateRangeBoundsInTimeZone(startDate, endDate, timeZone)

  try {
    const salesRows = await db
      .select({
        id: sales.id,
        saleNumber: sales.saleNumber,
        total: sales.total,
        createdAt: sales.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(and(
        eq(sales.organizationId, organizationId),
        eq(sales.status, 'completed'),
        gte(sales.createdAt, start),
        lte(sales.createdAt, end)
      ))
      .orderBy(desc(sales.createdAt))

    if (salesRows.length === 0) return []

    const saleIds = salesRows.map((s) => s.id)

    const [paymentsRows, linesRows] = await Promise.all([
      db
        .select({
          saleId: salePayments.saleId,
          method: salePayments.method,
          amount: salePayments.amount,
        })
        .from(salePayments)
        .where(inArray(salePayments.saleId, saleIds)),
      db
        .select({
          saleId: saleLines.saleId,
          quantity: saleLines.quantity,
          productName: products.name,
        })
        .from(saleLines)
        .leftJoin(products, eq(saleLines.productId, products.id))
        .where(inArray(saleLines.saleId, saleIds)),
    ])

    const paymentsBySaleId = new Map<string, typeof paymentsRows>()
    for (const row of paymentsRows) {
      const arr = paymentsBySaleId.get(row.saleId) ?? []
      arr.push(row)
      paymentsBySaleId.set(row.saleId, arr)
    }

    const linesBySaleId = new Map<string, typeof linesRows>()
    for (const row of linesRows) {
      const arr = linesBySaleId.get(row.saleId) ?? []
      arr.push(row)
      linesBySaleId.set(row.saleId, arr)
    }

    const rows: BalanceTransactionRow[] = []

    for (const sale of salesRows) {
      const pmts = paymentsBySaleId.get(sale.id) ?? []
      const lines = linesBySaleId.get(sale.id) ?? []
      const customerName = sale.customerFirstName
        ? `${sale.customerFirstName} ${sale.customerLastName ?? ''}`.trim()
        : null
      const concept = formatSaleLinesConcept(
        lines.map((l) => ({
          quantity: l.quantity,
          productName: l.productName ?? 'Producto',
        }))
      )
      const primaryPayment = pmts.find((p) => toNumberOrZero(p.amount) > 0) ?? pmts[0] ?? null
      const paidAmount = pmts.reduce((sum, p) => sum + toNumberOrZero(p.amount), 0)
      const amount = paidAmount > 0 ? paidAmount : toNumberOrZero(sale.total)

      if (amount <= 0) continue

      rows.push({
        id: `sale-${sale.id}`,
        source: 'sale',
        referenceId: sale.id,
        concept,
        amount,
        occurredAt: sale.createdAt,
        paymentMethod: primaryPayment?.method ?? null,
        reference: sale.saleNumber,
        counterpartyName: customerName,
      })
    }

    return rows
  } catch (err) {
    console.error('getSaleIncomeTransactions', err)
    return []
  }
}

async function getReceivablePaymentTransactions(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const { start, end } = getDateRangeBoundsInTimeZone(startDate, endDate, timeZone)

  try {
    const rows = await db
      .select({
        id: receivablePayments.id,
        amount: receivablePayments.amount,
        method: receivablePayments.method,
        reference: receivablePayments.reference,
        paidAt: receivablePayments.paidAt,
        documentNumber: receivables.documentNumber,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
      })
      .from(receivablePayments)
      .innerJoin(receivables, eq(receivablePayments.receivableId, receivables.id))
      .leftJoin(customers, eq(receivables.customerId, customers.id))
      .where(and(
        eq(receivables.organizationId, organizationId),
        gte(receivablePayments.paidAt, start),
        lte(receivablePayments.paidAt, end)
      ))
      .orderBy(desc(receivablePayments.paidAt))

    return rows.map((row) => ({
      id: `receivable-payment-${row.id}`,
      source: 'receivable_payment' as const,
      referenceId: row.id,
      concept: row.documentNumber ? `Cobro ${row.documentNumber}` : 'Cobro a cliente',
      amount: toNumberOrZero(row.amount),
      occurredAt: row.paidAt,
      paymentMethod: row.method,
      reference: row.reference,
      counterpartyName: row.customerFirstName
        ? `${row.customerFirstName} ${row.customerLastName ?? ''}`.trim()
        : null,
    }))
  } catch (err) {
    console.error('getReceivablePaymentTransactions', err)
    return []
  }
}

async function getManualIncomeTransactions(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<BalanceTransactionRow[]> {
  try {
    const rows = await db
      .select({
        id: financialMovements.id,
        concept: financialMovements.concept,
        amount: financialMovements.amount,
        paymentMethod: financialMovements.paymentMethod,
        reference: financialMovements.reference,
        createdAt: financialMovements.createdAt,
      })
      .from(financialMovements)
      .where(and(
        eq(financialMovements.organizationId, organizationId),
        eq(financialMovements.movementType, 'income'),
        gte(financialMovements.movementDate, startDate),
        lte(financialMovements.movementDate, endDate)
      ))
      .orderBy(desc(financialMovements.createdAt))

    return rows.map((row) => ({
      id: `manual-income-${row.id}`,
      source: 'manual' as const,
      referenceId: row.id,
      concept: row.concept,
      amount: toNumberOrZero(row.amount),
      occurredAt: row.createdAt,
      paymentMethod: row.paymentMethod,
      reference: row.reference,
      counterpartyName: null,
    }))
  } catch (err) {
    console.error('getManualIncomeTransactions', err)
    return []
  }
}

async function getPayablePaymentTransactions(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const { start, end } = getDateRangeBoundsInTimeZone(startDate, endDate, timeZone)

  try {
    const rows = await db
      .select({
        id: payablePayments.id,
        amount: payablePayments.amount,
        method: payablePayments.method,
        reference: payablePayments.reference,
        paidAt: payablePayments.paidAt,
        documentNumber: payables.documentNumber,
        supplierName: suppliers.name,
      })
      .from(payablePayments)
      .innerJoin(payables, eq(payablePayments.payableId, payables.id))
      .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
      .where(and(
        eq(payables.organizationId, organizationId),
        gte(payablePayments.paidAt, start),
        lte(payablePayments.paidAt, end)
      ))
      .orderBy(desc(payablePayments.paidAt))

    return rows.map((row) => ({
      id: `payable-payment-${row.id}`,
      source: 'payable_payment' as const,
      referenceId: row.id,
      concept: row.documentNumber ? `Pago ${row.documentNumber}` : 'Pago a proveedor',
      amount: toNumberOrZero(row.amount),
      occurredAt: row.paidAt,
      paymentMethod: row.method,
      reference: row.reference,
      counterpartyName: row.supplierName ?? null,
    }))
  } catch (err) {
    console.error('getPayablePaymentTransactions', err)
    return []
  }
}

async function getManualExpenseTransactions(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<BalanceTransactionRow[]> {
  try {
    const rows = await db
      .select({
        id: financialMovements.id,
        concept: financialMovements.concept,
        amount: financialMovements.amount,
        paymentMethod: financialMovements.paymentMethod,
        reference: financialMovements.reference,
        createdAt: financialMovements.createdAt,
      })
      .from(financialMovements)
      .where(and(
        eq(financialMovements.organizationId, organizationId),
        eq(financialMovements.movementType, 'expense'),
        gte(financialMovements.movementDate, startDate),
        lte(financialMovements.movementDate, endDate)
      ))
      .orderBy(desc(financialMovements.createdAt))

    return rows.map((row) => ({
      id: `manual-expense-${row.id}`,
      source: 'manual' as const,
      referenceId: row.id,
      concept: row.concept,
      amount: toNumberOrZero(row.amount),
      occurredAt: row.createdAt,
      paymentMethod: row.paymentMethod,
      reference: row.reference,
      counterpartyName: null,
    }))
  } catch (err) {
    console.error('getManualExpenseTransactions', err)
    return []
  }
}

export async function getIncomeTransactions(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const [saleTxs, receivablePaymentTxs, manual] = await Promise.all([
    getSaleIncomeTransactions(organizationId, startDate, endDate, timeZone),
    getReceivablePaymentTransactions(organizationId, startDate, endDate, timeZone),
    getManualIncomeTransactions(organizationId, startDate, endDate),
  ])

  return [...saleTxs, ...receivablePaymentTxs, ...manual].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export async function getExpenseTransactions(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<BalanceTransactionRow[]> {
  const [payablePaymentTxs, manual] = await Promise.all([
    getPayablePaymentTransactions(organizationId, startDate, endDate, timeZone),
    getManualExpenseTransactions(organizationId, startDate, endDate),
  ])

  return [...payablePaymentTxs, ...manual].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export async function getOpenReceivables(
  organizationId: string
): Promise<ReceivableBalanceRow[]> {
  try {
    const rows = await db
      .select({
        id: receivables.id,
        documentNumber: receivables.documentNumber,
        total: receivables.total,
        balanceDue: receivables.balanceDue,
        issuedAt: receivables.issuedAt,
        dueAt: receivables.dueAt,
        status: receivables.status,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
      })
      .from(receivables)
      .leftJoin(customers, eq(receivables.customerId, customers.id))
      .where(and(
        eq(receivables.organizationId, organizationId),
        inArray(receivables.status, ['open', 'partial']),
        gt(receivables.balanceDue, '0')
      ))
      .orderBy(desc(receivables.issuedAt))

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      customerName: row.customerFirstName
        ? `${row.customerFirstName} ${row.customerLastName ?? ''}`.trim()
        : 'Cliente',
      total: toNumberOrZero(row.total),
      balanceDue: toNumberOrZero(row.balanceDue),
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      status: row.status,
    }))
  } catch (err) {
    console.error('getOpenReceivables', err)
    return []
  }
}

export async function getOpenPayables(
  organizationId: string
): Promise<PayableBalanceRow[]> {
  try {
    const rows = await db
      .select({
        id: payables.id,
        documentNumber: payables.documentNumber,
        total: payables.total,
        balanceDue: payables.balanceDue,
        issuedAt: payables.issuedAt,
        dueAt: payables.dueAt,
        status: payables.status,
        supplierName: suppliers.name,
      })
      .from(payables)
      .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
      .where(and(
        eq(payables.organizationId, organizationId),
        inArray(payables.status, ['open', 'partial']),
        gt(payables.balanceDue, '0')
      ))
      .orderBy(desc(payables.issuedAt))

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      supplierName: row.supplierName ?? 'Proveedor',
      total: toNumberOrZero(row.total),
      balanceDue: toNumberOrZero(row.balanceDue),
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      status: row.status,
    }))
  } catch (err) {
    console.error('getOpenPayables', err)
    return []
  }
}

export async function getBalanceSummary(
  organizationId: string,
  startDate: string,
  endDate: string,
  timeZone: string
): Promise<BalanceSummary> {
  const [incomeRows, expenseRows] = await Promise.all([
    getIncomeTransactions(organizationId, startDate, endDate, timeZone),
    getExpenseTransactions(organizationId, startDate, endDate, timeZone),
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

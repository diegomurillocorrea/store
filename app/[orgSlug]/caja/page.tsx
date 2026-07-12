import { BalancePanel } from '@/components/caja/balance-panel'
import { requireViewAccess } from '@/lib/auth/access'
import {
  getBalanceSummary,
  getCashClosings,
  getCashOperators,
  getExpenseTransactions,
  getIncomeTransactions,
  getOpenCashSession,
  getOpenPayables,
  getOpenReceivables,
} from '@/lib/data/balance'
import { getCustomersByOrganizationId } from '@/lib/data/customers'
import { getViewActionFlags } from '@/lib/permissions/views'
import {
  getTodayDateString,
  isValidBalancePeriod,
  isValidDateString,
  resolveBalanceDateRange,
} from '@/lib/utils/local-date'

interface CajaPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    fecha?: string
    fechaHasta?: string
    periodo?: string
  }>
}

export default async function CajaPage({ params, searchParams }: CajaPageProps) {
  const { orgSlug } = await params
  const { fecha, fechaHasta, periodo } = await searchParams
  const access = await requireViewAccess(orgSlug, 'caja')
  const organizationId = access.organization.id
  const timeZone = access.organization.timezone || 'America/Mexico_City'
  const actions = getViewActionFlags(access.permissions, 'caja')
  const saleActions = getViewActionFlags(access.permissions, 'pos')
  const hasExplicitDate = isValidDateString(fecha)
  const selectedDate = hasExplicitDate ? fecha : getTodayDateString(timeZone)
  const selectedPeriod = isValidBalancePeriod(periodo) ? periodo : 'diario'
  const selectedEndDate = isValidDateString(fechaHasta) ? fechaHasta : selectedDate
  const { startDate, endDate } = resolveBalanceDateRange(
    selectedPeriod,
    selectedDate,
    selectedEndDate
  )

  const [
    summary,
    openSession,
    incomeTransactions,
    expenseTransactions,
    receivables,
    payables,
    cashClosings,
    customers,
    cashOperators,
  ] = await Promise.all([
    getBalanceSummary(organizationId, startDate, endDate, timeZone),
    getOpenCashSession(organizationId),
    getIncomeTransactions(organizationId, startDate, endDate, timeZone),
    getExpenseTransactions(organizationId, startDate, endDate, timeZone),
    getOpenReceivables(organizationId),
    getOpenPayables(organizationId),
    getCashClosings(organizationId),
    getCustomersByOrganizationId(organizationId),
    getCashOperators(organizationId),
  ])

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <BalancePanel
        orgSlug={orgSlug}
        organizationName={access.organization.name}
        customers={customers}
        cashOperators={cashOperators}
        currentMemberId={access.memberId}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        startDate={startDate}
        endDate={endDate}
        selectedPeriod={selectedPeriod}
        hasExplicitDate={hasExplicitDate}
        timeZone={timeZone}
        summary={summary}
        openSession={openSession}
        incomeTransactions={incomeTransactions}
        expenseTransactions={expenseTransactions}
        receivables={receivables}
        payables={payables}
        cashClosings={cashClosings}
        actions={actions}
        saleActions={{
          canEdit: saleActions.canEdit,
          canDelete: saleActions.canDelete,
        }}
      />
    </div>
  )
}

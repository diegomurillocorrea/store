import { BalancePanel } from '@/components/caja/balance-panel'
import { requireViewAccess } from '@/lib/auth/access'
import {
  getBalanceSummary,
  getCashClosings,
  getExpenseTransactions,
  getIncomeTransactions,
  getOpenCashSession,
  getOpenPayables,
  getOpenReceivables,
} from '@/lib/data/balance'
import { getViewActionFlags } from '@/lib/permissions/views'
import { getTodayDateString, isValidDateString } from '@/lib/utils/local-date'

interface CajaPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ fecha?: string }>
}

export default async function CajaPage({ params, searchParams }: CajaPageProps) {
  const { orgSlug } = await params
  const { fecha } = await searchParams
  const access = await requireViewAccess(orgSlug, 'caja')
  const organizationId = access.organization.id
  const timeZone = access.organization.timezone || 'America/Mexico_City'
  const actions = getViewActionFlags(access.permissions, 'caja')
  const hasExplicitDate = isValidDateString(fecha)
  const selectedDate = hasExplicitDate ? fecha : getTodayDateString(timeZone)

  const [
    summary,
    openSession,
    incomeTransactions,
    expenseTransactions,
    receivables,
    payables,
    cashClosings,
  ] = await Promise.all([
    getBalanceSummary(organizationId, selectedDate, timeZone),
    getOpenCashSession(organizationId),
    getIncomeTransactions(organizationId, selectedDate, timeZone),
    getExpenseTransactions(organizationId, selectedDate, timeZone),
    getOpenReceivables(organizationId),
    getOpenPayables(organizationId),
    getCashClosings(organizationId),
  ])

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <BalancePanel
        orgSlug={orgSlug}
        selectedDate={selectedDate}
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
      />
    </div>
  )
}

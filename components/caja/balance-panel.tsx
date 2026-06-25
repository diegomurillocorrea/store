'use client'

import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { CashSessionDialog } from '@/components/caja/cash-session-dialog'
import { CreateMovementDialog } from '@/components/caja/create-movement-dialog'
import { SaleDetailSidebar } from '@/components/caja/sale-detail-sidebar'
import { getSaleDetailAction } from '@/lib/actions/sale-detail-actions'
import type {
  BalanceMainTab,
  BalanceSummary,
  BalanceTransactionRow,
  BalanceTransactionTab,
  CashClosingRow,
  CashSessionSummary,
  PayableBalanceRow,
  ReceivableBalanceRow,
} from '@/lib/data/balance-types'
import { PAYMENT_METHOD_LABELS } from '@/lib/data/balance-types'
import type { FinancialMovementType } from '@/lib/data/financial-movement-types'
import type { SaleDetail } from '@/lib/data/sale-detail-types'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { formatCurrency } from '@/lib/utils/money'
import { formatDisplayDate, getBrowserLocalDateString } from '@/lib/utils/local-date'
import { Badge } from '@/styles/catalyst-ui-kit/badge'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface BalancePanelProps {
  orgSlug: string
  selectedDate: string
  hasExplicitDate: boolean
  timeZone: string
  summary: BalanceSummary
  openSession: CashSessionSummary | null
  incomeTransactions: BalanceTransactionRow[]
  expenseTransactions: BalanceTransactionRow[]
  receivables: ReceivableBalanceRow[]
  payables: PayableBalanceRow[]
  cashClosings: CashClosingRow[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canDelete'>
}

const mainTabs: { id: BalanceMainTab; label: string }[] = [
  { id: 'transacciones', label: 'Transacciones' },
  { id: 'cierres', label: 'Cierres de caja' },
]

const transactionTabs: { id: BalanceTransactionTab; label: string }[] = [
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'egresos', label: 'Egresos' },
  { id: 'por-cobrar', label: 'Por cobrar' },
  { id: 'por-pagar', label: 'Por pagar' },
]

const balanceSurfaceClass =
  'border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

const balanceInputClass =
  '[&_input]:border-zinc-200! [&_input]:bg-white! [&_input]:text-zinc-900! [&_input]:shadow-sm before:bg-white! dark:[&_input]:border-zinc-700! dark:[&_input]:bg-zinc-900! dark:[&_input]:text-zinc-100! dark:before:hidden'

function formatDateTime(value: string, timeZone: string): string {
  const date = new Date(value)
  const datePart = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)

  return `${datePart} | ${timePart}`
}

function TransactionRow({
  row,
  timeZone,
  onSaleClick,
}: {
  row: BalanceTransactionRow
  timeZone: string
  onSaleClick?: (saleId: string) => void
}) {
  const isSale = row.source === 'sale'
  const Icon = isSale ? BanknotesIcon : WalletIcon
  const iconClass = isSale
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400'
  const isClickable = isSale && Boolean(row.referenceId && onSaleClick)

  const handleClick = () => {
    if (!isClickable || !row.referenceId || !onSaleClick) return
    onSaleClick(row.referenceId)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`flex items-center gap-4 bg-white px-4 py-4 dark:bg-zinc-900 ${
        isClickable
          ? 'cursor-pointer transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500 dark:hover:bg-zinc-800'
          : ''
      }`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.concept}</p>
        {!isSale && row.counterpartyName ? (
          <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {row.counterpartyName}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-4">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {formatCurrency(row.amount)}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {row.paymentMethod
            ? PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod
            : '—'}
        </span>
        <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">
          {formatDateTime(row.occurredAt, timeZone)}
        </span>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone: 'neutral' | 'positive' | 'negative'
  icon: React.ComponentType<{ className?: string }>
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-900 dark:text-zinc-100'

  const iconClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500 dark:text-zinc-400'

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className={`size-5 ${iconClass}`} aria-hidden="true" />
        </div>
        <div>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
          <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass}`}>
            {formatCurrency(value)}
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  message,
  canCreate,
  onCreate,
}: {
  message: string
  canCreate: boolean
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
        <WalletIcon className="size-8 text-amber-500" aria-hidden="true" />
      </div>
      <Text className="max-w-sm text-zinc-600 dark:text-zinc-300">{message}</Text>
      {canCreate ? (
        <Button type="button" color="dark/zinc" className="mt-6" onClick={onCreate}>
          Crear un movimiento
        </Button>
      ) : null}
    </div>
  )
}

export function BalancePanel({
  orgSlug,
  selectedDate,
  hasExplicitDate,
  timeZone,
  summary,
  openSession,
  incomeTransactions,
  expenseTransactions,
  receivables,
  payables,
  cashClosings,
  actions,
}: BalancePanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mainTab, setMainTab] = useState<BalanceMainTab>('transacciones')
  const [transactionTab, setTransactionTab] = useState<BalanceTransactionTab>('ingresos')
  const [searchQuery, setSearchQuery] = useState('')
  const [cashDialogMode, setCashDialogMode] = useState<'open' | 'close' | null>(null)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [movementDefaultType, setMovementDefaultType] = useState<FinancialMovementType>('income')
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null)
  const [saleDetailOpen, setSaleDetailOpen] = useState(false)
  const [saleDetailError, setSaleDetailError] = useState<string | null>(null)
  const [isSaleDetailPending, startSaleDetailTransition] = useTransition()

  const isCashOpen = Boolean(openSession)

  useEffect(() => {
    const fechaParam = searchParams.get('fecha')
    if (fechaParam) return

    const localToday = getBrowserLocalDateString()
    if (selectedDate !== localToday) {
      router.replace(`/${orgSlug}/caja?fecha=${localToday}`)
    }
  }, [hasExplicitDate, orgSlug, router, searchParams, selectedDate])

  const handleSaleClick = useCallback(
    (saleId: string) => {
      setSaleDetailOpen(true)
      setSaleDetailError(null)
      setSelectedSale(null)

      startSaleDetailTransition(async () => {
        const detail = await getSaleDetailAction(orgSlug, saleId)
        if (!detail) {
          setSaleDetailError('No se pudo cargar el detalle de la venta.')
          return
        }
        setSelectedSale(detail)
      })
    },
    [orgSlug]
  )

  const handleCloseSaleDetail = useCallback(() => {
    setSaleDetailOpen(false)
    setSaleDetailError(null)
    setSelectedSale(null)
  }, [])

  const filteredIncome = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return incomeTransactions
    return incomeTransactions.filter((row) =>
      [row.concept, row.counterpartyName ?? '', row.reference ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [incomeTransactions, searchQuery])

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return expenseTransactions
    return expenseTransactions.filter((row) =>
      [row.concept, row.counterpartyName ?? '', row.reference ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [expenseTransactions, searchQuery])

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams()
    if (value) params.set('fecha', value)
    const query = params.toString()
    router.push(query ? `/${orgSlug}/caja?${query}` : `/${orgSlug}/caja`)
  }

  const handleOpenMovementDialog = (type: FinancialMovementType = 'income') => {
    setMovementDefaultType(type)
    setMovementDialogOpen(true)
  }

  const renderTransactionRows = (rows: BalanceTransactionRow[]) => {
    if (rows.length === 0) {
      return (
        <EmptyState
          message="Aún no tienes registros creados en esta fecha."
          canCreate={actions.canCreate}
          onCreate={() =>
            handleOpenMovementDialog(transactionTab === 'egresos' ? 'expense' : 'income')
          }
        />
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <TransactionRow key={row.id} row={row} timeZone={timeZone} onSaleClick={handleSaleClick} />
          ))}
        </div>
      </div>
    )
  }

  const renderReceivableRows = () => {
    if (receivables.length === 0) {
      return (
        <EmptyState
          message="No hay cuentas por cobrar pendientes."
          canCreate={false}
          onCreate={() => {}}
        />
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Documento
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {receivables.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {row.customerName}
                </td>
                <td className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {row.documentNumber ?? '—'}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(row.balanceDue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderPayableRows = () => {
    if (payables.length === 0) {
      return (
        <EmptyState
          message="No hay cuentas por pagar pendientes."
          canCreate={false}
          onCreate={() => {}}
        />
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Proveedor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Documento
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {payables.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {row.supplierName}
                </td>
                <td className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {row.documentNumber ?? '—'}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(row.balanceDue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderCashClosings = () => {
    if (cashClosings.length === 0) {
      return (
        <EmptyState
          message="Aún no hay cierres de caja registrados."
          canCreate={actions.canCreate && !isCashOpen}
          onCreate={() => setCashDialogMode('open')}
        />
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Cierre
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Apertura
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Diferencia
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {cashClosings.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.closedAt ? formatDateTime(row.closedAt, timeZone) : '—'}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {row.closedByName ?? row.openedByName ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(row.openingAmount)} →{' '}
                  {row.closingAmount != null ? formatCurrency(row.closingAmount) : '—'}
                </td>
                <td
                  className={`px-4 py-4 text-right font-semibold ${
                    (row.difference ?? 0) < 0
                      ? 'text-red-600 dark:text-red-400'
                      : (row.difference ?? 0) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {row.difference != null ? formatCurrency(row.difference) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Balance
          </h1>
          <Text className="mt-1 text-zinc-500 dark:text-zinc-400">
            Movimientos, ventas, gastos y estado de caja.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCashOpen ? (
            <Badge color="emerald" className="px-3 py-1.5 text-sm">
              <WalletIcon className="size-4" aria-hidden="true" />
              Caja abierta
            </Badge>
          ) : (
            <Badge color="zinc" className="px-3 py-1.5 text-sm">
              <WalletIcon className="size-4" aria-hidden="true" />
              Caja cerrada
            </Badge>
          )}

          {actions.canCreate && !isCashOpen ? (
            <Button type="button" outline onClick={() => setCashDialogMode('open')}>
              Abrir caja
            </Button>
          ) : null}

          {actions.canDelete && isCashOpen ? (
            <Button type="button" outline onClick={() => setCashDialogMode('close')}>
              Cerrar caja
            </Button>
          ) : null}

          {actions.canCreate ? (
            <Button
              type="button"
              color="dark/zinc"
              onClick={() => handleOpenMovementDialog('income')}
            >
              Crear movimiento
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
        {mainTabs.map((tab) => {
          const isActive = mainTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMainTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {mainTab === 'transacciones' ? (
        <>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${balanceSurfaceClass}`}
              >
                <CalendarDaysIcon className="size-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span className="text-zinc-700 dark:text-zinc-200">Diario</span>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                aria-label="Fecha"
                className={`w-auto ${balanceInputClass}`}
              />
              <span
                className={`inline-flex rounded-xl px-3 py-2 text-sm ${balanceSurfaceClass}`}
              >
                <span className="text-zinc-600 dark:text-zinc-300">
                  {formatDisplayDate(selectedDate, timeZone)}
                </span>
              </span>
            </div>

            <div className={`w-full max-w-md rounded-xl ${balanceSurfaceClass}`}>
              <InputGroup className="[&_input]:border-0! [&_input]:bg-transparent! [&_input]:shadow-none! dark:[&_input]:bg-transparent!">
                <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
                <Input
                  type="search"
                  placeholder="Buscar concepto..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Buscar concepto"
                  className="before:hidden!"
                />
              </InputGroup>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Balance"
              value={summary.balance}
              tone={summary.balance >= 0 ? 'positive' : 'negative'}
              icon={ArrowTrendingUpIcon}
            />
            <SummaryCard
              label="Ventas totales"
              value={summary.totalSales}
              tone="positive"
              icon={BanknotesIcon}
            />
            <SummaryCard
              label="Gastos totales"
              value={summary.totalExpenses}
              tone="negative"
              icon={ArrowTrendingDownIcon}
            />
          </div>

          <div className="mt-8 overflow-x-auto">
            <span
              className="isolate inline-flex rounded-md shadow-xs"
              role="tablist"
              aria-label="Tipo de transacción"
            >
              {transactionTabs.map((tab, index) => {
                const isActive = transactionTab === tab.id
                const isFirst = index === 0
                const isLast = index === transactionTabs.length - 1
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTransactionTab(tab.id)}
                    className={`relative inline-flex items-center whitespace-nowrap px-3 py-2 text-sm font-semibold inset-ring-1 inset-ring-zinc-300 focus:z-10 dark:inset-ring-zinc-600 ${
                      !isFirst ? '-ml-px' : ''
                    } ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''} ${
                      isActive
                        ? 'z-10 bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'bg-white text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </span>
          </div>

          <div className="mt-6">
            {transactionTab === 'ingresos' ? renderTransactionRows(filteredIncome) : null}
            {transactionTab === 'egresos' ? renderTransactionRows(filteredExpenses) : null}
            {transactionTab === 'por-cobrar' ? renderReceivableRows() : null}
            {transactionTab === 'por-pagar' ? renderPayableRows() : null}
          </div>
        </>
      ) : (
        <div className="mt-6">{renderCashClosings()}</div>
      )}

      <CashSessionDialog
        orgSlug={orgSlug}
        open={cashDialogMode != null}
        mode={cashDialogMode ?? 'open'}
        session={openSession}
        onClose={() => setCashDialogMode(null)}
      />

      <CreateMovementDialog
        orgSlug={orgSlug}
        open={movementDialogOpen}
        defaultDate={selectedDate}
        defaultType={movementDefaultType}
        onClose={() => setMovementDialogOpen(false)}
      />

      <SaleDetailSidebar
        open={saleDetailOpen}
        sale={selectedSale}
        isLoading={isSaleDetailPending}
        error={saleDetailError}
        onClose={handleCloseSaleDetail}
      />
    </>
  )
}

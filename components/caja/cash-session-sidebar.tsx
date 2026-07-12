'use client'

import {
  BanknotesIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useActionState, useEffect, useMemo, useState } from 'react'
import {
  closeCashSessionAction,
  openCashSessionAction,
  type CashActionState,
} from '@/lib/actions/cash-actions'
import type { CashOperatorOption, CashSessionSummary } from '@/lib/data/balance-types'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { formatCurrency, roundMoney } from '@/lib/utils/money'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Select } from '@/styles/catalyst-ui-kit/select'
import { Switch, SwitchField } from '@/styles/catalyst-ui-kit/switch'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialCashState: CashActionState = { error: null, ok: false }

const OPENING_DENOMINATIONS = [
  100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.01,
] as const

interface CashSessionSidebarProps {
  orgSlug: string
  open: boolean
  mode: 'open' | 'close'
  session: CashSessionSummary | null
  operators: CashOperatorOption[]
  currentMemberId: string
  onClose: () => void
}

function formatDenominationLabel (value: number): string {
  if (value < 1) {
    return `$ ${value.toFixed(2).replace('.', ',')}`
  }
  return `$ ${value}`
}

function formatTotalAmount (value: number): string {
  if (value === 0) return '$0'
  return formatCurrency(value).replace(/\.00$/, '')
}

function CoinIcon ({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function CashSessionSidebar ({
  orgSlug,
  open,
  mode,
  session,
  operators,
  currentMemberId,
  onClose,
}: CashSessionSidebarProps) {
  const openAction = openCashSessionAction.bind(null, orgSlug)
  const closeAction = closeCashSessionAction.bind(null, orgSlug)
  const [openState, openFormAction, openPending] = useActionState(openAction, initialCashState)
  const [closeState, closeFormAction, closePending] = useActionState(closeAction, initialCashState)

  const isOpenMode = mode === 'open'
  const state = isOpenMode ? openState : closeState
  const pending = isOpenMode ? openPending : closePending
  const title = isOpenMode ? 'Abrir caja' : 'Cerrar caja'

  const [countCash, setCountCash] = useState(true)
  const [openedBy, setOpenedBy] = useState(currentMemberId)
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(OPENING_DENOMINATIONS.map((value) => [String(value), 0]))
  )
  const [manualAmount, setManualAmount] = useState('0')
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')

  const operatorOptions = useMemo(() => {
    if (operators.some((operator) => operator.id === currentMemberId)) {
      return operators
    }
    return [{ id: currentMemberId, name: 'Usuario actual' }, ...operators]
  }, [operators, currentMemberId])

  useFormActionSuccess(state.ok, onClose, pending, 'Sesión de caja registrada correctamente.')

  useEffect(() => {
    if (!open) return
    setCountCash(true)
    setOpenedBy(currentMemberId)
    setCounts(Object.fromEntries(OPENING_DENOMINATIONS.map((value) => [String(value), 0])))
    setManualAmount('0')
    setClosingAmount('')
    setNotes('')
  }, [open, currentMemberId, mode])

  const denominationTotal = useMemo(() => {
    return roundMoney(
      OPENING_DENOMINATIONS.reduce((sum, value) => {
        const count = counts[String(value)] ?? 0
        return sum + value * count
      }, 0)
    )
  }, [counts])

  const openingAmount = countCash
    ? denominationTotal
    : roundMoney(Number(String(manualAmount).replace(',', '.')) || 0)

  function handleCountChange (denomination: number, rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10)
    const nextCount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    setCounts((prev) => ({ ...prev, [String(denomination)]: nextCount }))
  }

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={pending ? undefined : onClose}
        aria-hidden="true"
      />

      <aside
        aria-label={title}
        aria-hidden={!open}
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            aria-label="Cerrar"
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        {isOpenMode ? (
          <form action={openFormAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="openingAmount" value={openingAmount} />

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <Field>
                <Label htmlFor="cash-opened-by" className="inline-flex items-center gap-1.5">
                  Empleado encargado
                  <InformationCircleIcon
                    className="size-4 text-zinc-400"
                    aria-label="Persona responsable del turno de caja"
                  />
                </Label>
                <Select
                  id="cash-opened-by"
                  name="openedBy"
                  value={openedBy}
                  onChange={(event) => setOpenedBy(event.target.value)}
                  required
                >
                  {operatorOptions.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <SwitchField>
                <Label>Contar billetes y monedas</Label>
                <Switch
                  checked={countCash}
                  onChange={setCountCash}
                  className="data-checked:bg-[var(--org-brand-accent)]! data-checked:ring-[var(--org-brand-accent)]!"
                />
              </SwitchField>

              {countCash ? (
                <div className="space-y-1">
                  {OPENING_DENOMINATIONS.map((denomination) => {
                    const key = String(denomination)
                    const count = counts[key] ?? 0
                    const subtotal = roundMoney(denomination * count)
                    const isCoin = denomination < 1

                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] items-center gap-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isCoin ? (
                            <CoinIcon className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                          ) : (
                            <BanknotesIcon
                              className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400"
                              aria-hidden="true"
                            />
                          )}
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            {formatDenominationLabel(denomination)}
                          </span>
                        </div>

                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={count}
                          onChange={(event) =>
                            handleCountChange(denomination, event.target.value)
                          }
                          aria-label={`Cantidad de ${formatDenominationLabel(denomination)}`}
                          className="[&_input]:text-center!"
                        />

                        <span className="text-right text-sm text-zinc-400 dark:text-zinc-500">
                          {formatCurrency(subtotal).replace(/\.00$/, '')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Field>
                  <Label htmlFor="cash-manual-amount">Monto de apertura</Label>
                  <Input
                    id="cash-manual-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualAmount}
                    onChange={(event) => setManualAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </Field>
              )}

              {state.error ? (
                <Text
                  className="rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
                  role="alert"
                >
                  {state.error}
                </Text>
              ) : null}
            </div>

            <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div className="mb-4 flex items-end justify-between">
                <span className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                  Total
                </span>
                <span
                  className="text-3xl font-semibold tracking-tight"
                  style={{ color: 'var(--org-brand-accent)' }}
                >
                  {formatTotalAmount(openingAmount)}
                </span>
              </div>
              <Button
                type="submit"
                color="dark/zinc"
                disabled={pending}
                className="w-full! justify-center!"
              >
                {pending ? 'Guardando…' : 'Empezar turno'}
              </Button>
            </div>
          </form>
        ) : (
          <form action={closeFormAction} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <Field>
                <Label htmlFor="cash-closing-amount">Monto en caja</Label>
                <Input
                  id="cash-closing-amount"
                  name="closingAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={closingAmount}
                  onChange={(event) => setClosingAmount(event.target.value)}
                  placeholder="0.00"
                />
              </Field>

              {session ? (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  Monto de apertura: {formatCurrency(session.openingAmount)}
                </Text>
              ) : null}

              <Field>
                <Label htmlFor="cash-close-notes">Notas (opcional)</Label>
                <Input
                  id="cash-close-notes"
                  name="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observaciones sobre la sesión"
                />
              </Field>

              {state.error ? (
                <Text
                  className="rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
                  role="alert"
                >
                  {state.error}
                </Text>
              ) : null}
            </div>

            <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Button
                type="submit"
                color="dark/zinc"
                disabled={pending}
                className="w-full! justify-center!"
              >
                {pending ? 'Guardando…' : 'Cerrar caja'}
              </Button>
            </div>
          </form>
        )}
      </aside>
    </>
  )
}
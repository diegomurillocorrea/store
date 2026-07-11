'use client'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useMemo, useState } from 'react'

interface ColumnFilterHeaderProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

function normalizeSearchValue (value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function ColumnFilterHeader({
  label,
  options,
  selected,
  onChange,
}: ColumnFilterHeaderProps) {
  const [query, setQuery] = useState('')
  const hasActiveFilter = selected.length > 0

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query)
    if (!normalizedQuery) return options
    return options.filter((option) =>
      normalizeSearchValue(option).includes(normalizedQuery)
    )
  }, [options, query])

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
      return
    }
    onChange([...selected, value])
  }

  const handleClear = () => {
    onChange([])
    setQuery('')
  }

  return (
    <div className="inline-flex items-center justify-center gap-1">
      <span>{label}</span>
      <Popover className="relative">
        <PopoverButton
          type="button"
          aria-label={`Filtrar por ${label}`}
          onClick={(event) => event.stopPropagation()}
          className={clsx(
            'inline-flex size-6 items-center justify-center rounded-md transition',
            hasActiveFilter
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          <FunnelIcon className="size-3.5" aria-hidden="true" />
        </PopoverButton>

        <PopoverPanel
          anchor="bottom start"
          className="z-[100] w-64 rounded-xl bg-white p-2 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative mb-2">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Buscar…"
              aria-label={`Buscar opciones de ${label}`}
              className="w-full rounded-lg border border-border bg-transparent py-1.5 pr-2 pl-7 text-sm text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="max-h-60 space-y-0.5 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                Sin opciones
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selected.includes(option)

                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(option)}
                      className="size-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500/40"
                    />
                    <span className="min-w-0 flex-1 truncate" title={option}>
                      {option}
                    </span>
                  </label>
                )
              })
            )}
          </div>

          {hasActiveFilter ? (
            <button
              type="button"
              onClick={handleClear}
              className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              Limpiar filtro
            </button>
          ) : null}
        </PopoverPanel>
      </Popover>
    </div>
  )
}

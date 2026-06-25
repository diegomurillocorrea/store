'use client'

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useEffect, useState } from 'react'
import { getCustomerFullName, type CustomerRow } from '@/lib/data/customer-types'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'

interface CustomerOption {
  id: string
  name: string
}

interface CustomerOptionComboboxProps {
  id: string
  customers: CustomerRow[]
  value: string | null
  onChange: (customerId: string | null) => void
  disabled?: boolean
  label?: string
}

function toCustomerOption(customer: CustomerRow): CustomerOption {
  return {
    id: customer.id,
    name: getCustomerFullName(customer),
  }
}

function findCustomerOption(
  customers: CustomerRow[],
  customerId: string | null
): CustomerOption | null {
  if (!customerId) return null
  const customer = customers.find((entry) => entry.id === customerId)
  return customer ? toCustomerOption(customer) : null
}

export function CustomerOptionCombobox({
  id,
  customers,
  value,
  onChange,
  disabled = false,
  label = 'Cliente',
}: CustomerOptionComboboxProps) {
  const options = customers.map(toCustomerOption)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CustomerOption | null>(() =>
    findCustomerOption(customers, value)
  )

  useEffect(() => {
    setSelected(findCustomerOption(customers, value))
  }, [customers, value])

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => option.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        as="div"
        data-slot="control"
        value={selected}
        disabled={disabled}
        onChange={(option) => {
          setQuery('')
          setSelected(option)
          onChange(option?.id ?? null)
        }}
        by={(a, b) => a?.id === b?.id}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className="block w-full rounded-lg bg-white py-2 pr-10 pl-3 text-base text-foreground outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-foreground/45 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 sm:text-sm/6 dark:bg-white/5 dark:outline-zinc-600 dark:focus:outline-emerald-500"
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery('')}
            displayValue={(option: CustomerOption | null) => option?.name ?? ''}
            placeholder="Buscar cliente..."
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2.5">
            <ChevronDownIcon className="size-5 text-zinc-400" aria-hidden="true" />
          </ComboboxButton>
          <ComboboxOptions className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                Sin clientes encontrados
              </div>
            ) : (
              filteredOptions.map((option) => (
                <ComboboxOption
                  key={option.id}
                  value={option}
                  className="cursor-pointer px-3 py-2 text-sm text-zinc-900 data-focus:bg-emerald-50 data-focus:text-emerald-900 dark:text-zinc-100 dark:data-focus:bg-emerald-950/50 dark:data-focus:text-emerald-200"
                >
                  {option.name}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </Field>
  )
}

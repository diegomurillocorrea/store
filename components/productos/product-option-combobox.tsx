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
import type { ProductOption } from '@/lib/data/product-types'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'

interface ProductOptionComboboxProps {
  id: string
  name: string
  label: string
  options: ProductOption[]
  defaultOptionId?: string | null
  emptyLabel: string
  resetKey?: boolean | string | number
  disabled?: boolean
  onChange?: (option: ProductOption | null) => void
}

function findOptionById(
  options: ProductOption[],
  optionId: string | null | undefined
): ProductOption | null {
  if (!optionId) return null
  return options.find((option) => option.id === optionId) ?? null
}

export function ProductOptionCombobox({
  id,
  name,
  label,
  options,
  defaultOptionId,
  emptyLabel,
  resetKey,
  disabled = false,
  onChange,
}: ProductOptionComboboxProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProductOption | null>(() =>
    findOptionById(options, defaultOptionId)
  )

  useEffect(() => {
    setSelected(findOptionById(options, defaultOptionId))
    setQuery('')
  }, [defaultOptionId, options, resetKey])

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.name.toLowerCase().includes(query.toLowerCase())
        )

  const showEmptyOption = query === '' || filteredOptions.length === 0
  const comboboxKey = `${id}-${defaultOptionId ?? 'none'}-${String(resetKey ?? 'none')}`

  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      <Combobox
        key={comboboxKey}
        as="div"
        data-slot="control"
        value={selected}
        onChange={(option) => {
          setQuery('')
          setSelected(option)
          onChange?.(option)
        }}
        by={(a, b) => a?.id === b?.id}
        disabled={disabled}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className="block w-full rounded-lg bg-white py-1.5 pr-10 pl-3 text-base text-foreground outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-foreground/45 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2 sm:text-sm/6 dark:bg-white/5 dark:outline-zinc-600 dark:focus:outline-emerald-500"
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery('')}
            displayValue={(option: ProductOption | null) => option?.name ?? ''}
            placeholder={emptyLabel}
            autoComplete="off"
            disabled={disabled}
          />
          <ComboboxButton
            className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2 focus:outline-hidden disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <ChevronDownIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          </ComboboxButton>

          <ComboboxOptions
            transition
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg outline outline-black/5 data-closed:data-leave:opacity-0 data-leave:transition data-leave:duration-100 data-leave:ease-in sm:text-sm dark:bg-zinc-900 dark:outline-white/10"
          >
            {showEmptyOption ? (
              <ComboboxOption
                value={null}
                className="cursor-default px-3 py-2 text-foreground select-none data-focus:bg-emerald-600 data-focus:text-white data-focus:outline-hidden"
              >
                {emptyLabel}
              </ComboboxOption>
            ) : null}
            {filteredOptions.map((option) => (
              <ComboboxOption
                key={option.id}
                value={option}
                className="cursor-default px-3 py-2 text-foreground select-none data-focus:bg-emerald-600 data-focus:text-white data-focus:outline-hidden"
              >
                <span className="block truncate">{option.name}</span>
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </Combobox>
    </Field>
  )
}

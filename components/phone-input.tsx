'use client'

import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { useEffect, useState } from 'react'
import {
  formatPhoneForStorage,
  formatPhoneLocalDisplay,
  parsePhoneLocalDigits,
  PHONE_COUNTRY_CODE,
} from '@/lib/utils/phone'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'

interface PhoneInputProps {
  id: string
  name?: string
  label?: string
  defaultValue?: string | null
  required?: boolean
  resetKey?: string | number | boolean
}

export function PhoneInput({
  id,
  name = 'phone',
  label = 'Teléfono',
  defaultValue,
  required = false,
  resetKey,
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    formatPhoneLocalDisplay(parsePhoneLocalDigits(defaultValue))
  )
  const [hiddenValue, setHiddenValue] = useState(() => {
    const local = parsePhoneLocalDigits(defaultValue)
    return formatPhoneForStorage(local) ?? ''
  })

  useEffect(() => {
    const local = parsePhoneLocalDigits(defaultValue)
    setDisplayValue(formatPhoneLocalDisplay(local))
    setHiddenValue(formatPhoneForStorage(local) ?? '')
  }, [defaultValue, resetKey])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = extractInputDigits(event.target.value)
    setDisplayValue(formatPhoneLocalDisplay(digits))
    setHiddenValue(formatPhoneForStorage(digits) ?? '')
  }

  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <div data-slot="control">
        <div className="flex rounded-lg bg-white outline-1 -outline-offset-1 outline-zinc-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-emerald-600 dark:bg-white/5 dark:outline-zinc-600 dark:has-[input:focus-within]:outline-emerald-500">
          <div className="grid shrink-0 grid-cols-1 focus-within:relative">
            <select
              id={`${id}-country`}
              name={`${id}-country`}
              autoComplete="country"
              aria-label="Código de país"
              tabIndex={-1}
              value={PHONE_COUNTRY_CODE}
              onChange={() => {}}
              className="col-start-1 row-start-1 w-full appearance-none rounded-l-lg bg-zinc-50 py-1.5 pr-7 pl-3 text-base text-foreground/70 outline-none sm:py-2 sm:text-sm/6 dark:bg-zinc-800/50"
            >
              <option value={PHONE_COUNTRY_CODE}>+{PHONE_COUNTRY_CODE}</option>
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-foreground/50 sm:size-4"
            />
          </div>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="0000 0000"
            required={required}
            value={displayValue}
            onChange={handleChange}
            aria-required={required}
            className="block min-w-0 grow rounded-r-lg bg-transparent py-1.5 pr-3 pl-2 text-base text-foreground placeholder:text-foreground/45 focus:outline-none sm:py-2 sm:text-sm/6"
          />
        </div>
        <input type="hidden" name={name} value={hiddenValue} />
      </div>
    </Field>
  )
}

function extractInputDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

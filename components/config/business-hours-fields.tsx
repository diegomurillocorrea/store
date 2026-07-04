'use client'

import type { BusinessHours } from '@/lib/organization/profile-types'
import { WEEKDAYS } from '@/lib/organization/profile-types'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface BusinessHoursFieldsProps {
  hours: BusinessHours
  onChange: (hours: BusinessHours) => void
  disabled?: boolean
}

export function BusinessHoursFields({ hours, onChange, disabled = false }: BusinessHoursFieldsProps) {
  const updateDay = (key: (typeof WEEKDAYS)[number]['key'], patch: Partial<BusinessHours[typeof key]>) => {
    onChange({
      ...hours,
      [key]: { ...hours[key], ...patch },
    })
  }

  return (
    <div>
      <Subheading level={3}>Horarios</Subheading>
      <Text className="mt-1 max-w-2xl text-sm">
        Indica cuándo está abierta la sucursal. Marca un día como cerrado si no atiende.
      </Text>
      <div className="mt-4 space-y-3">
        {WEEKDAYS.map((day) => {
          const row = hours[day.key]
          return (
            <div
              key={day.key}
              className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200/80 p-3 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-center dark:border-zinc-700"
            >
              <span className="text-sm font-medium text-foreground">{day.label}</span>
              <Field>
                <Label htmlFor={`hours_${day.key}_open`} className="sr-only">
                  Apertura {day.label}
                </Label>
                <Input
                  id={`hours_${day.key}_open`}
                  name={`hours_${day.key}_open`}
                  type="time"
                  value={row.open}
                  disabled={disabled || row.closed}
                  onChange={(e) => updateDay(day.key, { open: e.target.value })}
                />
              </Field>
              <Field>
                <Label htmlFor={`hours_${day.key}_close`} className="sr-only">
                  Cierre {day.label}
                </Label>
                <Input
                  id={`hours_${day.key}_close`}
                  name={`hours_${day.key}_close`}
                  type="time"
                  value={row.close}
                  disabled={disabled || row.closed}
                  onChange={(e) => updateDay(day.key, { close: e.target.value })}
                />
              </Field>
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  name={`hours_${day.key}_closed`}
                  checked={row.closed}
                  disabled={disabled}
                  onChange={(e) => updateDay(day.key, { closed: e.target.checked })}
                  className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                />
                Cerrado
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useActionState } from 'react'
import {
  createCustomerAction,
  type CustomerFormState,
} from '@/lib/actions/customer-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: CustomerFormState = { error: null, ok: false }

interface CreateCustomerDialogProps {
  orgSlug: string
  open: boolean
  onClose: () => void
}

export function CreateCustomerDialog({ orgSlug, open, onClose }: CreateCustomerDialogProps) {
  const boundAction = createCustomerAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nuevo cliente</DialogTitle>
      <DialogDescription>
        Registra un cliente con su información de contacto.
      </DialogDescription>

      <form action={formAction}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="customer-first-name">Nombres</Label>
                <Input
                  id="customer-first-name"
                  name="firstName"
                  required
                  minLength={2}
                  autoComplete="given-name"
                  placeholder="Ej. María Fernanda"
                />
              </Field>
              <Field>
                <Label htmlFor="customer-last-name">Apellidos</Label>
                <Input
                  id="customer-last-name"
                  name="lastName"
                  required
                  minLength={2}
                  autoComplete="family-name"
                  placeholder="Ej. García López"
                />
              </Field>
              <Field>
                <Label htmlFor="customer-phone">Teléfono</Label>
                <Input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Ej. 55 1234 5678"
                />
              </Field>
              <Field>
                <Label htmlFor="customer-email">Correo electrónico</Label>
                <Input
                  id="customer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Ej. cliente@correo.com"
                />
              </Field>
            </FieldGroup>

            {state.error ? (
              <Text
                className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
                role="alert"
              >
                {state.error}
              </Text>
            ) : null}
          </Fieldset>
        </DialogBody>

        <DialogActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" color="dark/zinc" disabled={pending}>
            {pending ? 'Guardando…' : 'Crear cliente'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

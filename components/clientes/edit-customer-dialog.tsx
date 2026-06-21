'use client'

import { useActionState } from 'react'
import {
  updateCustomerAction,
  type CustomerFormState,
} from '@/lib/actions/customer-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { PhoneInput } from '@/components/phone-input'
import { getCustomerFullName, type CustomerRow } from '@/lib/data/customer-types'
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

interface EditCustomerDialogProps {
  orgSlug: string
  customer: CustomerRow | null
  open: boolean
  onClose: () => void
}

export function EditCustomerDialog({ orgSlug, customer, open, onClose }: EditCustomerDialogProps) {
  const boundAction = customer
    ? updateCustomerAction.bind(null, orgSlug, customer.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending)

  if (!customer || !boundAction) return null

  const fullName = getCustomerFullName(customer)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar cliente</DialogTitle>
      <DialogDescription>
        Modifica la información de contacto de <strong>{fullName}</strong>.
      </DialogDescription>

      <form action={formAction} key={customer.id}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="edit-customer-first-name">Nombres</Label>
                <Input
                  id="edit-customer-first-name"
                  name="firstName"
                  required
                  minLength={2}
                  autoComplete="given-name"
                  defaultValue={customer.firstName}
                />
              </Field>
              <Field>
                <Label htmlFor="edit-customer-last-name">Apellidos</Label>
                <Input
                  id="edit-customer-last-name"
                  name="lastName"
                  required
                  minLength={2}
                  autoComplete="family-name"
                  defaultValue={customer.lastName}
                />
              </Field>
              <PhoneInput
                id="edit-customer-phone"
                defaultValue={customer.phone}
                resetKey={customer.id}
              />
              <Field>
                <Label htmlFor="edit-customer-email">Correo electrónico</Label>
                <Input
                  id="edit-customer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={customer.email ?? ''}
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
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

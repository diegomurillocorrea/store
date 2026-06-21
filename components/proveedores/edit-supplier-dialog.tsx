'use client'

import { useActionState } from 'react'
import {
  updateSupplierAction,
  type SupplierFormState,
} from '@/lib/actions/supplier-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { PhoneInput } from '@/components/phone-input'
import type { SupplierRow } from '@/lib/data/suppliers'
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

const initialState: SupplierFormState = { error: null, ok: false }

interface EditSupplierDialogProps {
  orgSlug: string
  supplier: SupplierRow | null
  open: boolean
  onClose: () => void
}

export function EditSupplierDialog({ orgSlug, supplier, open, onClose }: EditSupplierDialogProps) {
  const boundAction = supplier
    ? updateSupplierAction.bind(null, orgSlug, supplier.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending)

  if (!supplier || !boundAction) return null

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar proveedor</DialogTitle>
      <DialogDescription>
        Modifica la información de contacto de <strong>{supplier.name}</strong>.
      </DialogDescription>

      <form action={formAction} key={supplier.id}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="edit-supplier-name">Nombre</Label>
                <Input
                  id="edit-supplier-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="organization"
                  defaultValue={supplier.name}
                />
              </Field>
              <PhoneInput
                id="edit-supplier-phone"
                defaultValue={supplier.phone}
                resetKey={supplier.id}
              />
              <Field>
                <Label htmlFor="edit-supplier-email">Correo electrónico</Label>
                <Input
                  id="edit-supplier-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={supplier.email ?? ''}
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

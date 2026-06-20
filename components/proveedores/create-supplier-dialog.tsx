'use client'

import { useActionState } from 'react'
import {
  createSupplierAction,
  type SupplierFormState,
} from '@/lib/actions/supplier-actions'
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

const initialState: SupplierFormState = { error: null, ok: false }

interface CreateSupplierDialogProps {
  orgSlug: string
  open: boolean
  onClose: () => void
}

export function CreateSupplierDialog({ orgSlug, open, onClose }: CreateSupplierDialogProps) {
  const boundAction = createSupplierAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nuevo proveedor</DialogTitle>
      <DialogDescription>
        Registra un proveedor con su información de contacto.
      </DialogDescription>

      <form action={formAction}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="supplier-name">Nombre</Label>
                <Input
                  id="supplier-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="organization"
                  placeholder="Ej. Distribuidora Norte"
                />
              </Field>
              <Field>
                <Label htmlFor="supplier-phone">Teléfono</Label>
                <Input
                  id="supplier-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Ej. 55 1234 5678"
                />
              </Field>
              <Field>
                <Label htmlFor="supplier-email">Correo electrónico</Label>
                <Input
                  id="supplier-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Ej. contacto@proveedor.com"
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
            {pending ? 'Guardando…' : 'Crear proveedor'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

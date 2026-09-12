'use client'

import { useActionState } from 'react'
import { createTagAction, type TagFormState } from '@/lib/actions/tag-actions'
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

const initialState: TagFormState = { error: null, ok: false }

interface CreateTagDialogProps {
  orgSlug: string
  open: boolean
  onClose: () => void
}

export function CreateTagDialog({ orgSlug, open, onClose }: CreateTagDialogProps) {
  const boundAction = createTagAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending, 'Etiqueta creada correctamente.')

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nueva etiqueta</DialogTitle>
      <DialogDescription>
        Las etiquetas son independientes de las categorías. Un producto puede tener varias.
      </DialogDescription>

      <form action={formAction} key={String(open)}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="tag-name">Nombre</Label>
                <Input
                  id="tag-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="off"
                  placeholder="Ej. Novedad"
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
            {pending ? 'Guardando…' : 'Crear etiqueta'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

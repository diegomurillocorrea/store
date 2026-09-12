'use client'

import { useActionState } from 'react'
import { updateTagAction, type TagFormState } from '@/lib/actions/tag-actions'
import type { TagRow } from '@/lib/data/tags'
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

interface EditTagDialogProps {
  orgSlug: string
  tag: TagRow | null
  open: boolean
  onClose: () => void
}

export function EditTagDialog({ orgSlug, tag, open, onClose }: EditTagDialogProps) {
  const boundAction = updateTagAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending, 'Etiqueta actualizada correctamente.')

  if (!tag) return null

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar etiqueta</DialogTitle>
      <DialogDescription>
        Modifica la etiqueta <strong>{tag.name}</strong>.
      </DialogDescription>

      <form action={formAction} key={tag.id}>
        <input type="hidden" name="tagId" value={tag.id} />
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="edit-tag-name">Nombre</Label>
                <Input
                  id="edit-tag-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="off"
                  defaultValue={tag.name}
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

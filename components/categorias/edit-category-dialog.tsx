'use client'

import { useActionState } from 'react'
import {
  updateCategoryAction,
  type CategoryFormState,
} from '@/lib/actions/category-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import type { CategoryRow } from '@/lib/data/categories'
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

const initialState: CategoryFormState = { error: null, ok: false }

interface EditCategoryDialogProps {
  orgSlug: string
  category: CategoryRow | null
  open: boolean
  onClose: () => void
}

export function EditCategoryDialog({ orgSlug, category, open, onClose }: EditCategoryDialogProps) {
  const boundAction = updateCategoryAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending)

  if (!category) return null

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar categoría</DialogTitle>
      <DialogDescription>
        Modifica el nombre de <strong>{category.name}</strong>.
      </DialogDescription>

      <form action={formAction} key={category.id}>
        <input type="hidden" name="categoryId" value={category.id} />
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="edit-category-name">Nombre</Label>
                <Input
                  id="edit-category-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="off"
                  defaultValue={category.name}
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

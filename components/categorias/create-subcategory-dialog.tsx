'use client'

import { useActionState } from 'react'
import {
  createSubCategoryAction,
  type SubCategoryFormState,
} from '@/lib/actions/subcategory-actions'
import type { CategoryRow } from '@/lib/data/categories'
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
import { Select } from '@/styles/catalyst-ui-kit/select'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: SubCategoryFormState = { error: null, ok: false }

interface CreateSubCategoryDialogProps {
  orgSlug: string
  categories: CategoryRow[]
  open: boolean
  onClose: () => void
}

export function CreateSubCategoryDialog({
  orgSlug,
  categories,
  open,
  onClose,
}: CreateSubCategoryDialogProps) {
  const boundAction = createSubCategoryAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending, 'Subcategoría creada correctamente.')

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nueva subcategoría</DialogTitle>
      <DialogDescription>
        Crea una subcategoría dentro de una categoría existente. Por ejemplo, Porsche dentro de
        HotWheels.
      </DialogDescription>

      <form action={formAction} key={String(open)}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="subcategory-category">Categoría</Label>
                <Select
                  id="subcategory-category"
                  name="categoryId"
                  required
                  defaultValue=""
                  disabled={categories.length === 0}
                >
                  <option value="" disabled>
                    {categories.length === 0 ? 'No hay categorías' : 'Selecciona una categoría'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="subcategory-name">Nombre</Label>
                <Input
                  id="subcategory-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="off"
                  placeholder="Ej. Porsche"
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
          <Button type="submit" color="dark/zinc" disabled={pending || categories.length === 0}>
            {pending ? 'Guardando…' : 'Crear subcategoría'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

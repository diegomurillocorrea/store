'use client'

import { useActionState } from 'react'
import {
  updateSubCategoryAction,
  type SubCategoryFormState,
} from '@/lib/actions/subcategory-actions'
import type { CategoryRow } from '@/lib/data/categories'
import type { SubCategoryRow } from '@/lib/data/subcategories'
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

interface EditSubCategoryDialogProps {
  orgSlug: string
  categories: CategoryRow[]
  subCategory: SubCategoryRow | null
  open: boolean
  onClose: () => void
}

export function EditSubCategoryDialog({
  orgSlug,
  categories,
  subCategory,
  open,
  onClose,
}: EditSubCategoryDialogProps) {
  const boundAction = updateSubCategoryAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending, 'Subcategoría actualizada correctamente.')

  if (!subCategory) return null

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar subcategoría</DialogTitle>
      <DialogDescription>
        Modifica la subcategoría <strong>{subCategory.name}</strong>.
      </DialogDescription>

      <form action={formAction} key={subCategory.id}>
        <input type="hidden" name="subCategoryId" value={subCategory.id} />
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="edit-subcategory-category">Categoría</Label>
                <Select
                  id="edit-subcategory-category"
                  name="categoryId"
                  required
                  defaultValue={subCategory.categoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="edit-subcategory-name">Nombre</Label>
                <Input
                  id="edit-subcategory-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="off"
                  defaultValue={subCategory.name}
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

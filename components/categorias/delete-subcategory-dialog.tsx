'use client'

import { useActionState } from 'react'
import {
  deleteSubCategoryAction,
  type SubCategoryFormState,
} from '@/lib/actions/subcategory-actions'
import type { SubCategoryRow } from '@/lib/data/subcategories'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: SubCategoryFormState = { error: null, ok: false }

interface DeleteSubCategoryDialogProps {
  orgSlug: string
  subCategory: SubCategoryRow | null
  open: boolean
  onClose: () => void
}

export function DeleteSubCategoryDialog({
  orgSlug,
  subCategory,
  open,
  onClose,
}: DeleteSubCategoryDialogProps) {
  const boundAction = subCategory
    ? deleteSubCategoryAction.bind(null, orgSlug, subCategory.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending, 'Subcategoría eliminada correctamente.')

  if (!subCategory || !boundAction) return null

  return (
    <Alert open={open} onClose={onClose} size="md">
      <AlertTitle>Eliminar subcategoría</AlertTitle>
      <AlertDescription>
        ¿Seguro que deseas eliminar <strong>{subCategory.name}</strong> de{' '}
        <strong>{subCategory.categoryName}</strong>? Los productos asociados quedarán sin
        subcategoría. Esta acción no se puede deshacer.
      </AlertDescription>

      {state.error ? (
        <Text
          className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 !text-red-800 dark:bg-red-950/40 dark:!text-red-200"
          role="alert"
        >
          {state.error}
        </Text>
      ) : null}

      <form action={formAction}>
        <AlertActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" color="red" disabled={pending}>
            {pending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </AlertActions>
      </form>
    </Alert>
  )
}

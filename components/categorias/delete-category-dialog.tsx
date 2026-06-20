'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import {
  deleteCategoryAction,
  type CategoryFormState,
} from '@/lib/actions/category-actions'
import type { CategoryRow } from '@/lib/data/categories'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: CategoryFormState = { error: null, ok: false }

interface DeleteCategoryDialogProps {
  orgSlug: string
  category: CategoryRow | null
  open: boolean
  onClose: () => void
}

export function DeleteCategoryDialog({
  orgSlug,
  category,
  open,
  onClose,
}: DeleteCategoryDialogProps) {
  const router = useRouter()
  const boundAction = category
    ? deleteCategoryAction.bind(null, orgSlug, category.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useEffect(() => {
    if (!state.ok) return
    onClose()
    router.refresh()
  }, [state.ok, onClose, router])

  if (!category || !boundAction) return null

  return (
    <Alert open={open} onClose={onClose} size="md">
      <AlertTitle>Eliminar categoría</AlertTitle>
      <AlertDescription>
        ¿Seguro que deseas eliminar <strong>{category.name}</strong>? Los productos asociados
        quedarán sin categoría. Esta acción no se puede deshacer.
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

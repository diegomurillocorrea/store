'use client'

import { useActionState } from 'react'
import { deleteTagAction, type TagFormState } from '@/lib/actions/tag-actions'
import type { TagRow } from '@/lib/data/tags'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: TagFormState = { error: null, ok: false }

interface DeleteTagDialogProps {
  orgSlug: string
  tag: TagRow | null
  open: boolean
  onClose: () => void
}

export function DeleteTagDialog({ orgSlug, tag, open, onClose }: DeleteTagDialogProps) {
  const boundAction = tag
    ? deleteTagAction.bind(null, orgSlug, tag.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending, 'Etiqueta eliminada correctamente.')

  if (!tag || !boundAction) return null

  return (
    <Alert open={open} onClose={onClose}>
      <AlertTitle>Eliminar etiqueta</AlertTitle>
      <AlertDescription>
        ¿Seguro que deseas eliminar <strong>{tag.name}</strong>? Se quitará de los productos
        que la tengan. Esta acción no se puede deshacer.
      </AlertDescription>

      {state.error ? (
        <Text
          className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
          role="alert"
        >
          {state.error}
        </Text>
      ) : null}

      <AlertActions>
        <Button type="button" plain onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <form action={formAction}>
          <Button type="submit" color="red" disabled={pending}>
            {pending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </form>
      </AlertActions>
    </Alert>
  )
}

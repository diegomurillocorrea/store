'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import {
  createCategoryAction,
  type CategoryFormState,
} from '@/lib/actions/category-actions'
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

interface CreateCategoryDialogProps {
  orgSlug: string
  open: boolean
  onClose: () => void
}

export function CreateCategoryDialog({ orgSlug, open, onClose }: CreateCategoryDialogProps) {
  const router = useRouter()
  const boundAction = createCategoryAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (!state.ok) return
    onClose()
    router.refresh()
  }, [state.ok, onClose, router])

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nueva categoría</DialogTitle>
      <DialogDescription>
        Agrega una categoría para organizar tu catálogo de productos.
      </DialogDescription>

      <form action={formAction}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="category-name">Nombre</Label>
                <Input
                  id="category-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="off"
                  placeholder="Ej. Anime"
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
            {pending ? 'Guardando…' : 'Crear categoría'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

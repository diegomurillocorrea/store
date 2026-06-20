'use client'

import { useActionState } from 'react'
import {
  createProductAction,
  type ProductFormState,
} from '@/lib/actions/product-actions'
import type { ProductOption } from '@/lib/data/product-types'
import { ProductFormFields } from '@/components/productos/product-form-fields'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Fieldset } from '@/styles/catalyst-ui-kit/fieldset'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: ProductFormState = { error: null, ok: false }

interface CreateProductDialogProps {
  orgSlug: string
  organizationId: string
  categories: ProductOption[]
  suppliers: ProductOption[]
  open: boolean
  onClose: () => void
}

export function CreateProductDialog({
  orgSlug,
  organizationId,
  categories,
  suppliers,
  open,
  onClose,
}: CreateProductDialogProps) {
  const boundAction = createProductAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending)

  return (
    <Dialog open={open} onClose={onClose} size="3xl">
      <DialogTitle>Nuevo producto</DialogTitle>
      <DialogDescription>
        Registra un producto con precios, stock y relaciones de catálogo.
      </DialogDescription>

      <form action={formAction}>
        <DialogBody>
          <Fieldset>
            <ProductFormFields
              idPrefix="product"
              organizationId={organizationId}
              categories={categories}
              suppliers={suppliers}
              resetKey={open}
            />

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
            {pending ? 'Guardando…' : 'Crear producto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

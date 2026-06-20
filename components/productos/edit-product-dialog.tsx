'use client'

import { useActionState } from 'react'
import {
  updateProductAction,
  type ProductFormState,
} from '@/lib/actions/product-actions'
import type { ProductOption, ProductRow } from '@/lib/data/product-types'
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

interface EditProductDialogProps {
  orgSlug: string
  organizationId: string
  product: ProductRow | null
  categories: ProductOption[]
  suppliers: ProductOption[]
  open: boolean
  onClose: () => void
}

export function EditProductDialog({
  orgSlug,
  organizationId,
  product,
  categories,
  suppliers,
  open,
  onClose,
}: EditProductDialogProps) {
  const boundAction = product
    ? updateProductAction.bind(null, orgSlug, product.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending)

  if (!product || !boundAction) return null

  return (
    <Dialog open={open} onClose={onClose} size="3xl">
      <DialogTitle>Editar producto</DialogTitle>
      <DialogDescription>
        Modifica los datos de <strong>{product.name}</strong>.
      </DialogDescription>

      <form action={formAction} key={product.id}>
        <DialogBody>
          <Fieldset>
            <ProductFormFields
              idPrefix="edit-product"
              organizationId={organizationId}
              categories={categories}
              suppliers={suppliers}
              defaults={{
                barcode: product.barcode ?? '',
                name: product.name,
                availableQuantity: product.availableQuantity,
                salePrice: product.salePrice,
                costPrice: product.costPrice,
                categoryId: product.categoryId,
                supplierId: product.supplierId,
                imageUrl: product.imageUrl,
              }}
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
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

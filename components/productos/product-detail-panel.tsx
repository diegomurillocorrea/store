'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { DeleteProductDialog } from '@/components/productos/delete-product-dialog'
import { ProductFormFields } from '@/components/productos/product-form-fields'
import {
  updateProductAction,
  type ProductFormState,
} from '@/lib/actions/product-actions'
import type { ProductOption, ProductRow } from '@/lib/data/product-types'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Fieldset } from '@/styles/catalyst-ui-kit/fieldset'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: ProductFormState = { error: null, ok: false }

interface ProductDetailPanelProps {
  orgSlug: string
  organizationId: string
  product: ProductRow
  categories: ProductOption[]
  suppliers: ProductOption[]
  actions: Pick<ViewActionFlags, 'canEdit' | 'canDelete'>
}

export function ProductDetailPanel({
  orgSlug,
  organizationId,
  product,
  categories,
  suppliers,
  actions,
}: ProductDetailPanelProps) {
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const boundUpdateAction = updateProductAction.bind(null, orgSlug, product.id)
  const [updateState, updateFormAction, updatePending] = useActionState(
    boundUpdateAction,
    initialState
  )

  useFormActionSuccess(updateState.ok, () => {}, updatePending)

  useEffect(() => {
    if (updateState.ok && !updatePending) {
      router.refresh()
    }
  }, [updateState.ok, updatePending, router])

  const handleDeleteSuccess = () => {
    router.push(`/${orgSlug}/productos`)
    router.refresh()
  }

  return (
    <div className="mt-8">
      <Link
        href={`/${orgSlug}/productos`}
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Volver al catálogo
      </Link>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Subheading level={2}>{product.name}</Subheading>
          <Text className="mt-1">
            {product.barcode ? `Código: ${product.barcode}` : `SKU: ${product.sku}`}
          </Text>
        </div>
        {actions.canDelete ? (
          <Button type="button" color="red" onClick={() => setIsDeleteOpen(true)}>
            Eliminar producto
          </Button>
        ) : null}
      </div>

      {actions.canEdit ? (
        <form action={updateFormAction} className="glass-surface mt-8 rounded-xl p-6 sm:rounded-2xl">
          <Fieldset>
            <ProductFormFields
              idPrefix="detail-product"
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

            {updateState.error ? (
              <Text
                className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
                role="alert"
              >
                {updateState.error}
              </Text>
            ) : null}

            {updateState.ok ? (
              <Text className="mt-4 text-emerald-600 dark:text-emerald-400" role="status">
                Cambios guardados correctamente.
              </Text>
            ) : null}
          </Fieldset>

          <div className="mt-8 flex justify-end">
            <Button type="submit" color="dark/zinc" disabled={updatePending}>
              {updatePending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      ) : (
        <fieldset disabled className="glass-surface mt-8 rounded-xl p-6 sm:rounded-2xl">
          <ProductFormFields
            idPrefix="detail-product-readonly"
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
          <Text className="mt-4 text-muted-foreground">
            No tienes permisos para editar este producto.
          </Text>
        </fieldset>
      )}

      <DeleteProductDialog
        orgSlug={orgSlug}
        product={product}
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}

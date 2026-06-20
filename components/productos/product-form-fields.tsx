'use client'

import { ProductImageField } from '@/components/productos/product-image-field'
import { ProductOptionCombobox } from '@/components/productos/product-option-combobox'
import type { ProductOption } from '@/lib/data/product-types'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'

export interface ProductFormDefaults {
  barcode?: string
  name?: string
  availableQuantity?: number
  salePrice?: number
  costPrice?: number | null
  categoryId?: string | null
  supplierId?: string | null
  imageUrl?: string | null
}

interface ProductFormFieldsProps {
  idPrefix: string
  organizationId: string
  categories: ProductOption[]
  suppliers: ProductOption[]
  defaults?: ProductFormDefaults
  resetKey?: boolean | string | number
}

interface CurrencyInputProps {
  id: string
  name: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
}

function CurrencyInput({ id, name, required, placeholder, defaultValue }: CurrencyInputProps) {
  const currencyId = `${id}-currency`

  return (
    <div data-slot="control">
      <div className="flex items-center rounded-lg bg-white px-3 outline-1 -outline-offset-1 outline-zinc-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-emerald-600 dark:bg-white/5 dark:outline-zinc-600 dark:focus-within:outline-emerald-500">
        <div className="shrink-0 text-base text-muted-foreground select-none sm:text-sm/6">$</div>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          placeholder={placeholder ?? '0.00'}
          aria-describedby={currencyId}
          required={required}
          defaultValue={defaultValue}
          className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-base text-foreground placeholder:text-foreground/45 focus:outline-none sm:py-2 sm:text-sm/6"
        />
        <div id={currencyId} className="shrink-0 text-base text-muted-foreground select-none sm:text-sm/6">
          USD
        </div>
      </div>
    </div>
  )
}

export function ProductFormFields({
  idPrefix,
  organizationId,
  categories,
  suppliers,
  defaults,
  resetKey,
}: ProductFormFieldsProps) {
  return (
    <div className="flex flex-col gap-8">
      <ProductImageField
        inputId={`${idPrefix}-image`}
        organizationId={organizationId}
        currentImageUrl={defaults?.imageUrl}
        resetKey={resetKey}
      />

      <Field>
        <Label htmlFor={`${idPrefix}-barcode`}>Código de barras</Label>
        <Input
          id={`${idPrefix}-barcode`}
          name="barcode"
          autoComplete="off"
          placeholder="Ej. 7501234567890"
          defaultValue={defaults?.barcode ?? ''}
        />
      </Field>

      <Field>
        <Label htmlFor={`${idPrefix}-name`}>Nombre del producto</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          minLength={2}
          autoComplete="off"
          placeholder="Ej. Figura Dragon Ball"
          defaultValue={defaults?.name ?? ''}
        />
      </Field>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <Field>
          <Label htmlFor={`${idPrefix}-available-quantity`}>Cantidad disponible</Label>
          <Input
            id={`${idPrefix}-available-quantity`}
            name="availableQuantity"
            type="number"
            min={0}
            step="any"
            required
            defaultValue={
              defaults?.availableQuantity != null
                ? String(defaults.availableQuantity)
                : '0'
            }
          />
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-sale-price`}>Precio de venta</Label>
          <CurrencyInput
            id={`${idPrefix}-sale-price`}
            name="salePrice"
            required
            placeholder="0.00"
            defaultValue={
              defaults?.salePrice != null ? String(defaults.salePrice) : undefined
            }
          />
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-cost-price`}>Costo de compra</Label>
          <CurrencyInput
            id={`${idPrefix}-cost-price`}
            name="costPrice"
            placeholder="0.00"
            defaultValue={
              defaults?.costPrice != null ? String(defaults.costPrice) : ''
            }
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <ProductOptionCombobox
          id={`${idPrefix}-category`}
          name="categoryId"
          label="Categoría"
          options={categories}
          defaultOptionId={defaults?.categoryId}
          emptyLabel="Sin categoría"
          resetKey={resetKey}
        />
        <ProductOptionCombobox
          id={`${idPrefix}-supplier`}
          name="supplierId"
          label="Proveedor"
          options={suppliers}
          defaultOptionId={defaults?.supplierId}
          emptyLabel="Sin proveedor"
          resetKey={resetKey}
        />
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProductOptionCombobox } from '@/components/productos/product-option-combobox'
import type { ProductOption, SubCategoryProductOption } from '@/lib/data/product-types'

interface CategorySubCategoryFieldsProps {
  idPrefix: string
  categories: ProductOption[]
  subCategories: SubCategoryProductOption[]
  defaultCategoryId?: string | null
  defaultSubCategoryId?: string | null
  resetKey?: boolean | string | number
}

function findSubCategoryById(
  subCategories: SubCategoryProductOption[],
  subCategoryId: string | null | undefined
): SubCategoryProductOption | null {
  if (!subCategoryId) return null
  return subCategories.find((subCategory) => subCategory.id === subCategoryId) ?? null
}

export function CategorySubCategoryFields({
  idPrefix,
  categories,
  subCategories,
  defaultCategoryId,
  defaultSubCategoryId,
  resetKey,
}: CategorySubCategoryFieldsProps) {
  const resolvedDefaultCategoryId = defaultCategoryId ?? null
  const resolvedDefaultSubCategory = useMemo(
    () => findSubCategoryById(subCategories, defaultSubCategoryId),
    [defaultSubCategoryId, subCategories]
  )

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    resolvedDefaultCategoryId
  )

  useEffect(() => {
    setSelectedCategoryId(resolvedDefaultCategoryId)
  }, [resolvedDefaultCategoryId, resetKey])

  const activeCategoryId = selectedCategoryId ?? resolvedDefaultCategoryId

  const filteredSubCategories = useMemo(() => {
    if (!activeCategoryId) return []
    return subCategories.filter((subCategory) => subCategory.categoryId === activeCategoryId)
  }, [subCategories, activeCategoryId])

  const defaultSubCategoryOptionId = useMemo(() => {
    if (!resolvedDefaultSubCategory) return null
    if (resolvedDefaultSubCategory.categoryId !== activeCategoryId) return null
    return resolvedDefaultSubCategory.id
  }, [activeCategoryId, resolvedDefaultSubCategory])

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <ProductOptionCombobox
        id={`${idPrefix}-category`}
        name="categoryId"
        label="Categoría"
        options={categories}
        defaultOptionId={resolvedDefaultCategoryId}
        emptyLabel="Sin categoría"
        resetKey={resetKey}
        onChange={(option) => {
          setSelectedCategoryId(option?.id ?? null)
        }}
      />
      <ProductOptionCombobox
        id={`${idPrefix}-subcategory`}
        name="subCategoryId"
        label="Subcategoría"
        options={filteredSubCategories}
        defaultOptionId={defaultSubCategoryOptionId}
        emptyLabel={activeCategoryId ? 'Sin subcategoría' : 'Selecciona una categoría'}
        resetKey={`${resetKey ?? 'none'}-${activeCategoryId ?? 'none'}-${defaultSubCategoryOptionId ?? 'none'}`}
        disabled={!activeCategoryId}
      />
    </div>
  )
}

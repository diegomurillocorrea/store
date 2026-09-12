import { and, asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { toNumber, toNumberOrZero } from '@/lib/db/numeric'
import {
  categories,
  organizationMembers,
  products,
  subcategories,
  suppliers,
} from '@/lib/db/schema'
import type { ProductRow } from '@/lib/data/product-types'

export type { ProductRow, ProductOption } from '@/lib/data/product-types'

function mapJoinedProduct (row: {
  id: string
  name: string
  sku: string
  barcode: string | null
  availableQuantity: string
  salePrice: string
  costPrice: string | null
  categoryId: string | null
  subCategoryId: string | null
  supplierId: string | null
  imageUrl: string | null
  createdAt: string
  createdBy: string | null
  categoryName: string | null
  subCategoryName: string | null
  supplierName: string | null
  createdByName: string | null
}): ProductRow {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    availableQuantity: toNumberOrZero(row.availableQuantity),
    salePrice: toNumberOrZero(row.salePrice),
    costPrice: toNumber(row.costPrice),
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    subCategoryId: row.subCategoryId,
    subCategoryName: row.subCategoryName,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    createdByName: row.createdByName?.trim() || null,
  }
}

async function selectProductsJoined (organizationId: string, productId?: string) {
  const creator = alias(organizationMembers, 'product_creator')

  const conditions = [
    eq(products.organizationId, organizationId),
    eq(products.isActive, true),
  ]
  if (productId) {
    conditions.push(eq(products.id, productId))
  }

  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      availableQuantity: products.availableQuantity,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
      categoryId: products.categoryId,
      subCategoryId: products.subCategoryId,
      supplierId: products.supplierId,
      imageUrl: products.imageUrl,
      createdAt: products.createdAt,
      createdBy: products.createdBy,
      categoryName: categories.name,
      subCategoryName: subcategories.name,
      supplierName: suppliers.name,
      createdByName: creator.displayName,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(subcategories, eq(products.subCategoryId, subcategories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .leftJoin(creator, eq(products.createdBy, creator.id))
    .where(and(...conditions))
    .orderBy(asc(products.name))
}

export async function getProductsByOrganizationId (
  organizationId: string
): Promise<ProductRow[]> {
  try {
    const rows = await selectProductsJoined(organizationId)
    return rows.map(mapJoinedProduct)
  } catch (error) {
    console.error('getProductsByOrganizationId', error)
    return []
  }
}

export async function getProductById (
  organizationId: string,
  productId: string
): Promise<ProductRow | null> {
  try {
    const rows = await selectProductsJoined(organizationId, productId)
    const row = rows[0]
    if (!row) return null
    return mapJoinedProduct(row)
  } catch (error) {
    console.error('getProductById', error)
    return null
  }
}

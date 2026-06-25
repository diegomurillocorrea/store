import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ProductRow } from '@/lib/data/product-types'

export type { ProductRow, ProductOption } from '@/lib/data/product-types'

interface RawProductRow {
  id: string
  name: string
  sku: string
  barcode: string | null
  available_quantity: number | string
  sale_price: number | string
  cost_price: number | string | null
  category_id: string | null
  supplier_id: string | null
  image_url: string | null
  created_at: string
  created_by: string | null
  category: { id: string; name: string } | { id: string; name: string }[] | null
  supplier: { id: string; name: string } | { id: string; name: string }[] | null
  creator: { display_name: string | null } | { display_name: string | null }[] | null
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

function mapProductRow(row: RawProductRow): ProductRow {
  const category = Array.isArray(row.category) ? row.category[0] : row.category
  const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    availableQuantity: toNumber(row.available_quantity) ?? 0,
    salePrice: toNumber(row.sale_price) ?? 0,
    costPrice: toNumber(row.cost_price),
    categoryId: row.category_id,
    categoryName: category?.name ?? null,
    supplierId: row.supplier_id,
    supplierName: supplier?.name ?? null,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: creator?.display_name?.trim() || null,
  }
}

export async function getProductsByOrganizationId(
  organizationId: string
): Promise<ProductRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      sku,
      barcode,
      available_quantity,
      sale_price,
      cost_price,
      category_id,
      supplier_id,
      image_url,
      created_at,
      created_by,
      category:categories ( id, name ),
      supplier:suppliers ( id, name ),
      creator:organization_members!products_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    const isMissingExtendedColumns =
      error.code === '42703' ||
      error.code === 'PGRST200' ||
      error.code === 'PGRST204' ||
      Boolean(error.message?.includes('available_quantity')) ||
      Boolean(error.message?.includes('supplier_id')) ||
      Boolean(error.message?.includes('created_by')) ||
      Boolean(error.message?.includes('schema cache'))

    if (isMissingExtendedColumns) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          sku,
          barcode,
          sale_price,
          cost_price,
          category_id,
          created_at,
          category:categories ( id, name )
        `
        )
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (fallbackError) {
        console.error('getProductsByOrganizationId:fallback', fallbackError)
        return []
      }

      return (fallbackData ?? []).map((row) => {
        const category = Array.isArray(row.category) ? row.category[0] : row.category

        return {
          id: row.id,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode,
          availableQuantity: 0,
          salePrice: toNumber(row.sale_price) ?? 0,
          costPrice: toNumber(row.cost_price),
          categoryId: row.category_id,
          categoryName: category?.name ?? null,
          supplierId: null,
          supplierName: null,
          imageUrl: null,
          createdAt: row.created_at,
          createdBy: null,
          createdByName: null,
        }
      })
    }

    console.error('getProductsByOrganizationId', error)
    return []
  }

  return (data ?? []).map((row) => mapProductRow(row as unknown as RawProductRow))
}

const productSelectQuery = `
  id,
  name,
  sku,
  barcode,
  available_quantity,
  sale_price,
  cost_price,
  category_id,
  supplier_id,
  image_url,
  created_at,
  created_by,
  category:categories ( id, name ),
  supplier:suppliers ( id, name ),
  creator:organization_members!products_created_by_fkey ( display_name )
`

export async function getProductById(
  organizationId: string,
  productId: string
): Promise<ProductRow | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('products')
    .select(productSelectQuery)
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    const isMissingExtendedColumns =
      error.code === '42703' ||
      error.code === 'PGRST200' ||
      error.code === 'PGRST204' ||
      Boolean(error.message?.includes('available_quantity')) ||
      Boolean(error.message?.includes('supplier_id')) ||
      Boolean(error.message?.includes('created_by')) ||
      Boolean(error.message?.includes('schema cache'))

    if (isMissingExtendedColumns) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          sku,
          barcode,
          sale_price,
          cost_price,
          category_id,
          created_at,
          category:categories ( id, name )
        `
        )
        .eq('organization_id', organizationId)
        .eq('id', productId)
        .eq('is_active', true)
        .maybeSingle()

      if (fallbackError || !fallbackData) {
        console.error('getProductById:fallback', fallbackError)
        return null
      }

      const category = Array.isArray(fallbackData.category)
        ? fallbackData.category[0]
        : fallbackData.category

      return {
        id: fallbackData.id,
        name: fallbackData.name,
        sku: fallbackData.sku,
        barcode: fallbackData.barcode,
        availableQuantity: 0,
        salePrice: toNumber(fallbackData.sale_price) ?? 0,
        costPrice: toNumber(fallbackData.cost_price),
        categoryId: fallbackData.category_id,
        categoryName: category?.name ?? null,
        supplierId: null,
        supplierName: null,
        imageUrl: null,
        createdAt: fallbackData.created_at,
        createdBy: null,
        createdByName: null,
      }
    }

    console.error('getProductById', error)
    return null
  }

  if (!data) return null

  return mapProductRow(data as unknown as RawProductRow)
}

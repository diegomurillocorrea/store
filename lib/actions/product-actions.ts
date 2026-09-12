'use server'

import { and, eq } from 'drizzle-orm'
import { ensureTagsByNames, validateProductTags } from '@/lib/actions/tag-actions'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  getCreateFanOutTargets,
  getSharedEntityRef,
  getTagSharedRef,
  newOwnerSharedKey,
  resolveCategoryIdInOrg,
  resolveSupplierIdInOrg,
  resolveTagIdInOrg,
  revalidateCatalogPaths,
  type SharedEntityRef,
} from '@/lib/data/owner-shared-entities'
import { db } from '@/lib/db'
import { products, productTags } from '@/lib/db/schema'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  deleteProductImageByUrl,
  isValidProductImageUrl,
  parseImageUrlFromForm,
  shouldRemoveProductImage,
} from '@/lib/utils/product-image'
import { parseUnitPriceInput } from '@/lib/utils/money'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface ProductFormState {
  error: string | null
  ok: boolean
}

interface ParsedProductForm {
  name: string
  barcode: string | null
  availableQuantity: number
  salePrice: number
  costPrice: number | null
  categoryId: string | null
  tagIds: string[]
  supplierId: string | null
}

function parseOptionalUuid (value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? '').trim()
  return raw.length > 0 ? raw : null
}

function parseTagIdsFromForm (formData: FormData): string[] {
  return formData
    .getAll('tagIds')
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0)
}

function parseNewTagNamesFromForm (formData: FormData): string[] {
  return formData
    .getAll('newTagNames')
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0)
}

async function resolveSubmittedTagIds (
  organizationId: string,
  formData: FormData,
  existingTagIds: string[]
): Promise<{ error: string } | { tagIds: string[]; createdCount: number }> {
  const ensured = await ensureTagsByNames(organizationId, parseNewTagNamesFromForm(formData))
  if ('error' in ensured) return ensured

  const tagsResult = await validateProductTags(organizationId, [
    ...existingTagIds,
    ...ensured.tagIds,
  ])
  if ('error' in tagsResult) return tagsResult

  return { tagIds: tagsResult.tagIds, createdCount: ensured.createdCount }
}

function parseNonNegativeNumber (
  raw: string,
  label: string
): { error: string } | number {
  if (raw.length === 0) {
    return { error: `${label} es obligatorio.` }
  }

  if (raw.includes(',')) {
    return { error: `${label} debe usar punto (.) como separador decimal.` }
  }

  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${label} debe ser un número mayor o igual a 0.` }
  }

  return parsed
}

function parseUnitPriceField (
  raw: string,
  label: string
): { error: string } | number {
  if (raw.length === 0) {
    return { error: `${label} es obligatorio.` }
  }

  if (raw.includes(',')) {
    return { error: `${label} debe usar punto (.) como separador decimal.` }
  }

  const parsed = parseUnitPriceInput(raw)
  if (parsed == null) {
    return { error: `${label} debe ser un número mayor o igual a 0 (máx. 4 decimales).` }
  }

  return parsed
}

function buildProductSku (name: string, barcode: string | null): string {
  if (barcode) return barcode

  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)

  return `${slug || 'prod'}-${Date.now().toString(36)}`
}

function parseProductForm (formData: FormData): { error: string } | ParsedProductForm {
  const name = String(formData.get('name') ?? '').trim()
  const barcodeRaw = String(formData.get('barcode') ?? '').trim()
  const availableQuantityRaw = String(formData.get('availableQuantity') ?? '').trim()
  const salePriceRaw = String(formData.get('salePrice') ?? '').trim()
  const costPriceRaw = String(formData.get('costPrice') ?? '').trim()

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }

  const availableQuantity = parseNonNegativeNumber(availableQuantityRaw, 'La cantidad disponible')
  if (typeof availableQuantity !== 'number') return availableQuantity

  const salePrice = parseUnitPriceField(salePriceRaw, 'El precio de venta')
  if (typeof salePrice !== 'number') return salePrice

  let costPrice: number | null = null
  if (costPriceRaw.length > 0) {
    const parsedCost = parseUnitPriceField(costPriceRaw, 'El costo de compra')
    if (typeof parsedCost !== 'number') return parsedCost
    costPrice = parsedCost
  }

  const barcode = barcodeRaw.length > 0 ? barcodeRaw : null

  return {
    name,
    barcode,
    availableQuantity,
    salePrice,
    costPrice,
    categoryId: parseOptionalUuid(formData.get('categoryId')),
    tagIds: parseTagIdsFromForm(formData),
    supplierId: parseOptionalUuid(formData.get('supplierId')),
  }
}

function mapProductError (error: unknown): string {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } }
  const code = err.code ?? err.cause?.code
  const message = err.message ?? err.cause?.message ?? ''

  if (code === '23505') {
    if (message.includes('products_org_barcode_unique')) {
      return 'Ya existe un producto con ese código de barras en esta organización.'
    }
    if (message.includes('organization_id') && message.includes('sku')) {
      return 'Ya existe un producto con ese SKU en esta organización.'
    }
  }

  if (code === '23503') {
    return 'La categoría, etiqueta o el proveedor seleccionado no es válido.'
  }

  return message || 'No se pudo guardar el producto.'
}

async function resolveProductImageUrl (
  formData: FormData,
  organizationId: string,
  currentImageUrl: string | null = null
): Promise<{ imageUrl: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()

  if (shouldRemoveProductImage(formData)) {
    if (currentImageUrl) {
      await deleteProductImageByUrl(supabase, currentImageUrl)
    }
    return { imageUrl: null, error: null }
  }

  const submittedUrl = parseImageUrlFromForm(formData)

  if (submittedUrl) {
    if (!isValidProductImageUrl(submittedUrl, organizationId)) {
      return { imageUrl: null, error: 'La URL de la imagen no es válida.' }
    }

    if (submittedUrl !== currentImageUrl && currentImageUrl) {
      await deleteProductImageByUrl(supabase, currentImageUrl)
    }

    return { imageUrl: submittedUrl, error: null }
  }

  return { imageUrl: currentImageUrl, error: null }
}

async function replaceProductTags (
  organizationId: string,
  productId: string,
  tagIds: string[]
): Promise<void> {
  await db
    .delete(productTags)
    .where(
      and(
        eq(productTags.productId, productId),
        eq(productTags.organizationId, organizationId)
      )
    )

  if (tagIds.length === 0) return

  await db.insert(productTags).values(
    tagIds.map((tagId) => ({
      productId,
      tagId,
      organizationId,
    }))
  )
}

async function resolveTagIdsForTarget (
  organizationId: string,
  isCurrent: boolean,
  sourceTagIds: string[],
  tagRefs: SharedEntityRef[]
): Promise<string[]> {
  if (isCurrent) return sourceTagIds

  const resolved: string[] = []
  for (const ref of tagRefs) {
    const tagId = await resolveTagIdInOrg(organizationId, ref)
    if (tagId) resolved.push(tagId)
  }
  return resolved
}

export async function createProductAction (
  orgSlug: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const access = await getActionAccess(orgSlug, 'productos', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseProductForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const tagsResult = await resolveSubmittedTagIds(
    access.organization.id,
    formData,
    parsed.tagIds
  )
  if ('error' in tagsResult) {
    return { error: tagsResult.error, ok: false }
  }

  const targets = await getCreateFanOutTargets(access.organization.id)
  if (targets.length === 0) {
    return { error: 'No se pudo resolver la sucursal actual.', ok: false }
  }

  const imageResult = await resolveProductImageUrl(formData, access.organization.id, null)
  if (imageResult.error) {
    return { error: imageResult.error, ok: false }
  }

  const categoryRef = await getSharedEntityRef(
    'categories',
    access.organization.id,
    parsed.categoryId
  )
  const supplierRef = await getSharedEntityRef(
    'suppliers',
    access.organization.id,
    parsed.supplierId
  )
  const tagRefs = await Promise.all(
    tagsResult.tagIds.map((tagId) => getTagSharedRef(access.organization.id, tagId))
  )

  const sharedKey = newOwnerSharedKey()
  const sku = buildProductSku(parsed.name, parsed.barcode)

  try {
    for (const target of targets) {
      const isCurrent = target.organizationId === access.organization.id
      const categoryId = isCurrent
        ? parsed.categoryId
        : await resolveCategoryIdInOrg(target.organizationId, categoryRef)
      const supplierId = isCurrent
        ? parsed.supplierId
        : await resolveSupplierIdInOrg(target.organizationId, supplierRef)
      const tagIds = await resolveTagIdsForTarget(
        target.organizationId,
        isCurrent,
        tagsResult.tagIds,
        tagRefs
      )

      const [inserted] = await db.insert(products).values({
        organizationId: target.organizationId,
        name: parsed.name,
        sku,
        barcode: parsed.barcode,
        availableQuantity: String(parsed.availableQuantity),
        salePrice: String(parsed.salePrice),
        costPrice: parsed.costPrice == null ? null : String(parsed.costPrice),
        categoryId,
        supplierId,
        imageUrl: imageResult.imageUrl,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      }).returning({ id: products.id })

      if (inserted?.id && tagIds.length > 0) {
        await db.insert(productTags).values(
          tagIds.map((tagId) => ({
            productId: inserted.id,
            tagId,
            organizationId: target.organizationId,
          }))
        )
      }
    }
  } catch (error) {
    if (imageResult.imageUrl) {
      const supabase = await createSupabaseServerClient()
      await deleteProductImageByUrl(supabase, imageResult.imageUrl)
    }
    return { error: mapProductError(error), ok: false }
  }

  revalidateCatalogPaths(targets, 'products', orgSlug)
  if (tagsResult.createdCount > 0) {
    revalidateCatalogPaths(targets, 'tags', orgSlug)
  }
  return { error: null, ok: true }
}

export async function updateProductAction (
  orgSlug: string,
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const access = await getActionAccess(orgSlug, 'productos', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseProductForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const tagsResult = await resolveSubmittedTagIds(
    access.organization.id,
    formData,
    parsed.tagIds
  )
  if ('error' in tagsResult) {
    return { error: tagsResult.error, ok: false }
  }

  const [existingProduct] = await db
    .select({ imageUrl: products.imageUrl })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, access.organization.id)
      )
    )
    .limit(1)

  if (!existingProduct) {
    return { error: 'Producto no encontrado.', ok: false }
  }

  const imageResult = await resolveProductImageUrl(
    formData,
    access.organization.id,
    existingProduct.imageUrl
  )

  if (imageResult.error) {
    return { error: imageResult.error, ok: false }
  }

  try {
    await db
      .update(products)
      .set({
        name: parsed.name,
        barcode: parsed.barcode,
        availableQuantity: String(parsed.availableQuantity),
        salePrice: String(parsed.salePrice),
        costPrice: parsed.costPrice == null ? null : String(parsed.costPrice),
        categoryId: parsed.categoryId,
        supplierId: parsed.supplierId,
        imageUrl: imageResult.imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, access.organization.id)
        )
      )

    await replaceProductTags(access.organization.id, productId, tagsResult.tagIds)
  } catch (error) {
    return { error: mapProductError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/productos`)
  revalidatePath(`/${orgSlug}/productos/${productId}`)
  if (tagsResult.createdCount > 0) {
    revalidatePath(`/${orgSlug}/etiquetas`)
  }
  return { error: null, ok: true }
}

export async function updateProductQuickFieldsAction (
  orgSlug: string,
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const access = await getActionAccess(orgSlug, 'productos', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const salePriceRaw = String(formData.get('salePrice') ?? '').trim()
  const costPriceRaw = String(formData.get('costPrice') ?? '').trim()
  const availableQuantityRaw = String(formData.get('availableQuantity') ?? '').trim()

  const salePrice = parseUnitPriceField(salePriceRaw, 'El precio de venta')
  if (typeof salePrice !== 'number') return { error: salePrice.error, ok: false }

  const availableQuantity = parseNonNegativeNumber(
    availableQuantityRaw,
    'La cantidad disponible'
  )
  if (typeof availableQuantity !== 'number') {
    return { error: availableQuantity.error, ok: false }
  }

  let costPrice: number | null = null
  if (costPriceRaw.length > 0) {
    const parsedCost = parseUnitPriceField(costPriceRaw, 'El costo de compra')
    if (typeof parsedCost !== 'number') return { error: parsedCost.error, ok: false }
    costPrice = parsedCost
  }

  try {
    await db
      .update(products)
      .set({
        salePrice: String(salePrice),
        costPrice: costPrice == null ? null : String(costPrice),
        availableQuantity: String(availableQuantity),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    return { error: mapProductError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/productos`)
  revalidatePath(`/${orgSlug}/productos/${productId}`)
  return { error: null, ok: true }
}

export async function deleteProductAction (
  orgSlug: string,
  productId: string,
  _prevState: ProductFormState,
  _formData: FormData
): Promise<ProductFormState> {
  const access = await getActionAccess(orgSlug, 'productos', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  const [existingProduct] = await db
    .select({ imageUrl: products.imageUrl })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, access.organization.id)
      )
    )
    .limit(1)

  try {
    await db
      .delete(productTags)
      .where(
        and(
          eq(productTags.productId, productId),
          eq(productTags.organizationId, access.organization.id)
        )
      )

    await db
      .delete(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    const err = error as { code?: string; cause?: { code?: string } }
    const code = err.code ?? err.cause?.code
    const message = code === '23503'
      ? 'No se puede eliminar: el producto tiene ventas, compras o movimientos de inventario asociados.'
      : mapProductError(error)
    return { error: message, ok: false }
  }

  if (existingProduct?.imageUrl) {
    const supabase = await createSupabaseServerClient()
    await deleteProductImageByUrl(supabase, existingProduct.imageUrl)
  }

  revalidatePath(`/${orgSlug}/productos`)
  redirect(`/${orgSlug}/productos`)
}

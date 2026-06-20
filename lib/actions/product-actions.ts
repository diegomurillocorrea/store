'use server'

import { revalidatePath } from 'next/cache'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  deleteProductImageByUrl,
  isValidProductImageUrl,
  parseImageUrlFromForm,
  shouldRemoveProductImage,
} from '@/lib/utils/product-image'

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
  supplierId: string | null
}

function parseOptionalUuid(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? '').trim()
  return raw.length > 0 ? raw : null
}

function parseNonNegativeNumber(
  raw: string,
  label: string
): { error: string } | number {
  if (raw.length === 0) {
    return { error: `${label} es obligatorio.` }
  }

  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${label} debe ser un número mayor o igual a 0.` }
  }

  return parsed
}

function buildProductSku(name: string, barcode: string | null): string {
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

function parseProductForm(formData: FormData): { error: string } | ParsedProductForm {
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

  const salePrice = parseNonNegativeNumber(salePriceRaw, 'El precio de venta')
  if (typeof salePrice !== 'number') return salePrice

  let costPrice: number | null = null
  if (costPriceRaw.length > 0) {
    const parsedCost = parseNonNegativeNumber(costPriceRaw, 'El costo de compra')
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
    supplierId: parseOptionalUuid(formData.get('supplierId')),
  }
}

function mapProductError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    if (error.message?.includes('products_org_barcode_unique')) {
      return 'Ya existe un producto con ese código de barras en esta organización.'
    }
    if (error.message?.includes('organization_id') && error.message?.includes('sku')) {
      return 'Ya existe un producto con ese SKU en esta organización.'
    }
  }

  if (error.code === '23503') {
    return 'La categoría o el proveedor seleccionado no es válido.'
  }

  return error.message || 'No se pudo guardar el producto.'
}

async function resolveProductImageUrl(
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

export async function createProductAction(
  orgSlug: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const parsed = parseProductForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)
  const supabase = await createSupabaseServerClient()

  const imageResult = await resolveProductImageUrl(formData, access.organization.id, null)
  if (imageResult.error) {
    return { error: imageResult.error, ok: false }
  }

  const payload = {
    organization_id: access.organization.id,
    name: parsed.name,
    sku: buildProductSku(parsed.name, parsed.barcode),
    barcode: parsed.barcode,
    available_quantity: parsed.availableQuantity,
    sale_price: parsed.salePrice,
    cost_price: parsed.costPrice,
    category_id: parsed.categoryId,
    supplier_id: parsed.supplierId,
    image_url: imageResult.imageUrl,
    created_by: memberId,
  }

  let { error } = await supabase.from('products').insert(payload)

  if (error?.message?.includes('available_quantity') || error?.message?.includes('supplier_id')) {
    const {
      available_quantity: _aq,
      supplier_id: _si,
      image_url: _iu,
      created_by: _cb,
      ...legacyPayload
    } = payload
    ;({ error } = await supabase.from('products').insert(legacyPayload))
  } else if (error?.message?.includes('created_by')) {
    const { created_by: _cb, ...payloadWithoutCreator } = payload
    ;({ error } = await supabase.from('products').insert(payloadWithoutCreator))
  } else if (error?.message?.includes('image_url')) {
    const { image_url: _iu, ...payloadWithoutImage } = payload
    ;({ error } = await supabase.from('products').insert(payloadWithoutImage))
  }

  if (error) {
    if (imageResult.imageUrl) {
      await deleteProductImageByUrl(supabase, imageResult.imageUrl)
    }
    return { error: mapProductError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function updateProductAction(
  orgSlug: string,
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const parsed = parseProductForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const supabase = await createSupabaseServerClient()

  const { data: existingProduct, error: existingError } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .eq('organization_id', access.organization.id)
    .maybeSingle()

  if (existingError || !existingProduct) {
    return { error: 'Producto no encontrado.', ok: false }
  }

  const imageResult = await resolveProductImageUrl(
    formData,
    access.organization.id,
    existingProduct.image_url
  )

  if (imageResult.error) {
    return { error: imageResult.error, ok: false }
  }

  const updatePayload = {
    name: parsed.name,
    barcode: parsed.barcode,
    available_quantity: parsed.availableQuantity,
    sale_price: parsed.salePrice,
    cost_price: parsed.costPrice,
    category_id: parsed.categoryId,
    supplier_id: parsed.supplierId,
    image_url: imageResult.imageUrl,
    updated_at: new Date().toISOString(),
  }

  let { error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('organization_id', access.organization.id)

  if (error?.message?.includes('available_quantity') || error?.message?.includes('supplier_id')) {
    const {
      available_quantity: _aq,
      supplier_id: _si,
      image_url: _iu,
      ...legacyPayload
    } = updatePayload
    ;({ error } = await supabase
      .from('products')
      .update(legacyPayload)
      .eq('id', productId)
      .eq('organization_id', access.organization.id))
  } else if (error?.message?.includes('image_url')) {
    const { image_url: _iu, ...payloadWithoutImage } = updatePayload
    ;({ error } = await supabase
      .from('products')
      .update(payloadWithoutImage)
      .eq('id', productId)
      .eq('organization_id', access.organization.id))
  }

  if (error) {
    return { error: mapProductError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function deleteProductAction(
  orgSlug: string,
  productId: string,
  _prevState: ProductFormState,
  _formData: FormData
): Promise<ProductFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const supabase = await createSupabaseServerClient()

  const { data: existingProduct } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .eq('organization_id', access.organization.id)
    .maybeSingle()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('organization_id', access.organization.id)

  if (error) {
    const message = error.code === '23503'
      ? 'No se puede eliminar: el producto tiene ventas, compras o movimientos de inventario asociados.'
      : mapProductError(error)
    return { error: message, ok: false }
  }

  await deleteProductImageByUrl(supabase, existingProduct?.image_url)

  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

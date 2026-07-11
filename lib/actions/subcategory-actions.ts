'use server'

import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  ensureCategoryInOrg,
  getCreateFanOutTargets,
  getSharedEntityRef,
  newOwnerSharedKey,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import { getSubCategoryById } from '@/lib/data/subcategories'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SubCategoryFormState {
  error: string | null
  ok: boolean
}

function parseSubCategoryForm(formData: FormData): { error: string } | { name: string; categoryId: string } {
  const name = String(formData.get('name') ?? '').trim()
  const categoryId = String(formData.get('categoryId') ?? '').trim()

  if (categoryId.length === 0) {
    return { error: 'Selecciona una categoría.' }
  }

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }

  return { name, categoryId }
}

function mapSubCategoryError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    return 'Ya existe una subcategoría con ese nombre en la categoría seleccionada.'
  }

  if (error.code === '23503') {
    return 'La categoría seleccionada no es válida.'
  }

  return error.message || 'No se pudo guardar la subcategoría.'
}

async function validateCategoryBelongsToOrg(
  organizationId: string,
  categoryId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', categoryId)
    .maybeSingle()

  if (error || !data) return false
  return true
}

export async function createSubCategoryAction(
  orgSlug: string,
  _prevState: SubCategoryFormState,
  formData: FormData
): Promise<SubCategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseSubCategoryForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const categoryIsValid = await validateCategoryBelongsToOrg(
    access.organization.id,
    parsed.categoryId
  )
  if (!categoryIsValid) {
    return { error: 'La categoría seleccionada no es válida.', ok: false }
  }

  const targets = await getCreateFanOutTargets(access.organization.id)
  if (targets.length === 0) {
    return { error: 'No se pudo resolver la sucursal actual.', ok: false }
  }

  const categoryRef = await getSharedEntityRef(
    'categories',
    access.organization.id,
    parsed.categoryId
  )
  if (!categoryRef.name && !categoryRef.sharedKey) {
    return { error: 'La categoría seleccionada no es válida.', ok: false }
  }

  const sharedKey = newOwnerSharedKey()
  const supabase = await createSupabaseServerClient()

  let syncedCategoryRef = categoryRef
  if (!syncedCategoryRef.sharedKey) {
    const categorySharedKey = newOwnerSharedKey()
    const { error: linkError } = await supabase
      .from('categories')
      .update({ owner_shared_key: categorySharedKey })
      .eq('id', parsed.categoryId)
      .eq('organization_id', access.organization.id)

    if (linkError) {
      return {
        error: linkError.message || 'No se pudo sincronizar la categoría.',
        ok: false,
      }
    }

    syncedCategoryRef = {
      ...syncedCategoryRef,
      sharedKey: categorySharedKey,
    }
  }

  for (const target of targets) {
    const categoryId =
      target.organizationId === access.organization.id
        ? parsed.categoryId
        : await ensureCategoryInOrg(
          target.organizationId,
          syncedCategoryRef,
          target.memberId
        )

    if (!categoryId) {
      return {
        error:
          'No se pudo sincronizar la categoría en todas las sucursales. Intenta de nuevo.',
        ok: false,
      }
    }

    const { error } = await supabase.from('subcategories').insert({
      organization_id: target.organizationId,
      category_id: categoryId,
      name: parsed.name,
      owner_shared_key: sharedKey,
      created_by: target.memberId,
    })

    if (error) {
      return { error: mapSubCategoryError(error), ok: false }
    }
  }

  revalidateCatalogPaths(targets, 'subcategories', orgSlug)
  return { error: null, ok: true }
}

export async function updateSubCategoryAction(
  orgSlug: string,
  _prevState: SubCategoryFormState,
  formData: FormData
): Promise<SubCategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const subCategoryId = String(formData.get('subCategoryId') ?? '').trim()
  if (!subCategoryId) {
    return { error: 'Subcategoría no válida.', ok: false }
  }

  const parsed = parseSubCategoryForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const categoryIsValid = await validateCategoryBelongsToOrg(
    access.organization.id,
    parsed.categoryId
  )
  if (!categoryIsValid) {
    return { error: 'La categoría seleccionada no es válida.', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('subcategories')
    .update({
      name: parsed.name,
      category_id: parsed.categoryId,
    })
    .eq('id', subCategoryId)
    .eq('organization_id', access.organization.id)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: mapSubCategoryError(error), ok: false }
  }

  if (!data) {
    return { error: 'No se encontró la subcategoría.', ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias/sub-categorias`)
  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function deleteSubCategoryAction(
  orgSlug: string,
  subCategoryId: string,
  _prevState: SubCategoryFormState,
  _formData: FormData
): Promise<SubCategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('subcategories')
    .delete()
    .eq('id', subCategoryId)
    .eq('organization_id', access.organization.id)

  if (error) {
    return { error: error.message || 'No se pudo eliminar la subcategoría.', ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias/sub-categorias`)
  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function validateProductSubCategory(
  organizationId: string,
  categoryId: string | null,
  subCategoryId: string | null
): Promise<{ error: string } | { subCategoryId: string | null }> {
  if (!subCategoryId) {
    return { subCategoryId: null }
  }

  if (!categoryId) {
    return { error: 'Selecciona una categoría antes de asignar una subcategoría.' }
  }

  const subCategory = await getSubCategoryById(organizationId, subCategoryId)
  if (!subCategory) {
    return { error: 'La subcategoría seleccionada no es válida.' }
  }

  if (subCategory.categoryId !== categoryId) {
    return { error: 'La subcategoría no pertenece a la categoría seleccionada.' }
  }

  return { subCategoryId }
}

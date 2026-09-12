'use server'

import { and, eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  ensureCategoryInOrg,
  getCreateFanOutTargets,
  getSharedEntityRef,
  newOwnerSharedKey,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import { getSubCategoryById } from '@/lib/data/subcategories'
import { db } from '@/lib/db'
import { categories, subcategories } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export interface SubCategoryFormState {
  error: string | null
  ok: boolean
}

function parseSubCategoryForm (formData: FormData): { error: string } | { name: string; categoryId: string } {
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

function mapSubCategoryError (error: unknown): string {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } }
  const code = err.code ?? err.cause?.code
  if (code === '23505') {
    return 'Ya existe una subcategoría con ese nombre en la categoría seleccionada.'
  }
  if (code === '23503') {
    return 'La categoría seleccionada no es válida.'
  }
  return err.message ?? err.cause?.message ?? 'No se pudo guardar la subcategoría.'
}

async function validateCategoryBelongsToOrg (
  organizationId: string,
  categoryId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.organizationId, organizationId),
        eq(categories.id, categoryId)
      )
    )
    .limit(1)
  return Boolean(row?.id)
}

export async function createSubCategoryAction (
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

  let syncedCategoryRef = categoryRef
  if (!syncedCategoryRef.sharedKey) {
    const categorySharedKey = newOwnerSharedKey()
    try {
      await db.update(categories)
        .set({ ownerSharedKey: categorySharedKey })
        .where(
          and(
            eq(categories.id, parsed.categoryId),
            eq(categories.organizationId, access.organization.id)
          )
        )
    } catch (linkErr) {
      const e = linkErr as { message?: string; cause?: { message?: string } }
      return { error: e.message ?? e.cause?.message ?? 'No se pudo sincronizar la categoría.', ok: false }
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
        error: 'No se pudo sincronizar la categoría en todas las sucursales. Intenta de nuevo.',
        ok: false,
      }
    }

    try {
      await db.insert(subcategories).values({
        organizationId: target.organizationId,
        categoryId: categoryId,
        name: parsed.name,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      })
    } catch (error) {
      return { error: mapSubCategoryError(error), ok: false }
    }
  }

  revalidateCatalogPaths(targets, 'subcategories', orgSlug)
  return { error: null, ok: true }
}

export async function updateSubCategoryAction (
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

  try {
    const [updated] = await db.update(subcategories)
      .set({ name: parsed.name, categoryId: parsed.categoryId })
      .where(
        and(
          eq(subcategories.id, subCategoryId),
          eq(subcategories.organizationId, access.organization.id)
        )
      )
      .returning({ id: subcategories.id })

    if (!updated) {
      return { error: 'No se encontró la subcategoría.', ok: false }
    }
  } catch (error) {
    return { error: mapSubCategoryError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias/sub-categorias`)
  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function deleteSubCategoryAction (
  orgSlug: string,
  subCategoryId: string,
  _prevState: SubCategoryFormState,
  _formData: FormData
): Promise<SubCategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  try {
    await db.delete(subcategories)
      .where(
        and(
          eq(subcategories.id, subCategoryId),
          eq(subcategories.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } }
    const code = err.code ?? err.cause?.code
    const message = code === '23503'
      ? 'No se puede eliminar: la subcategoría tiene productos asociados.'
      : err.message ?? err.cause?.message ?? 'No se pudo eliminar la subcategoría.'
    return { error: message, ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias/sub-categorias`)
  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function validateProductSubCategory (
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

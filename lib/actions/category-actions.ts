'use server'

import { and, eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  findCategoryIdByName,
  getCreateFanOutTargets,
  newOwnerSharedKey,
  revalidateCatalogPaths,
} from '@/lib/data/owner-shared-entities'
import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export interface CategoryFormState {
  error: string | null
  ok: boolean
}

function parseCategoryName (formData: FormData): { error: string } | { name: string } {
  const name = String(formData.get('name') ?? '').trim()

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }

  return { name }
}

export async function createCategoryAction (
  orgSlug: string,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseCategoryName(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  const targets = await getCreateFanOutTargets(access.organization.id)
  if (targets.length === 0) {
    return { error: 'No se pudo resolver la sucursal actual.', ok: false }
  }

  const sharedKey = newOwnerSharedKey()

  try {
    for (const target of targets) {
      const existingId = await findCategoryIdByName(target.organizationId, parsed.name)
      if (existingId) {
        await db
          .update(categories)
          .set({ ownerSharedKey: sharedKey })
          .where(
            and(
              eq(categories.id, existingId),
              eq(categories.organizationId, target.organizationId)
            )
          )
        continue
      }

      await db.insert(categories).values({
        organizationId: target.organizationId,
        name: parsed.name,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la categoría.'
    return { error: message, ok: false }
  }

  revalidateCatalogPaths(targets, 'categories', orgSlug)
  return { error: null, ok: true }
}

export async function updateCategoryAction (
  orgSlug: string,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const categoryId = String(formData.get('categoryId') ?? '').trim()
  if (!categoryId) {
    return { error: 'Categoría no válida.', ok: false }
  }

  const parsed = parseCategoryName(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  try {
    const updated = await db
      .update(categories)
      .set({ name: parsed.name })
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.organizationId, access.organization.id)
        )
      )
      .returning({ id: categories.id })

    if (updated.length === 0) {
      return { error: 'No se encontró la categoría.', ok: false }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la categoría.'
    return { error: message, ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias`)
  revalidatePath(`/${orgSlug}/categorias/sub-categorias`)
  return { error: null, ok: true }
}

export async function deleteCategoryAction (
  orgSlug: string,
  categoryId: string,
  _prevState: CategoryFormState,
  _formData: FormData
): Promise<CategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  try {
    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la categoría.'
    return { error: message, ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias`)
  revalidatePath(`/${orgSlug}/categorias/sub-categorias`)
  return { error: null, ok: true }
}

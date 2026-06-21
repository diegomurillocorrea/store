'use server'

import { revalidatePath } from 'next/cache'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getActiveMemberIdForOrganization } from '@/lib/data/categories'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface CategoryFormState {
  error: string | null
  ok: boolean
}

function parseCategoryName(formData: FormData): { error: string } | { name: string } {
  const name = String(formData.get('name') ?? '').trim()

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }

  return { name }
}

export async function createCategoryAction(
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

  const memberId = await getActiveMemberIdForOrganization(access.organization.id)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('categories').insert({
    organization_id: access.organization.id,
    name: parsed.name,
    created_by: memberId,
  })

  if (error) {
    return { error: error.message || 'No se pudo crear la categoría.', ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias`)
  return { error: null, ok: true }
}

export async function updateCategoryAction(
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

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('categories')
    .update({ name: parsed.name })
    .eq('id', categoryId)
    .eq('organization_id', access.organization.id)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: error.message || 'No se pudo actualizar la categoría.', ok: false }
  }

  if (!data) {
    return { error: 'No se encontró la categoría.', ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias`)
  return { error: null, ok: true }
}

export async function deleteCategoryAction(
  orgSlug: string,
  categoryId: string,
  _prevState: CategoryFormState,
  _formData: FormData
): Promise<CategoryFormState> {
  const access = await getActionAccess(orgSlug, 'categorias', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('organization_id', access.organization.id)

  if (error) {
    return { error: error.message || 'No se pudo eliminar la categoría.', ok: false }
  }

  revalidatePath(`/${orgSlug}/categorias`)
  return { error: null, ok: true }
}

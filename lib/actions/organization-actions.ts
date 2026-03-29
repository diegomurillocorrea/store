'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface CreateOrgState {
  error: string | null
}

export async function createOrganizationAction(
  _prevState: CreateOrgState,
  formData: FormData
): Promise<CreateOrgState> {
  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }
  if (slug.length < 2) {
    return { error: 'El slug es obligatorio (mín. 2 caracteres, solo letras, números y guiones).' }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: 'Slug inválido. Usa minúsculas, números y guiones.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Sesión no válida. Vuelve a iniciar sesión.' }
  }

  const { data: orgId, error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_slug: slug,
  })

  if (error) {
    if (error.code === '23505' || error.message.includes('unique')) {
      return { error: 'Ese slug ya está en uso. Prueba otro.' }
    }
    return { error: error.message || 'No se pudo crear la organización.' }
  }

  if (!orgId) {
    return { error: 'Respuesta vacía del servidor.' }
  }

  revalidatePath('/orgs')
  redirect(`/${slug}/dashboard`)
}

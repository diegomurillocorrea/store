'use server'

import { and, eq } from 'drizzle-orm'
import { seedDefaultCategories } from '@/lib/data/categories'
import {
  cloneOwnerCatalogToOrganization,
  getOwnerCatalogSourceOrganizationId,
} from '@/lib/data/owner-shared-entities'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { organizationMembers } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface CreateOrgState {
  error: string | null
}

export async function createOrganizationAction (
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

  // create_organization usa auth.uid() internamente — sigue con Supabase auth + RPC
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
    return { error: error.message || 'No se pudo crear la sucursal.' }
  }

  if (!orgId) {
    return { error: 'Respuesta vacía del servidor.' }
  }

  await seedDefaultCategories(orgId)

  const sourceOrganizationId = await getOwnerCatalogSourceOrganizationId(orgId)
  if (sourceOrganizationId) {
    // Busca el member activo en la nueva organización para usarlo como creador del catálogo
    const [targetMember] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.status, 'active')
        )
      )
      .limit(1)

    await cloneOwnerCatalogToOrganization(
      sourceOrganizationId,
      orgId,
      targetMember?.id ?? null
    )
  }

  revalidatePath('/sucursales')
  redirect(`/${slug}/dashboard`)
}

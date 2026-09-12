'use server'

import { and, eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import {
  getCreateFanOutTargets,
  newOwnerSharedKey,
  revalidateCatalogPaths,
  resolveTagIdInOrg,
} from '@/lib/data/owner-shared-entities'
import { db } from '@/lib/db'
import { tags } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export interface TagFormState {
  error: string | null
  ok: boolean
}

function parseTagForm (formData: FormData): { error: string } | { name: string } {
  const name = String(formData.get('name') ?? '').trim()

  if (name.length < 2) {
    return { error: 'El nombre es obligatorio (mín. 2 caracteres).' }
  }

  return { name }
}

function mapTagError (error: unknown): string {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } }
  const code = err.code ?? err.cause?.code
  if (code === '23505') {
    return 'Ya existe una etiqueta con ese nombre en esta sucursal.'
  }
  return err.message ?? err.cause?.message ?? 'No se pudo guardar la etiqueta.'
}

export async function createTagAction (
  orgSlug: string,
  _prevState: TagFormState,
  formData: FormData
): Promise<TagFormState> {
  const access = await getActionAccess(orgSlug, 'etiquetas', 'create')
  if (!access) {
    return permissionDeniedState()
  }

  const parsed = parseTagForm(formData)
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
      const existingId = await resolveTagIdInOrg(target.organizationId, {
        sharedKey: null,
        name: parsed.name,
        categorySharedKey: null,
        categoryName: null,
      })

      if (existingId) {
        await db
          .update(tags)
          .set({ ownerSharedKey: sharedKey })
          .where(
            and(
              eq(tags.id, existingId),
              eq(tags.organizationId, target.organizationId)
            )
          )
        continue
      }

      await db.insert(tags).values({
        organizationId: target.organizationId,
        name: parsed.name,
        ownerSharedKey: sharedKey,
        createdBy: target.memberId,
      })
    }
  } catch (error) {
    return { error: mapTagError(error), ok: false }
  }

  revalidateCatalogPaths(targets, 'tags', orgSlug)
  return { error: null, ok: true }
}

export async function updateTagAction (
  orgSlug: string,
  _prevState: TagFormState,
  formData: FormData
): Promise<TagFormState> {
  const access = await getActionAccess(orgSlug, 'etiquetas', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const tagId = String(formData.get('tagId') ?? '').trim()
  if (!tagId) {
    return { error: 'Etiqueta no válida.', ok: false }
  }

  const parsed = parseTagForm(formData)
  if ('error' in parsed) {
    return { error: parsed.error, ok: false }
  }

  try {
    const updated = await db
      .update(tags)
      .set({ name: parsed.name })
      .where(
        and(
          eq(tags.id, tagId),
          eq(tags.organizationId, access.organization.id)
        )
      )
      .returning({ id: tags.id })

    if (updated.length === 0) {
      return { error: 'No se encontró la etiqueta.', ok: false }
    }
  } catch (error) {
    return { error: mapTagError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/etiquetas`)
  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function deleteTagAction (
  orgSlug: string,
  tagId: string,
  _prevState: TagFormState,
  _formData: FormData
): Promise<TagFormState> {
  const access = await getActionAccess(orgSlug, 'etiquetas', 'delete')
  if (!access) {
    return permissionDeniedState()
  }

  try {
    await db
      .delete(tags)
      .where(
        and(
          eq(tags.id, tagId),
          eq(tags.organizationId, access.organization.id)
        )
      )
  } catch (error) {
    return { error: mapTagError(error), ok: false }
  }

  revalidatePath(`/${orgSlug}/etiquetas`)
  revalidatePath(`/${orgSlug}/productos`)
  return { error: null, ok: true }
}

export async function ensureTagsByNames (
  organizationId: string,
  names: string[]
): Promise<{ error: string } | { tagIds: string[]; createdCount: number }> {
  const uniqueNames: string[] = []
  const seen = new Set<string>()

  for (const rawName of names) {
    const name = rawName.trim()
    if (name.length === 0) continue
    if (name.length < 2) {
      return { error: 'El nombre de etiqueta es obligatorio (mín. 2 caracteres).' }
    }

    const normalized = name.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    uniqueNames.push(name)
  }

  if (uniqueNames.length === 0) {
    return { tagIds: [], createdCount: 0 }
  }

  if (uniqueNames.length > 30) {
    return { error: 'Demasiadas etiquetas nuevas en un solo guardado.' }
  }

  const targets = await getCreateFanOutTargets(organizationId)
  if (targets.length === 0) {
    return { error: 'No se pudo resolver la sucursal actual.' }
  }

  const tagIds: string[] = []
  let createdCount = 0

  try {
    for (const name of uniqueNames) {
      const existingId = await resolveTagIdInOrg(organizationId, {
        sharedKey: null,
        name,
        categorySharedKey: null,
        categoryName: null,
      })

      if (existingId) {
        tagIds.push(existingId)
        continue
      }

      const sharedKey = newOwnerSharedKey()
      let currentOrgTagId: string | null = null

      for (const target of targets) {
        const targetExistingId = await resolveTagIdInOrg(target.organizationId, {
          sharedKey: null,
          name,
          categorySharedKey: null,
          categoryName: null,
        })

        if (targetExistingId) {
          await db
            .update(tags)
            .set({ ownerSharedKey: sharedKey })
            .where(
              and(
                eq(tags.id, targetExistingId),
                eq(tags.organizationId, target.organizationId)
              )
            )

          if (target.organizationId === organizationId) {
            currentOrgTagId = targetExistingId
          }
          continue
        }

        const [inserted] = await db
          .insert(tags)
          .values({
            organizationId: target.organizationId,
            name,
            ownerSharedKey: sharedKey,
            createdBy: target.memberId,
          })
          .returning({ id: tags.id })

        if (target.organizationId === organizationId) {
          currentOrgTagId = inserted?.id ?? null
        }
      }

      if (!currentOrgTagId) {
        return { error: `No se pudo crear la etiqueta "${name}".` }
      }

      tagIds.push(currentOrgTagId)
      createdCount += 1
    }
  } catch (error) {
    return { error: mapTagError(error) }
  }

  return { tagIds, createdCount }
}

export async function validateProductTags (
  organizationId: string,
  tagIds: string[]
): Promise<{ error: string } | { tagIds: string[] }> {
  const uniqueIds = [...new Set(tagIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return { tagIds: [] }
  }

  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.organizationId, organizationId))

  const valid = new Set(rows.map((row) => row.id))
  for (const id of uniqueIds) {
    if (!valid.has(id)) {
      return { error: 'Una o más etiquetas seleccionadas no son válidas.' }
    }
  }

  return { tagIds: uniqueIds }
}

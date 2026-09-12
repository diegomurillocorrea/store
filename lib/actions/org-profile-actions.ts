'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { isOrganizationSlugAvailable } from '@/lib/data/org-profile'
import {
  createDefaultBusinessHours,
  isValidHttpUrl,
  normalizeOrganizationSlug,
  SLUG_PATTERN,
  WEEKDAYS,
  type BusinessHours,
  type SocialLinks,
} from '@/lib/organization/profile-types'
import { db } from '@/lib/db'
import { organizations, organizationSettings } from '@/lib/db/schema'

export interface OrgProfileFormState {
  error: string | null
  ok: boolean
  newSlug?: string
}

export interface SlugCheckState {
  available: boolean
  error: string | null
}

function parseHoursFromFormData(formData: FormData): BusinessHours {
  const hours = createDefaultBusinessHours()
  for (const day of WEEKDAYS) {
    hours[day.key] = {
      closed: formData.get(`hours_${day.key}_closed`) === 'on',
      open: String(formData.get(`hours_${day.key}_open`) ?? '09:00'),
      close: String(formData.get(`hours_${day.key}_close`) ?? '18:00'),
    }
  }
  return hours
}

function parseSocialFromFormData(formData: FormData): SocialLinks {
  const keys = ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp', 'youtube', 'x'] as const
  const links: SocialLinks = {}
  for (const key of keys) {
    const value = String(formData.get(`social_${key}`) ?? '').trim()
    if (value) links[key] = value
  }
  return links
}

function parseOptionalCoordinate(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return value
}

export async function checkOrganizationSlugAction(
  orgSlug: string,
  candidateSlug: string
): Promise<SlugCheckState> {
  const access = await getActionAccess(orgSlug, 'configuracion', 'view')
  if (!access) {
    return { available: false, error: 'Sin permiso para verificar el slug.' }
  }

  const slug = normalizeOrganizationSlug(candidateSlug)
  if (slug.length < 2) {
    return { available: false, error: 'Mínimo 2 caracteres.' }
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { available: false, error: 'Solo minúsculas, números y guiones.' }
  }

  // isOrganizationSlugAvailable uses Supabase RPC (auth.uid()-scoped)
  const available = await isOrganizationSlugAvailable(slug, access.organization.id)
  if (!available) {
    return { available: false, error: 'Ese slug ya está en uso por otra sucursal.' }
  }

  return { available: true, error: null }
}

export async function updateOrganizationProfileAction(
  orgSlug: string,
  _prevState: OrgProfileFormState,
  formData: FormData
): Promise<OrgProfileFormState> {
  const access = await getActionAccess(orgSlug, 'configuracion', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const name = String(formData.get('name') ?? '').trim()
  const slug = normalizeOrganizationSlug(String(formData.get('slug') ?? ''))
  const description = String(formData.get('description') ?? '').trim()
  const locationAddress = String(formData.get('location_address') ?? '').trim()
  const locationLat = parseOptionalCoordinate(formData.get('location_lat'))
  const locationLng = parseOptionalCoordinate(formData.get('location_lng'))
  const businessHours = parseHoursFromFormData(formData)
  const socialLinks = parseSocialFromFormData(formData)

  if (name.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres.', ok: false }
  }
  if (slug.length < 2) {
    return { error: 'El slug debe tener al menos 2 caracteres.', ok: false }
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { error: 'Slug inválido. Usa minúsculas, números y guiones.', ok: false }
  }

  // isOrganizationSlugAvailable uses Supabase RPC (auth.uid()-scoped)
  const slugAvailable = await isOrganizationSlugAvailable(slug, access.organization.id)
  if (!slugAvailable) {
    return { error: 'Ese slug ya está en uso por otra sucursal.', ok: false }
  }

  if (description.length > 2000) {
    return { error: 'La descripción no puede superar 2000 caracteres.', ok: false }
  }

  if (locationAddress.length > 500) {
    return { error: 'La dirección no puede superar 500 caracteres.', ok: false }
  }

  if (locationLat !== null && (locationLat < -90 || locationLat > 90)) {
    return { error: 'Latitud inválida.', ok: false }
  }

  if (locationLng !== null && (locationLng < -180 || locationLng > 180)) {
    return { error: 'Longitud inválida.', ok: false }
  }

  for (const day of WEEKDAYS) {
    const row = businessHours[day.key]
    if (row.closed) continue
    if (!row.open || !row.close) {
      return { error: `Completa los horarios de ${day.label}.`, ok: false }
    }
  }

  for (const [label, url] of Object.entries(socialLinks)) {
    if (url && !isValidHttpUrl(url)) {
      return { error: `La URL de ${label} no es válida (usa http:// o https://).`, ok: false }
    }
  }

  const now = new Date().toISOString()

  try {
    await db
      .update(organizations)
      .set({ name, slug, updatedAt: now })
      .where(eq(organizations.id, access.organization.id))
  } catch (err) {
    const e = err as { code?: string; message?: string; cause?: { code?: string } }
    const code = e.code ?? e.cause?.code
    if (code === '23505') {
      return { error: 'Ese slug ya está en uso por otra sucursal.', ok: false }
    }
    return { error: e.message || 'No se pudo actualizar la sucursal.', ok: false }
  }

  try {
    await db
      .update(organizationSettings)
      .set({
        description: description || null,
        locationAddress: locationAddress || null,
        locationLat,
        locationLng,
        businessHours: businessHours as Record<string, unknown>,
        socialLinks: socialLinks as Record<string, unknown>,
        updatedAt: now,
      })
      .where(eq(organizationSettings.organizationId, access.organization.id))
  } catch (err) {
    const message = (err as { message?: string }).message
    return { error: message || 'No se pudo guardar la configuración.', ok: false }
  }

  revalidatePath(`/${orgSlug}`, 'layout')
  revalidatePath(`/${slug}`, 'layout')
  revalidatePath(`/${slug}/configuracion`)

  if (slug !== orgSlug) {
    redirect(`/${slug}/configuracion?guardado=1`)
  }

  return { error: null, ok: true, newSlug: slug }
}

'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getActionAccess, permissionDeniedState } from '@/lib/auth/access'
import { getOrganizationBranding } from '@/lib/data/org-branding'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isValidLogoUrl, normalizeHex } from '@/lib/theme/branding'
import {
  deleteBrandLogoByUrl,
  isAcceptableBrandLogoUrl,
  parseBrandLogoUrlFromForm,
  shouldRemoveBrandLogo,
} from '@/lib/utils/brand-logo'
import { db } from '@/lib/db'
import { organizationSettings } from '@/lib/db/schema'

export interface BrandingFormState {
  error: string | null
  ok: boolean
}

// Storage operations stay on Supabase client (bucket access requires auth.uid())
async function resolveBrandLogoUrl(
  formData: FormData,
  organizationId: string,
  currentLogoUrl: string | null
): Promise<{ logoUrl: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()

  if (shouldRemoveBrandLogo(formData)) {
    if (currentLogoUrl) {
      await deleteBrandLogoByUrl(supabase, currentLogoUrl, organizationId)
    }
    return { logoUrl: null, error: null }
  }

  const submittedUrl = parseBrandLogoUrlFromForm(formData)

  if (submittedUrl) {
    if (!isAcceptableBrandLogoUrl(submittedUrl, organizationId, currentLogoUrl)) {
      return {
        logoUrl: null,
        error: 'El logo debe subirse como archivo desde este formulario.',
      }
    }

    if (submittedUrl !== currentLogoUrl && currentLogoUrl) {
      await deleteBrandLogoByUrl(supabase, currentLogoUrl, organizationId)
    }

    return { logoUrl: submittedUrl, error: null }
  }

  return { logoUrl: currentLogoUrl, error: null }
}

export async function updateOrganizationBrandingAction(
  orgSlug: string,
  _prevState: BrandingFormState,
  formData: FormData
): Promise<BrandingFormState> {
  const access = await getActionAccess(orgSlug, 'configuracion-marca', 'edit')
  if (!access) {
    return permissionDeniedState()
  }

  const organizationId = access.organization.id
  const currentBranding = await getOrganizationBranding(organizationId)
  const wallpaperRaw = String(formData.get('panel_wallpaper_url') ?? '').trim()

  const pl = normalizeHex(String(formData.get('primary_color_light') ?? ''))
  const pd = normalizeHex(String(formData.get('primary_color_dark') ?? ''))
  const al = normalizeHex(String(formData.get('accent_color_light') ?? ''))
  const ad = normalizeHex(String(formData.get('accent_color_dark') ?? ''))
  const ml = normalizeHex(String(formData.get('muted_color_light') ?? ''))
  const md = normalizeHex(String(formData.get('muted_color_dark') ?? ''))
  const sbl = normalizeHex(String(formData.get('shell_background_light') ?? ''))
  const sbd = normalizeHex(String(formData.get('shell_background_dark') ?? ''))
  const ssl = normalizeHex(String(formData.get('shell_surface_light') ?? ''))
  const ssd = normalizeHex(String(formData.get('shell_surface_dark') ?? ''))

  const logoResult = await resolveBrandLogoUrl(
    formData,
    organizationId,
    currentBranding.logoUrl
  )

  if (logoResult.error) {
    return { error: logoResult.error, ok: false }
  }

  if (!isValidLogoUrl(wallpaperRaw)) {
    return {
      error: 'La URL del fondo del panel debe ser http(s) y tener como máximo 2048 caracteres (o déjala vacía).',
      ok: false,
    }
  }

  if (!pl || !pd || !al || !ad || !ml || !md || !sbl || !sbd || !ssl || !ssd) {
    return { error: 'Todos los colores deben ser hex válidos (#rgb o #rrggbb).', ok: false }
  }

  try {
    await db
      .update(organizationSettings)
      .set({
        logoUrl: logoResult.logoUrl,
        panelWallpaperUrl: wallpaperRaw.length > 0 ? wallpaperRaw : null,
        primaryColorLight: pl,
        primaryColorDark: pd,
        accentColorLight: al,
        accentColorDark: ad,
        mutedColorLight: ml,
        mutedColorDark: md,
        shellBackgroundLight: sbl,
        shellBackgroundDark: sbd,
        shellSurfaceLight: ssl,
        shellSurfaceDark: ssd,
        primaryColor: pl,
        accentColor: al,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(organizationSettings.organizationId, organizationId))
  } catch (err) {
    const message = (err as { message?: string }).message
    return { error: message || 'No se pudo guardar.', ok: false }
  }

  revalidatePath(`/${orgSlug}`, 'layout')
  revalidatePath(`/${orgSlug}/configuracion/marca`)
  return { error: null, ok: true }
}

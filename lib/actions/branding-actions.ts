'use server'

import { revalidatePath } from 'next/cache'
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

export interface BrandingFormState {
  error: string | null
  ok: boolean
}

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

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('organization_settings')
    .update({
      logo_url: logoResult.logoUrl,
      panel_wallpaper_url: wallpaperRaw.length > 0 ? wallpaperRaw : null,
      primary_color_light: pl,
      primary_color_dark: pd,
      accent_color_light: al,
      accent_color_dark: ad,
      muted_color_light: ml,
      muted_color_dark: md,
      shell_background_light: sbl,
      shell_background_dark: sbd,
      shell_surface_light: ssl,
      shell_surface_dark: ssd,
      primary_color: pl,
      accent_color: al,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)

  if (error) {
    return { error: error.message || 'No se pudo guardar.', ok: false }
  }

  revalidatePath(`/${orgSlug}`, 'layout')
  revalidatePath(`/${orgSlug}/configuracion/marca`)
  return { error: null, ok: true }
}

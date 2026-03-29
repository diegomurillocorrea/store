'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { isValidLogoUrl, normalizeHex } from '@/lib/theme/branding'

export interface BrandingFormState {
  error: string | null
  ok: boolean
}

export async function updateOrganizationBrandingAction(
  orgSlug: string,
  _prevState: BrandingFormState,
  formData: FormData
): Promise<BrandingFormState> {
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    return { error: 'Sin acceso a esta organización.', ok: false }
  }

  const logoRaw = String(formData.get('logo_url') ?? '').trim()

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

  if (!isValidLogoUrl(logoRaw)) {
    return { error: 'La URL del logo debe ser http(s) y tener como máximo 2048 caracteres.', ok: false }
  }

  if (!pl || !pd || !al || !ad || !ml || !md || !sbl || !sbd || !ssl || !ssd) {
    return { error: 'Todos los colores deben ser hex válidos (#rgb o #rrggbb).', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('organization_settings')
    .update({
      logo_url: logoRaw.length > 0 ? logoRaw : null,
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
    .eq('organization_id', access.organization.id)

  if (error) {
    return { error: error.message || 'No se pudo guardar.', ok: false }
  }

  revalidatePath(`/${orgSlug}`, 'layout')
  revalidatePath(`/${orgSlug}/configuracion/marca`)
  return { error: null, ok: true }
}

import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  DEFAULT_BRANDING,
  type OrganizationBranding,
} from '@/lib/theme/branding'

export async function getOrganizationBranding(
  organizationId: string
): Promise<OrganizationBranding> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('organization_settings')
    .select(
      `
      logo_url,
      primary_color_light,
      primary_color_dark,
      accent_color_light,
      accent_color_dark,
      muted_color_light,
      muted_color_dark,
      shell_background_light,
      shell_background_dark,
      shell_surface_light,
      shell_surface_dark,
      primary_color,
      accent_color
    `
    )
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error || !data) {
    return { ...DEFAULT_BRANDING }
  }

  const row = data as {
    logo_url: string | null
    primary_color_light: string | null
    primary_color_dark: string | null
    accent_color_light: string | null
    accent_color_dark: string | null
    muted_color_light: string | null
    muted_color_dark: string | null
    shell_background_light: string | null
    shell_background_dark: string | null
    shell_surface_light: string | null
    shell_surface_dark: string | null
    primary_color: string | null
    accent_color: string | null
  }

  const pl = row.primary_color_light?.trim() || row.primary_color?.trim() || DEFAULT_BRANDING.primaryColorLight
  const pd = row.primary_color_dark?.trim() || DEFAULT_BRANDING.primaryColorDark
  const al = row.accent_color_light?.trim() || row.accent_color?.trim() || DEFAULT_BRANDING.accentColorLight
  const ad = row.accent_color_dark?.trim() || DEFAULT_BRANDING.accentColorDark
  const ml = row.muted_color_light?.trim() || DEFAULT_BRANDING.mutedColorLight
  const md = row.muted_color_dark?.trim() || DEFAULT_BRANDING.mutedColorDark
  const sbl =
    row.shell_background_light?.trim() || DEFAULT_BRANDING.shellBackgroundLight
  const sbd = row.shell_background_dark?.trim() || DEFAULT_BRANDING.shellBackgroundDark
  const ssl = row.shell_surface_light?.trim() || DEFAULT_BRANDING.shellSurfaceLight
  const ssd = row.shell_surface_dark?.trim() || DEFAULT_BRANDING.shellSurfaceDark

  return {
    logoUrl: row.logo_url?.trim() || null,
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
  }
}

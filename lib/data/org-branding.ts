import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizationSettings } from '@/lib/db/schema'
import {
  DEFAULT_BRANDING,
  type OrganizationBranding,
} from '@/lib/theme/branding'

export const getOrganizationBranding = cache(async function getOrganizationBranding(
  organizationId: string
): Promise<OrganizationBranding> {
  try {
    const [row] = await db
      .select({
        logoUrl: organizationSettings.logoUrl,
        panelWallpaperUrl: organizationSettings.panelWallpaperUrl,
        primaryColorLight: organizationSettings.primaryColorLight,
        primaryColorDark: organizationSettings.primaryColorDark,
        accentColorLight: organizationSettings.accentColorLight,
        accentColorDark: organizationSettings.accentColorDark,
        mutedColorLight: organizationSettings.mutedColorLight,
        mutedColorDark: organizationSettings.mutedColorDark,
        shellBackgroundLight: organizationSettings.shellBackgroundLight,
        shellBackgroundDark: organizationSettings.shellBackgroundDark,
        shellSurfaceLight: organizationSettings.shellSurfaceLight,
        shellSurfaceDark: organizationSettings.shellSurfaceDark,
        primaryColor: organizationSettings.primaryColor,
        accentColor: organizationSettings.accentColor,
      })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1)

    if (!row) return { ...DEFAULT_BRANDING }

    const pl = row.primaryColorLight?.trim() || row.primaryColor?.trim() || DEFAULT_BRANDING.primaryColorLight
    const pd = row.primaryColorDark?.trim() || DEFAULT_BRANDING.primaryColorDark
    const al = row.accentColorLight?.trim() || row.accentColor?.trim() || DEFAULT_BRANDING.accentColorLight
    const ad = row.accentColorDark?.trim() || DEFAULT_BRANDING.accentColorDark
    const ml = row.mutedColorLight?.trim() || DEFAULT_BRANDING.mutedColorLight
    const md = row.mutedColorDark?.trim() || DEFAULT_BRANDING.mutedColorDark
    const sbl = row.shellBackgroundLight?.trim() || DEFAULT_BRANDING.shellBackgroundLight
    const sbd = row.shellBackgroundDark?.trim() || DEFAULT_BRANDING.shellBackgroundDark
    const ssl = row.shellSurfaceLight?.trim() || DEFAULT_BRANDING.shellSurfaceLight
    const ssd = row.shellSurfaceDark?.trim() || DEFAULT_BRANDING.shellSurfaceDark

    return {
      logoUrl: row.logoUrl?.trim() || null,
      panelWallpaperUrl: row.panelWallpaperUrl?.trim() || null,
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
  } catch (err) {
    console.error('getOrganizationBranding', err)
    return { ...DEFAULT_BRANDING }
  }
})

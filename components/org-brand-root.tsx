import type { OrganizationBranding } from '@/lib/theme/branding'
import { OrgBrandScopeStyles } from '@/components/org-brand-scope-styles'

interface OrgBrandRootProps {
  branding: OrganizationBranding
  children: React.ReactNode
}

/** Colores de marca: solo desde props (BD); el mapeo claro/oscuro está en OrgBrandScopeStyles. */
export function OrgBrandRoot({ branding, children }: OrgBrandRootProps) {
  return (
    <div
      className="org-brand-scope min-h-full"
      style={
        {
          '--org-p-l': branding.primaryColorLight,
          '--org-p-d': branding.primaryColorDark,
          '--org-a-l': branding.accentColorLight,
          '--org-a-d': branding.accentColorDark,
          '--org-m-l': branding.mutedColorLight,
          '--org-m-d': branding.mutedColorDark,
          '--org-shell-bg-l': branding.shellBackgroundLight,
          '--org-shell-bg-d': branding.shellBackgroundDark,
          '--org-shell-surface-l': branding.shellSurfaceLight,
          '--org-shell-surface-d': branding.shellSurfaceDark,
        } as React.CSSProperties
      }
    >
      <OrgBrandScopeStyles />
      {children}
    </div>
  )
}

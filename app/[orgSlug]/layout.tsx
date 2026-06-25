import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OrgBrandRoot } from '@/components/org-brand-root'
import { OrgDashboardShell } from '@/components/org-dashboard-shell'
import { getOrganizationBranding } from '@/lib/data/org-branding'
import { getOrgMemberAccess } from '@/lib/data/organizations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PATHNAME_HEADER } from '@/lib/request-pathname'

interface OrgLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params
  const access = await getOrgMemberAccess(orgSlug)

  if (!access) {
    redirect('/sucursales?motivo=sin-acceso')
  }

  const branding = await getOrganizationBranding(access.organization.id)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const headersList = await headers()
  const pathname = headersList.get(PATHNAME_HEADER) ?? `/${orgSlug}/dashboard`

  return (
    <OrgBrandRoot branding={branding}>
      <OrgDashboardShell
        orgSlug={orgSlug}
        orgName={access.organization.name}
        userEmail={user?.email ?? 'usuario@daiego.app'}
        branding={branding}
        permissions={[...access.permissions]}
        pathname={pathname}
      >
        {children}
      </OrgDashboardShell>
    </OrgBrandRoot>
  )
}

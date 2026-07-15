import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OrgBrandRoot } from '@/components/org-brand-root'
import { OrgDashboardShell } from '@/components/org-dashboard-shell'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getOrganizationBranding } from '@/lib/data/org-branding'
import { getOrgMemberAccess } from '@/lib/data/organizations'
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

  const [branding, user, headersList] = await Promise.all([
    getOrganizationBranding(access.organization.id),
    getCurrentUser(),
    headers(),
  ])
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

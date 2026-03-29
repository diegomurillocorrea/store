import { redirect } from 'next/navigation'
import { OrgBrandRoot } from '@/components/org-brand-root'
import { OrgDashboardShell } from '@/components/org-dashboard-shell'
import { getOrganizationBranding } from '@/lib/data/org-branding'
import { getOrgAccessBySlug } from '@/lib/data/organizations'

interface OrgLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params
  const access = await getOrgAccessBySlug(orgSlug)

  if (!access) {
    redirect('/orgs?motivo=sin-acceso')
  }

  const branding = await getOrganizationBranding(access.organization.id)

  return (
    <OrgBrandRoot branding={branding}>
      <OrgDashboardShell
        orgSlug={orgSlug}
        orgName={access.organization.name}
        branding={branding}
      >
        {children}
      </OrgDashboardShell>
    </OrgBrandRoot>
  )
}

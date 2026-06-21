import { SuppliersPanel } from '@/components/proveedores/suppliers-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getSuppliersByOrganizationId } from '@/lib/data/suppliers'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ProveedoresPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ProveedoresPage({ params }: ProveedoresPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'proveedores')
  const suppliers = await getSuppliersByOrganizationId(access.organization.id)
  const actions = getViewActionFlags(access.permissions, 'proveedores')

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Proveedores</Heading>
      <SuppliersPanel orgSlug={orgSlug} suppliers={suppliers} actions={actions} />
    </div>
  )
}

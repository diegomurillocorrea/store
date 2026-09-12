import { SuppliersPanel } from '@/components/proveedores/suppliers-panel'
import { ListPageFrame } from '@/components/list-page-frame'
import { requireViewAccess } from '@/lib/auth/access'
import { getSuppliersByOrganizationId } from '@/lib/data/suppliers'
import { getViewActionFlags } from '@/lib/permissions/views'

interface ProveedoresPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ProveedoresPage({ params }: ProveedoresPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'proveedores')
  const suppliers = await getSuppliersByOrganizationId(access.organization.id)
  const actions = getViewActionFlags(access.permissions, 'proveedores')

  return (
    <ListPageFrame title="Proveedores">
      <SuppliersPanel orgSlug={orgSlug} suppliers={suppliers} actions={actions} />
    </ListPageFrame>
  )
}

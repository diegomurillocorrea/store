import { notFound } from 'next/navigation'
import { SuppliersPanel } from '@/components/proveedores/suppliers-panel'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { getSuppliersByOrganizationId } from '@/lib/data/suppliers'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ProveedoresPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ProveedoresPage({ params }: ProveedoresPageProps) {
  const { orgSlug } = await params
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    notFound()
  }

  const suppliers = await getSuppliersByOrganizationId(access.organization.id)

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Proveedores</Heading>
      <SuppliersPanel orgSlug={orgSlug} suppliers={suppliers} />
    </div>
  )
}

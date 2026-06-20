import { notFound } from 'next/navigation'
import { CustomersPanel } from '@/components/clientes/customers-panel'
import { getCustomersByOrganizationId } from '@/lib/data/customers'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ClientesPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ClientesPage({ params }: ClientesPageProps) {
  const { orgSlug } = await params
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    notFound()
  }

  const customers = await getCustomersByOrganizationId(access.organization.id)

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Clientes</Heading>
      <CustomersPanel orgSlug={orgSlug} customers={customers} />
    </div>
  )
}

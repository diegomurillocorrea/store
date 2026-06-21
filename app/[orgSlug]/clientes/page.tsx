import { CustomersPanel } from '@/components/clientes/customers-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getCustomersByOrganizationId } from '@/lib/data/customers'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ClientesPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ClientesPage({ params }: ClientesPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'clientes')
  const customers = await getCustomersByOrganizationId(access.organization.id)
  const actions = getViewActionFlags(access.permissions, 'clientes')

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Clientes</Heading>
      <CustomersPanel orgSlug={orgSlug} customers={customers} actions={actions} />
    </div>
  )
}

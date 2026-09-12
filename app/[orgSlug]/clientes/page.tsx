import { CustomersPanel } from '@/components/clientes/customers-panel'
import { ListPageFrame } from '@/components/list-page-frame'
import { requireViewAccess } from '@/lib/auth/access'
import { getCustomersByOrganizationId } from '@/lib/data/customers'
import { getViewActionFlags } from '@/lib/permissions/views'

interface ClientesPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ClientesPage({ params }: ClientesPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'clientes')
  const customers = await getCustomersByOrganizationId(access.organization.id)
  const actions = getViewActionFlags(access.permissions, 'clientes')

  return (
    <ListPageFrame title="Clientes">
      <CustomersPanel orgSlug={orgSlug} customers={customers} actions={actions} />
    </ListPageFrame>
  )
}

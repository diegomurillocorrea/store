import { PosPanel } from '@/components/pos/pos-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getCustomersByOrganizationId } from '@/lib/data/customers'
import { getProductsByOrganizationId } from '@/lib/data/products'

interface PosPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function PosPage({ params }: PosPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'pos')
  const [products, customers] = await Promise.all([
    getProductsByOrganizationId(access.organization.id),
    getCustomersByOrganizationId(access.organization.id),
  ])

  return <PosPanel orgSlug={orgSlug} products={products} customers={customers} />
}

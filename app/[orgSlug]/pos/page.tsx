import { PosPanel } from '@/components/pos/pos-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getProductsByOrganizationId } from '@/lib/data/products'

interface PosPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function PosPage({ params }: PosPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'pos')
  const products = await getProductsByOrganizationId(access.organization.id)

  return <PosPanel orgSlug={orgSlug} products={products} />
}

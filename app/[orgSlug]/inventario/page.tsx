import { ModulePlaceholder } from '@/components/module-placeholder'
import { requireViewAccess } from '@/lib/auth/access'

interface InventarioPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function InventarioPage({ params }: InventarioPageProps) {
  const { orgSlug } = await params
  await requireViewAccess(orgSlug, 'inventario')

  return <ModulePlaceholder title="Existencias" description="Stock por ubicación. Próximamente." />
}

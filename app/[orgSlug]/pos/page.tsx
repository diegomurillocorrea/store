import { ModulePlaceholder } from '@/components/module-placeholder'
import { requireViewAccess } from '@/lib/auth/access'

interface PosPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function PosPage({ params }: PosPageProps) {
  const { orgSlug } = await params
  await requireViewAccess(orgSlug, 'pos')

  return <ModulePlaceholder title="Punto de venta" description="Carrito, cobros y tickets. Próximamente." />
}

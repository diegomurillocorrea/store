import { ModulePlaceholder } from '@/components/module-placeholder'
import { requireViewAccess } from '@/lib/auth/access'

interface MovimientosPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function MovimientosPage({ params }: MovimientosPageProps) {
  const { orgSlug } = await params
  await requireViewAccess(orgSlug, 'movimientos')

  return <ModulePlaceholder title="Movimientos" description="Kardex y trazabilidad. Próximamente." />
}

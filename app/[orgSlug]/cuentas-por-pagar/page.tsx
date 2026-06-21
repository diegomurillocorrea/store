import { ModulePlaceholder } from '@/components/module-placeholder'
import { requireViewAccess } from '@/lib/auth/access'

interface CuentasPorPagarPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CuentasPorPagarPage({ params }: CuentasPorPagarPageProps) {
  const { orgSlug } = await params
  await requireViewAccess(orgSlug, 'cuentas-por-pagar')

  return (
    <ModulePlaceholder title="Cuentas por pagar" description="Obligaciones con proveedores. Próximamente." />
  )
}

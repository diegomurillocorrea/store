import { ModulePlaceholder } from '@/components/module-placeholder'
import { requireViewAccess } from '@/lib/auth/access'

interface CuentasPorCobrarPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CuentasPorCobrarPage({ params }: CuentasPorCobrarPageProps) {
  const { orgSlug } = await params
  await requireViewAccess(orgSlug, 'cuentas-por-cobrar')

  return (
    <ModulePlaceholder title="Cuentas por cobrar" description="Cartera y abonos. Próximamente." />
  )
}

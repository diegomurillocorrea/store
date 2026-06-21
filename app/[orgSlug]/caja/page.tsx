import { ModulePlaceholder } from '@/components/module-placeholder'
import { requireViewAccess } from '@/lib/auth/access'

interface CajaPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CajaPage({ params }: CajaPageProps) {
  const { orgSlug } = await params
  await requireViewAccess(orgSlug, 'caja')

  return (
    <ModulePlaceholder title="Caja" description="Aperturas, cierres y arqueo. Próximamente." />
  )
}

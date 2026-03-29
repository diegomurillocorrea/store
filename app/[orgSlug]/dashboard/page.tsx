import { Heading, Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Strong, Text } from '@/styles/catalyst-ui-kit/text'

interface DashboardPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { orgSlug } = await params

  return (
    <div className="space-y-6">
      <div>
        <Heading>Panel</Heading>
        <Text className="mt-2">
          Resumen del negocio. Aquí conectarás métricas, alertas de inventario y accesos rápidos al POS.
        </Text>
      </div>
      <div className="rounded-lg border border-border bg-surface-muted/80 p-4 dark:bg-surface-muted/50">
        <Subheading level={3} className="text-sm">
          Contexto multi-tenant
        </Subheading>
        <Text className="mt-1">
          Estás en la organización <Strong>{orgSlug}</Strong>. Las rutas bajo{' '}
          <code className="text-sm text-muted-foreground">/{orgSlug}/…</code> comparten este espacio
          aislado cuando conectes la base de datos.
        </Text>
      </div>
    </div>
  )
}

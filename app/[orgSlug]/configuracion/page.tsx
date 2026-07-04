import { Suspense } from 'react'
import { OrgProfileForm } from '@/components/config/org-profile-form'
import { UrlNotificationTrigger } from '@/components/notifications/url-notification-trigger'
import { requireViewAccess } from '@/lib/auth/access'
import { getOrganizationProfile } from '@/lib/data/org-profile'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface ConfiguracionPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ guardado?: string }>
}

export default async function ConfiguracionPage({ params, searchParams }: ConfiguracionPageProps) {
  const { orgSlug } = await params
  await searchParams
  const access = await requireViewAccess(orgSlug, 'configuracion')
  const profile = await getOrganizationProfile(access.organization.id)
  const { canEdit } = getViewActionFlags(access.permissions, 'configuracion')

  if (!profile) {
    return (
      <Text role="alert">No se pudo cargar la configuración de la sucursal.</Text>
    )
  }

  return (
    <div>
      <Suspense fallback={null}>
        <UrlNotificationTrigger
          param="guardado"
          value="1"
          title="Configuración guardada correctamente."
          description="La URL de la sucursal se actualizó."
        />
      </Suspense>

      <Heading>Configuración</Heading>
      <Text className="mt-2 max-w-2xl">
        Administra el nombre, slug, descripción, ubicación, horarios y redes sociales de esta sucursal.
      </Text>

      <div className="mt-10">
        <OrgProfileForm orgSlug={orgSlug} initial={profile} canEdit={canEdit} />
      </div>
    </div>
  )
}

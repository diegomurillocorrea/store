import { BrandingForm } from '@/components/config/branding-form'
import { requireViewAccess } from '@/lib/auth/access'
import { getOrganizationBranding } from '@/lib/data/org-branding'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface MarcaPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function MarcaPage({ params }: MarcaPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'configuracion')
  const branding = await getOrganizationBranding(access.organization.id)
  const { canEdit } = getViewActionFlags(access.permissions, 'configuracion')

  return (
    <div>
      <Heading>Marca y colores</Heading>
      <Text className="mt-2 max-w-2xl">
        Personaliza el logo, un fondo de imagen tipo WhatsApp para el panel de contenido, colores del lienzo y la
        paleta de marca. Los cambios se aplican para todos los usuarios de esta organización.
      </Text>
      <div className="mt-10">
        <BrandingForm orgSlug={orgSlug} initial={branding} canEdit={canEdit} />
      </div>
    </div>
  )
}

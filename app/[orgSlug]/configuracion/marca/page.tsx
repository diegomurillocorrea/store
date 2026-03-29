import { notFound } from 'next/navigation'
import { BrandingForm } from '@/components/config/branding-form'
import { getOrganizationBranding } from '@/lib/data/org-branding'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface MarcaPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function MarcaPage({ params }: MarcaPageProps) {
  const { orgSlug } = await params
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    notFound()
  }

  const branding = await getOrganizationBranding(access.organization.id)

  return (
    <div>
      <Heading>Marca y colores</Heading>
      <Text className="mt-2 max-w-2xl">
        Personaliza el logo y la paleta de esta organización. Los cambios se aplican en la barra lateral y
        elementos destacados para todos los usuarios del negocio.
      </Text>
      <div className="mt-10">
        <BrandingForm orgSlug={orgSlug} initial={branding} />
      </div>
    </div>
  )
}

import { TagsPanel } from '@/components/etiquetas/tags-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getTagsByOrganizationId } from '@/lib/data/tags'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface EtiquetasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function EtiquetasPage({ params }: EtiquetasPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'etiquetas')
  const actions = getViewActionFlags(access.permissions, 'etiquetas')
  const tags = await getTagsByOrganizationId(access.organization.id)

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Etiquetas</Heading>
      <div className="mt-8">
        <TagsPanel orgSlug={orgSlug} tags={tags} actions={actions} />
      </div>
    </div>
  )
}

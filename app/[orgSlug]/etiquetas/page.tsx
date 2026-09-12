import { TagsPanel } from '@/components/etiquetas/tags-panel'
import { ListPageFrame } from '@/components/list-page-frame'
import { requireViewAccess } from '@/lib/auth/access'
import { getTagsByOrganizationId } from '@/lib/data/tags'
import { getViewActionFlags } from '@/lib/permissions/views'

interface EtiquetasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function EtiquetasPage({ params }: EtiquetasPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'etiquetas')
  const actions = getViewActionFlags(access.permissions, 'etiquetas')
  const tags = await getTagsByOrganizationId(access.organization.id)

  return (
    <ListPageFrame title="Etiquetas" spaced>
      <TagsPanel orgSlug={orgSlug} tags={tags} actions={actions} />
    </ListPageFrame>
  )
}

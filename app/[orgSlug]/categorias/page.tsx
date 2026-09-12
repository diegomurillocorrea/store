import { CategoriesPanel } from '@/components/categorias/categories-panel'
import { ListPageFrame } from '@/components/list-page-frame'
import { requireViewAccess } from '@/lib/auth/access'
import { getCategoriesByOrganizationId } from '@/lib/data/categories'
import { getViewActionFlags } from '@/lib/permissions/views'

interface CategoriasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CategoriasPage({ params }: CategoriasPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'categorias')
  const categories = await getCategoriesByOrganizationId(access.organization.id)
  const actions = getViewActionFlags(access.permissions, 'categorias')

  return (
    <ListPageFrame title="Categorías" spaced>
      <CategoriesPanel orgSlug={orgSlug} categories={categories} actions={actions} />
    </ListPageFrame>
  )
}

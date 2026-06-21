import { CategoriesPanel } from '@/components/categorias/categories-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getCategoriesByOrganizationId } from '@/lib/data/categories'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface CategoriasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CategoriasPage({ params }: CategoriasPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'categorias')
  const categories = await getCategoriesByOrganizationId(access.organization.id)
  const actions = getViewActionFlags(access.permissions, 'categorias')

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Categorías</Heading>
      <CategoriesPanel orgSlug={orgSlug} categories={categories} actions={actions} />
    </div>
  )
}

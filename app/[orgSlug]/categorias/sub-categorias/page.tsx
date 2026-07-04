import { CatalogNav } from '@/components/categorias/catalog-nav'
import { SubCategoriesPanel } from '@/components/categorias/subcategories-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getCategoriesByOrganizationId } from '@/lib/data/categories'
import { getSubCategoriesByOrganizationId } from '@/lib/data/subcategories'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface SubCategoriasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function SubCategoriasPage({ params }: SubCategoriasPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'categorias')
  const organizationId = access.organization.id
  const actions = getViewActionFlags(access.permissions, 'categorias')

  const [categories, subCategories] = await Promise.all([
    getCategoriesByOrganizationId(organizationId),
    getSubCategoriesByOrganizationId(organizationId),
  ])

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Subcategorías</Heading>
      <CatalogNav orgSlug={orgSlug} />
      <div className="mt-8">
        <SubCategoriesPanel
          orgSlug={orgSlug}
          categories={categories}
          subCategories={subCategories}
          actions={actions}
        />
      </div>
    </div>
  )
}

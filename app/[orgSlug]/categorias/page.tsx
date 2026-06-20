import { notFound } from 'next/navigation'
import { CategoriesPanel } from '@/components/categorias/categories-panel'
import {
  getCategoriesByOrganizationId,
  seedDefaultCategories,
} from '@/lib/data/categories'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface CategoriasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CategoriasPage({ params }: CategoriasPageProps) {
  const { orgSlug } = await params
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    notFound()
  }

  await seedDefaultCategories(access.organization.id)
  const categories = await getCategoriesByOrganizationId(access.organization.id)

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Categorías</Heading>
      <CategoriesPanel orgSlug={orgSlug} categories={categories} />
    </div>
  )
}

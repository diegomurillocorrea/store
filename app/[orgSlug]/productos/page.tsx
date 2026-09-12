import { ProductsPanel } from '@/components/productos/products-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getCategoriesByOrganizationId } from '@/lib/data/categories'
import { getProductsByOrganizationId } from '@/lib/data/products'
import { getTagOptionsByOrganizationId } from '@/lib/data/tags'
import { getSuppliersByOrganizationId } from '@/lib/data/suppliers'
import { getViewActionFlags } from '@/lib/permissions/views'
import { parseProductFiltersFromPageSearchParams } from '@/lib/utils/product-filters-url'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ProductosPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductosPage({ params, searchParams }: ProductosPageProps) {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const { query: initialQuery, columnFilters: initialColumnFilters } =
    parseProductFiltersFromPageSearchParams(resolvedSearchParams)
  const access = await requireViewAccess(orgSlug, 'productos')
  const organizationId = access.organization.id
  const actions = getViewActionFlags(access.permissions, 'productos')

  const [products, categories, tags, suppliers] = await Promise.all([
    getProductsByOrganizationId(organizationId),
    getCategoriesByOrganizationId(organizationId),
    getTagOptionsByOrganizationId(organizationId),
    getSuppliersByOrganizationId(organizationId),
  ])

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))

  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }))

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Productos</Heading>
      <ProductsPanel
        orgSlug={orgSlug}
        organizationId={organizationId}
        products={products}
        categories={categoryOptions}
        tags={tags}
        suppliers={supplierOptions}
        actions={actions}
        initialQuery={initialQuery}
        initialColumnFilters={initialColumnFilters}
      />
    </div>
  )
}

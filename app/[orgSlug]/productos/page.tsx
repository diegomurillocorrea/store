import { notFound } from 'next/navigation'
import { ProductsPanel } from '@/components/productos/products-panel'
import { getCategoriesByOrganizationId } from '@/lib/data/categories'
import { getOrgAccessBySlug } from '@/lib/data/organizations'
import { getProductsByOrganizationId } from '@/lib/data/products'
import { getSuppliersByOrganizationId } from '@/lib/data/suppliers'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ProductosPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ProductosPage({ params }: ProductosPageProps) {
  const { orgSlug } = await params
  const access = await getOrgAccessBySlug(orgSlug)
  if (!access) {
    notFound()
  }

  const organizationId = access.organization.id

  const [products, categories, suppliers] = await Promise.all([
    getProductsByOrganizationId(organizationId),
    getCategoriesByOrganizationId(organizationId),
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
        suppliers={supplierOptions}
      />
    </div>
  )
}

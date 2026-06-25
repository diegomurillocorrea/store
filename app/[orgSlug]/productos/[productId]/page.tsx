import { notFound } from 'next/navigation'
import { ProductDetailPanel } from '@/components/productos/product-detail-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getCategoriesByOrganizationId } from '@/lib/data/categories'
import { getProductById } from '@/lib/data/products'
import { getSuppliersByOrganizationId } from '@/lib/data/suppliers'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

interface ProductDetailPageProps {
  params: Promise<{ orgSlug: string; productId: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { orgSlug, productId } = await params
  const access = await requireViewAccess(orgSlug, 'productos')
  const organizationId = access.organization.id
  const actions = getViewActionFlags(access.permissions, 'productos')

  const [product, categories, suppliers] = await Promise.all([
    getProductById(organizationId, productId),
    getCategoriesByOrganizationId(organizationId),
    getSuppliersByOrganizationId(organizationId),
  ])

  if (!product) {
    notFound()
  }

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
      <Heading>Producto</Heading>
      <ProductDetailPanel
        orgSlug={orgSlug}
        organizationId={organizationId}
        product={product}
        categories={categoryOptions}
        suppliers={supplierOptions}
        actions={actions}
      />
    </div>
  )
}

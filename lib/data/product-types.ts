export interface ProductRow {
  id: string
  name: string
  sku: string
  barcode: string | null
  availableQuantity: number
  salePrice: number
  costPrice: number | null
  categoryId: string | null
  categoryName: string | null
  supplierId: string | null
  supplierName: string | null
  imageUrl: string | null
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface ProductOption {
  id: string
  name: string
}

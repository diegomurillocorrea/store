export type ProductColumnKey =
  | 'name'
  | 'category'
  | 'subCategory'
  | 'salePrice'
  | 'costPrice'
  | 'stock'
  | 'profit'
  | 'profitPercent'

export type ProductColumnFilters = Partial<Record<ProductColumnKey, string[]>>

const COLUMN_PARAM_MAP: Record<string, ProductColumnKey> = {
  nombre: 'name',
  categoria: 'category',
  subcategoria: 'subCategory',
  precio: 'salePrice',
  costo: 'costPrice',
  stock: 'stock',
  ganancia: 'profit',
  margen: 'profitPercent',
}

const COLUMN_KEY_TO_PARAM = Object.fromEntries(
  Object.entries(COLUMN_PARAM_MAP).map(([param, key]) => [key, param])
) as Record<ProductColumnKey, string>

type SearchParamsLike = Pick<URLSearchParams, 'get' | 'getAll'>

export function parseProductFiltersFromSearchParams(
  searchParams: SearchParamsLike
): { query: string; columnFilters: ProductColumnFilters } {
  const query = searchParams.get('buscar') ?? ''
  const columnFilters: ProductColumnFilters = {}

  for (const [param, key] of Object.entries(COLUMN_PARAM_MAP)) {
    const values = searchParams.getAll(param).filter((value) => value.length > 0)
    if (values.length > 0) {
      columnFilters[key] = values
    }
  }

  return { query, columnFilters }
}

export function buildProductFiltersSearchParams(
  query: string,
  columnFilters: ProductColumnFilters
): URLSearchParams {
  const params = new URLSearchParams()
  const trimmedQuery = query.trim()

  if (trimmedQuery) {
    params.set('buscar', trimmedQuery)
  }

  for (const key of Object.keys(columnFilters) as ProductColumnKey[]) {
    const values = columnFilters[key]
    if (!values || values.length === 0) continue

    const param = COLUMN_KEY_TO_PARAM[key]
    for (const value of values) {
      params.append(param, value)
    }
  }

  return params
}

export function buildProductosHref(
  pathname: string,
  query: string,
  columnFilters: ProductColumnFilters
): string {
  const params = buildProductFiltersSearchParams(query, columnFilters)
  const search = params.toString()
  return search ? `${pathname}?${search}` : pathname
}

export function parseProductFiltersFromPageSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): { query: string; columnFilters: ProductColumnFilters } {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
      continue
    }
    params.set(key, value)
  }

  return parseProductFiltersFromSearchParams(params)
}

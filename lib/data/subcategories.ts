import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface SubCategoryRow {
  id: string
  name: string
  categoryId: string
  categoryName: string
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface SubCategoryOption {
  id: string
  name: string
  categoryId: string
}

interface RawSubCategoryRow {
  id: string
  name: string
  category_id: string
  created_at: string
  created_by: string | null
  category: { id: string; name: string } | { id: string; name: string }[] | null
  creator: { display_name: string | null } | { display_name: string | null }[] | null
}

function mapSubCategoryRow(row: RawSubCategoryRow): SubCategoryRow {
  const category = Array.isArray(row.category) ? row.category[0] : row.category
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator

  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: category?.name ?? '',
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: creator?.display_name?.trim() || null,
  }
}

export async function getSubCategoriesByOrganizationId(
  organizationId: string
): Promise<SubCategoryRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('subcategories')
    .select(
      `
      id,
      name,
      category_id,
      created_at,
      created_by,
      category:categories ( id, name ),
      creator:organization_members!subcategories_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('getSubCategoriesByOrganizationId', error)
    return []
  }

  return (data ?? []).map((row) => mapSubCategoryRow(row as unknown as RawSubCategoryRow))
}

export async function getSubCategoryOptionsByOrganizationId(
  organizationId: string
): Promise<SubCategoryOption[]> {
  const rows = await getSubCategoriesByOrganizationId(organizationId)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
  }))
}

export async function getSubCategoryById(
  organizationId: string,
  subCategoryId: string
): Promise<SubCategoryRow | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('subcategories')
    .select(
      `
      id,
      name,
      category_id,
      created_at,
      created_by,
      category:categories ( id, name ),
      creator:organization_members!subcategories_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .eq('id', subCategoryId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('getSubCategoryById', error)
    return null
  }

  return mapSubCategoryRow(data as unknown as RawSubCategoryRow)
}

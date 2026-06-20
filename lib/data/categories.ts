import { DEFAULT_CATEGORY_NAMES } from '@/lib/data/default-categories'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface CategoryRow {
  id: string
  name: string
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

interface RawCategoryRow {
  id: string
  name: string
  created_at: string
  created_by: string | null
  creator: { display_name: string | null } | { display_name: string | null }[] | null
}

function mapCategoryRow(row: RawCategoryRow): CategoryRow {
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: creator?.display_name?.trim() || null,
  }
}

export async function getCategoriesByOrganizationId(
  organizationId: string
): Promise<CategoryRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select(
      `
      id,
      name,
      created_at,
      created_by,
      creator:organization_members!categories_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('getCategoriesByOrganizationId', error)
    return []
  }

  return (data ?? []).map((row) => mapCategoryRow(row as unknown as RawCategoryRow))
}

/** Inserta categorías del catálogo inicial que aún no existen (por nombre). */
export async function seedDefaultCategories(organizationId: string): Promise<number> {
  const supabase = await createSupabaseServerClient()

  const { data: existing, error: existingError } = await supabase
    .from('categories')
    .select('name')
    .eq('organization_id', organizationId)

  if (existingError) {
    console.error('seedDefaultCategories:existing', existingError)
    return 0
  }

  const existingNames = new Set(
    (existing ?? []).map((row) => String(row.name).trim().toLowerCase())
  )

  const rowsToInsert = DEFAULT_CATEGORY_NAMES.flatMap((name) => {
    if (existingNames.has(name.trim().toLowerCase())) return []
    return [{ organization_id: organizationId, name }]
  })

  if (rowsToInsert.length === 0) return 0

  const { error } = await supabase.from('categories').insert(rowsToInsert)
  if (error) {
    console.error('seedDefaultCategories:insert', error)
    return 0
  }

  return rowsToInsert.length
}

export async function getActiveMemberIdForOrganization(
  organizationId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !member) return null
  return member.id
}

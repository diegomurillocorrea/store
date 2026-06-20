import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface SupplierRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

interface RawSupplierRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  created_at: string
  created_by: string | null
  creator: { display_name: string | null } | { display_name: string | null }[] | null
}

function mapSupplierRow(row: RawSupplierRow): SupplierRow {
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: creator?.display_name?.trim() || null,
  }
}

export async function getSuppliersByOrganizationId(
  organizationId: string
): Promise<SupplierRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select(
      `
      id,
      name,
      phone,
      email,
      created_at,
      created_by,
      creator:organization_members!suppliers_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    const isMissingCreatedBy =
      error.code === '42703' ||
      error.message?.includes('created_by') ||
      error.code === 'PGRST200'

    if (isMissingCreatedBy) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('suppliers')
        .select('id, name, phone, email, created_at')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (fallbackError) {
        console.error('getSuppliersByOrganizationId:fallback', fallbackError)
        return []
      }

      return (fallbackData ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        createdAt: row.created_at,
        createdBy: null,
        createdByName: null,
      }))
    }

    console.error('getSuppliersByOrganizationId', error)
    return []
  }

  return (data ?? []).map((row) => mapSupplierRow(row as unknown as RawSupplierRow))
}

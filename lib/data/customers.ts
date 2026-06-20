import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CustomerRow } from '@/lib/data/customer-types'

export type { CustomerRow } from '@/lib/data/customer-types'
export { getCustomerFullName } from '@/lib/data/customer-types'

interface RawCustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  created_at: string
  created_by: string | null
  creator: { display_name: string | null } | { display_name: string | null }[] | null
}

function mapCustomerRow(row: RawCustomerRow): CustomerRow {
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: creator?.display_name?.trim() || null,
  }
}

export async function getCustomersByOrganizationId(
  organizationId: string
): Promise<CustomerRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('customers')
    .select(
      `
      id,
      first_name,
      last_name,
      phone,
      email,
      created_at,
      created_by,
      creator:organization_members!customers_created_by_fkey ( display_name )
    `
    )
    .eq('organization_id', organizationId)
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })

  if (error) {
    const isMissingColumns =
      error.code === '42703' ||
      error.code === 'PGRST200' ||
      error.code === 'PGRST204' ||
      error.message?.includes('first_name') ||
      error.message?.includes('created_by') ||
      error.message?.includes('schema cache')

    if (isMissingColumns) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('customers')
        .select('id, name, phone, email, created_at')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (fallbackError) {
        console.error('getCustomersByOrganizationId:fallback', fallbackError)
        return []
      }

      return (fallbackData ?? []).map((row) => {
        const nameParts = (row.name ?? '').trim().split(/\s+/).filter(Boolean)

        return {
          id: row.id,
          firstName: nameParts[0] ?? '',
          lastName: nameParts.slice(1).join(' '),
          phone: row.phone,
          email: row.email,
          createdAt: row.created_at,
          createdBy: null,
          createdByName: null,
        }
      })
    }

    console.error('getCustomersByOrganizationId', error)
    return []
  }

  return (data ?? []).map((row) => mapCustomerRow(row as unknown as RawCustomerRow))
}

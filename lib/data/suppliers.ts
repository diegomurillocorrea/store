import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { organizationMembers, suppliers } from '@/lib/db/schema'

export interface SupplierRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export async function getSuppliersByOrganizationId (
  organizationId: string
): Promise<SupplierRow[]> {
  try {
    const creator = alias(organizationMembers, 'supplier_creator')
    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        email: suppliers.email,
        createdAt: suppliers.createdAt,
        createdBy: suppliers.createdBy,
        createdByName: creator.displayName,
      })
      .from(suppliers)
      .leftJoin(creator, eq(suppliers.createdBy, creator.id))
      .where(eq(suppliers.organizationId, organizationId))
      .orderBy(asc(suppliers.name))

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      createdByName: row.createdByName?.trim() || null,
    }))
  } catch (error) {
    console.error('getSuppliersByOrganizationId', error)
    return []
  }
}

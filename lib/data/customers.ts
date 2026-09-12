import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { CustomerRow } from '@/lib/data/customer-types'
import { db } from '@/lib/db'
import { customers, organizationMembers } from '@/lib/db/schema'

export type { CustomerRow } from '@/lib/data/customer-types'
export { getCustomerFullName } from '@/lib/data/customer-types'

export async function getCustomersByOrganizationId (
  organizationId: string
): Promise<CustomerRow[]> {
  try {
    const creator = alias(organizationMembers, 'customer_creator')
    const rows = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        email: customers.email,
        createdAt: customers.createdAt,
        createdBy: customers.createdBy,
        createdByName: creator.displayName,
      })
      .from(customers)
      .leftJoin(creator, eq(customers.createdBy, creator.id))
      .where(eq(customers.organizationId, organizationId))
      .orderBy(asc(customers.firstName), asc(customers.lastName))

    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      createdByName: row.createdByName?.trim() || null,
    }))
  } catch (error) {
    console.error('getCustomersByOrganizationId', error)
    return []
  }
}

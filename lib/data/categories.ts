import { and, asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { DEFAULT_CATEGORY_NAMES } from '@/lib/data/default-categories'
import { getCurrentUser } from '@/lib/auth/current-user'
import { db } from '@/lib/db'
import { categories, organizationMembers } from '@/lib/db/schema'

export interface CategoryRow {
  id: string
  name: string
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export async function getCategoriesByOrganizationId (
  organizationId: string
): Promise<CategoryRow[]> {
  try {
    const creator = alias(organizationMembers, 'category_creator')
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        createdAt: categories.createdAt,
        createdBy: categories.createdBy,
        createdByName: creator.displayName,
      })
      .from(categories)
      .leftJoin(creator, eq(categories.createdBy, creator.id))
      .where(eq(categories.organizationId, organizationId))
      .orderBy(asc(categories.name))

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      createdByName: row.createdByName?.trim() || null,
    }))
  } catch (error) {
    console.error('getCategoriesByOrganizationId', error)
    return []
  }
}

/** Inserta categorías del catálogo inicial que aún no existen (por nombre). */
export async function seedDefaultCategories (organizationId: string): Promise<number> {
  try {
    const existing = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.organizationId, organizationId))

    const existingNames = new Set(
      existing.map((row) => String(row.name).trim().toLowerCase())
    )

    const rowsToInsert = DEFAULT_CATEGORY_NAMES.flatMap((name) => {
      if (existingNames.has(name.trim().toLowerCase())) return []
      return [{ organizationId, name }]
    })

    if (rowsToInsert.length === 0) return 0

    await db.insert(categories).values(rowsToInsert)
    return rowsToInsert.length
  } catch (error) {
    console.error('seedDefaultCategories', error)
    return 0
  }
}

export async function getActiveMemberIdForOrganization (
  organizationId: string
): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  try {
    const [member] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.status, 'active')
        )
      )
      .limit(1)

    return member?.id ?? null
  } catch (error) {
    console.error('getActiveMemberIdForOrganization', error)
    return null
  }
}

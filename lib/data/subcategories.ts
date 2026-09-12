import { and, asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { categories, organizationMembers, subcategories } from '@/lib/db/schema'

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

async function selectSubCategories (organizationId: string, subCategoryId?: string) {
  const creator = alias(organizationMembers, 'subcategory_creator')
  const conditions = [eq(subcategories.organizationId, organizationId)]
  if (subCategoryId) {
    conditions.push(eq(subcategories.id, subCategoryId))
  }

  return db
    .select({
      id: subcategories.id,
      name: subcategories.name,
      categoryId: subcategories.categoryId,
      categoryName: categories.name,
      createdAt: subcategories.createdAt,
      createdBy: subcategories.createdBy,
      createdByName: creator.displayName,
    })
    .from(subcategories)
    .leftJoin(categories, eq(subcategories.categoryId, categories.id))
    .leftJoin(creator, eq(subcategories.createdBy, creator.id))
    .where(and(...conditions))
    .orderBy(asc(subcategories.name))
}

function mapRow (row: Awaited<ReturnType<typeof selectSubCategories>>[number]): SubCategoryRow {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? '',
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    createdByName: row.createdByName?.trim() || null,
  }
}

export async function getSubCategoriesByOrganizationId (
  organizationId: string
): Promise<SubCategoryRow[]> {
  try {
    const rows = await selectSubCategories(organizationId)
    return rows.map(mapRow)
  } catch (error) {
    console.error('getSubCategoriesByOrganizationId', error)
    return []
  }
}

export async function getSubCategoryOptionsByOrganizationId (
  organizationId: string
): Promise<SubCategoryOption[]> {
  const rows = await getSubCategoriesByOrganizationId(organizationId)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
  }))
}

export async function getSubCategoryById (
  organizationId: string,
  subCategoryId: string
): Promise<SubCategoryRow | null> {
  try {
    const rows = await selectSubCategories(organizationId, subCategoryId)
    const row = rows[0]
    if (!row) return null
    return mapRow(row)
  } catch (error) {
    console.error('getSubCategoryById', error)
    return null
  }
}

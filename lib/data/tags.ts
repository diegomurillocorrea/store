import { and, asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { organizationMembers, tags } from '@/lib/db/schema'

export interface TagRow {
  id: string
  name: string
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface TagOption {
  id: string
  name: string
}

async function selectTags (organizationId: string, tagId?: string) {
  const creator = alias(organizationMembers, 'tag_creator')
  const conditions = [eq(tags.organizationId, organizationId)]
  if (tagId) {
    conditions.push(eq(tags.id, tagId))
  }

  return db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
      createdBy: tags.createdBy,
      createdByName: creator.displayName,
    })
    .from(tags)
    .leftJoin(creator, eq(tags.createdBy, creator.id))
    .where(and(...conditions))
    .orderBy(asc(tags.name))
}

function mapRow (row: Awaited<ReturnType<typeof selectTags>>[number]): TagRow {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    createdByName: row.createdByName?.trim() || null,
  }
}

export async function getTagsByOrganizationId (
  organizationId: string
): Promise<TagRow[]> {
  try {
    const rows = await selectTags(organizationId)
    return rows.map(mapRow)
  } catch (error) {
    console.error('getTagsByOrganizationId', error)
    return []
  }
}

export async function getTagOptionsByOrganizationId (
  organizationId: string
): Promise<TagOption[]> {
  const rows = await getTagsByOrganizationId(organizationId)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
  }))
}

export async function getTagById (
  organizationId: string,
  tagId: string
): Promise<TagRow | null> {
  try {
    const rows = await selectTags(organizationId, tagId)
    const row = rows[0]
    if (!row) return null
    return mapRow(row)
  } catch (error) {
    console.error('getTagById', error)
    return null
  }
}

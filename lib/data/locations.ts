import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { locations } from '@/lib/db/schema'

export async function getDefaultLocationId (
  organizationId: string
): Promise<string | null> {
  try {
    const [defaultLocation] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.organizationId, organizationId),
          eq(locations.isDefault, true)
        )
      )
      .limit(1)

    if (defaultLocation?.id) return defaultLocation.id

    const [anyLocation] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.organizationId, organizationId))
      .orderBy(asc(locations.createdAt))
      .limit(1)

    return anyLocation?.id ?? null
  } catch (error) {
    console.error('getDefaultLocationId', error)
    return null
  }
}

export async function getOrCreateDefaultLocationId (
  organizationId: string
): Promise<string | null> {
  const existing = await getDefaultLocationId(organizationId)
  if (existing) return existing

  try {
    const [created] = await db
      .insert(locations)
      .values({
        organizationId,
        name: 'Principal',
        isDefault: true,
      })
      .returning({ id: locations.id })

    return created?.id ?? null
  } catch (error) {
    console.error('getOrCreateDefaultLocationId', error)
    return null
  }
}

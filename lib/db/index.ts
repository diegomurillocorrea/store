import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getDatabaseUrl } from '@/lib/db/env'
import * as schema from '@/lib/db/schema'

const globalForDb = globalThis as unknown as {
  storePg?: ReturnType<typeof postgres>
  storeDb?: ReturnType<typeof drizzle<typeof schema>>
}

function createClient () {
  return postgres(getDatabaseUrl(), {
    prepare: false,
    max: 10,
  })
}

export function getDb () {
  if (!globalForDb.storePg) {
    globalForDb.storePg = createClient()
  }
  if (!globalForDb.storeDb) {
    globalForDb.storeDb = drizzle(globalForDb.storePg, { schema })
  }
  return globalForDb.storeDb
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get (_target, prop, receiver) {
    const instance = getDb()
    const value = Reflect.get(instance, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

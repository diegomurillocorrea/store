import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env' })
config({ path: '.env.local', override: true })

/**
 * Solo introspección / pull. El DDL del proyecto sigue en
 * supabase/migrations + npm run db:apply. No uses drizzle-kit push.
 */
export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  schemaFilter: ['public'],
})

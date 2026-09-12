<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase (proyecto store)

Migraciones y DDL remoto: **solo** vía CLI vinculada, nunca `db push` ni MCP.

```bash
npm run db:apply -- supabase/migrations/ARCHIVO.sql
npm run db:apply:latest
npm run db:query -- "SELECT 1;"
```

Detalle completo: `.cursor/rules/store.mdc`

## Zona horaria

Siempre `America/El_Salvador` (`DEFAULT_TIME_ZONE` en `lib/utils/local-date.ts`). No usar Mexico City ni la zona del navegador para fechas de negocio (ventas, caja, balances).

## Drizzle

Consultas de negocio en servidor: `lib/db` + `DATABASE_URL` (Transaction pooler, puerto 6543). Auth/Storage/RPCs con `auth.uid()` siguen en Supabase. DDL sigue con `db:apply`, no `drizzle-kit push`.


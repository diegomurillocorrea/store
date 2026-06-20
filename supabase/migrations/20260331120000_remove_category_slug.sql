-- Simplificar categorías: id, nombre, created_at, created_by (+ organization_id para multi-tenant)

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_organization_id_slug_key;
ALTER TABLE categories DROP COLUMN IF EXISTS slug;

ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;
ALTER TABLE categories DROP COLUMN IF EXISTS sort_order;

DROP INDEX IF EXISTS idx_categories_org_parent;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES organization_members (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_org ON categories (organization_id);

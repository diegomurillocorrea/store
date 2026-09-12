-- Etiquetas independientes de categorías (antes: subcategorías)
-- Un producto: 1 categoría + N etiquetas (product_tags)

CREATE TABLE IF NOT EXISTS tags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_shared_key UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_org_name_unique
  ON tags (organization_id, lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS tags_org_owner_shared_key_unique
  ON tags (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tags_org ON tags (organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_owner_shared_key ON tags (owner_shared_key);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  tag_id           UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tags_org ON product_tags (organization_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags (tag_id);

-- Migrar subcategorías → etiquetas (una por org + nombre, sin depender de categoría)
DO $$
DECLARE
  has_subcategories BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subcategories'
  ) INTO has_subcategories;

  IF has_subcategories THEN
    -- Insertar etiquetas deduplicadas por org + nombre
    INSERT INTO tags (organization_id, name, created_by, created_at, owner_shared_key)
    SELECT
      src.organization_id,
      src.name,
      src.created_by,
      src.created_at,
      src.owner_shared_key
    FROM (
      SELECT DISTINCT ON (s.organization_id, lower(trim(s.name)))
        s.organization_id,
        trim(s.name) AS name,
        s.created_by,
        s.created_at,
        s.owner_shared_key
      FROM subcategories s
      WHERE trim(s.name) <> ''
      ORDER BY s.organization_id, lower(trim(s.name)), s.created_at ASC
    ) src
    WHERE NOT EXISTS (
      SELECT 1
      FROM tags t
      WHERE t.organization_id = src.organization_id
        AND lower(trim(t.name)) = lower(trim(src.name))
    );

    -- Enlazar productos que tenían subcategoría
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'sub_category_id'
    ) THEN
      INSERT INTO product_tags (product_id, tag_id, organization_id)
      SELECT DISTINCT
        p.id,
        t.id,
        p.organization_id
      FROM products p
      INNER JOIN subcategories s ON s.id = p.sub_category_id
      INNER JOIN tags t
        ON t.organization_id = p.organization_id
       AND lower(trim(t.name)) = lower(trim(s.name))
      WHERE p.sub_category_id IS NOT NULL
      ON CONFLICT DO NOTHING;

      ALTER TABLE products DROP COLUMN IF EXISTS sub_category_id;
    END IF;

    DROP TABLE IF EXISTS subcategories CASCADE;
  END IF;
END $$;

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_all_member ON tags;
CREATE POLICY tags_all_member ON tags
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

DROP POLICY IF EXISTS product_tags_all_member ON product_tags;
CREATE POLICY product_tags_all_member ON product_tags
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

NOTIFY pgrst, 'reload schema';

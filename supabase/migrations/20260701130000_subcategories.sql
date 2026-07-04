-- Subcategorías por categoría y enlace opcional en productos

CREATE TABLE IF NOT EXISTS subcategories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  category_id      UUID NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subcategories_org_category_name_unique
  ON subcategories (organization_id, category_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_subcategories_org ON subcategories (organization_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories (category_id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES subcategories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_org_sub_category
  ON products (organization_id, sub_category_id);

ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subcategories_all_member ON subcategories;
CREATE POLICY subcategories_all_member ON subcategories
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

NOTIFY pgrst, 'reload schema';

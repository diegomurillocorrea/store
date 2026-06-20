-- Productos: proveedor, cantidad disponible y created_by (mismo patrón que categorías/clientes)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS available_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES organization_members (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_org_supplier ON products (organization_id, supplier_id);

CREATE UNIQUE INDEX IF NOT EXISTS products_org_barcode_unique
  ON products (organization_id, barcode)
  WHERE barcode IS NOT NULL AND trim(barcode) <> '';

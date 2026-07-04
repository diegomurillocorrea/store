-- Catálogo compartido por propietario: misma entidad en todas las sucursales
-- al crear; editar/eliminar sigue siendo por organización (sucursal).

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS owner_shared_key UUID;

ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS owner_shared_key UUID;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS owner_shared_key UUID;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS owner_shared_key UUID;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS owner_shared_key UUID;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS owner_shared_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS categories_org_owner_shared_key_unique
  ON categories (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subcategories_org_owner_shared_key_unique
  ON subcategories (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_org_owner_shared_key_unique
  ON suppliers (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_org_owner_shared_key_unique
  ON customers (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_org_owner_shared_key_unique
  ON employees (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_org_owner_shared_key_unique
  ON products (organization_id, owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_owner_shared_key
  ON categories (owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subcategories_owner_shared_key
  ON subcategories (owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_owner_shared_key
  ON suppliers (owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_owner_shared_key
  ON customers (owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_owner_shared_key
  ON employees (owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_owner_shared_key
  ON products (owner_shared_key)
  WHERE owner_shared_key IS NOT NULL;

NOTIFY pgrst, 'reload schema';

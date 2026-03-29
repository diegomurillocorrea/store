-- Store — POS e inventario (multi-tenant) para Supabase
-- Ejecutar después: 20260328120001_rls_policies.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE member_status AS ENUM ('invited', 'active', 'suspended');
CREATE TYPE sale_status AS ENUM ('draft', 'completed', 'voided');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'other', 'credit');
CREATE TYPE cash_session_status AS ENUM ('open', 'closed');
CREATE TYPE movement_type AS ENUM (
  'purchase_receipt',
  'sale',
  'adjustment',
  'transfer_out',
  'transfer_in',
  'return_customer',
  'return_supplier',
  'initial'
);
CREATE TYPE receivable_status AS ENUM ('open', 'partial', 'paid', 'written_off');
CREATE TYPE payable_status AS ENUM ('open', 'partial', 'paid', 'void');

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  timezone        TEXT NOT NULL DEFAULT 'America/Mexico_City',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
  currency_code   TEXT NOT NULL DEFAULT 'MXN',
  tax_label       TEXT NOT NULL DEFAULT 'IVA',
  default_tax_rate NUMERIC(7, 4) NOT NULL DEFAULT 0.16,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  settings        JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  code        TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  is_system        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions (code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE organization_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name     TEXT,
  status           member_status NOT NULL DEFAULT 'active',
  invited_email    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE member_roles (
  member_id UUID NOT NULL REFERENCES organization_members (id) ON DELETE CASCADE,
  role_id   UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, role_id)
);

CREATE INDEX idx_organization_members_org ON organization_members (organization_id);
CREATE INDEX idx_organization_members_user ON organization_members (user_id);

CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES categories (id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_categories_org_parent ON categories (organization_id, parent_id);

CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  tax_id           TEXT,
  credit_limit     NUMERIC(18, 2),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_org_name ON customers (organization_id, lower(name));

CREATE TABLE suppliers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  tax_id           TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_org_name ON suppliers (organization_id, lower(name));

CREATE TABLE locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_default_location_per_org
  ON locations (organization_id)
  WHERE is_default = true;

CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories (id) ON DELETE SET NULL,
  sku              TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  barcode          TEXT,
  sale_price       NUMERIC(18, 4) NOT NULL DEFAULT 0,
  cost_price       NUMERIC(18, 4),
  tax_rate         NUMERIC(7, 4),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sku)
);

CREATE INDEX idx_products_org_category ON products (organization_id, category_id);
CREATE INDEX idx_products_org_active ON products (organization_id) WHERE is_active = true;

CREATE TABLE product_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku              TEXT NOT NULL,
  name             TEXT,
  attributes       JSONB NOT NULL DEFAULT '{}',
  sale_price       NUMERIC(18, 4),
  barcode          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sku)
);

CREATE INDEX idx_variants_product ON product_variants (product_id);

CREATE TABLE stock_levels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  variant_id       UUID REFERENCES product_variants (id) ON DELETE CASCADE,
  location_id      UUID NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  quantity         NUMERIC(18, 4) NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX stock_levels_unique_no_variant
  ON stock_levels (organization_id, product_id, location_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX stock_levels_unique_with_variant
  ON stock_levels (organization_id, product_id, variant_id, location_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX idx_stock_levels_org_loc ON stock_levels (organization_id, location_id);

CREATE TABLE inventory_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  variant_id       UUID REFERENCES product_variants (id) ON DELETE CASCADE,
  location_id      UUID NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  movement_type    movement_type NOT NULL,
  quantity_delta   NUMERIC(18, 4) NOT NULL,
  unit_cost        NUMERIC(18, 4),
  reference_type   TEXT,
  reference_id     UUID,
  notes            TEXT,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_org_created ON inventory_movements (organization_id, created_at DESC);
CREATE INDEX idx_movements_org_product ON inventory_movements (organization_id, product_id);

CREATE TABLE cash_registers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  location_id      UUID REFERENCES locations (id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cash_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  cash_register_id UUID NOT NULL REFERENCES cash_registers (id) ON DELETE CASCADE,
  status           cash_session_status NOT NULL DEFAULT 'open',
  opening_amount   NUMERIC(18, 2) NOT NULL DEFAULT 0,
  closing_amount   NUMERIC(18, 2),
  difference       NUMERIC(18, 2),
  opened_by        UUID NOT NULL REFERENCES organization_members (id) ON DELETE RESTRICT,
  closed_by        UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at        TIMESTAMPTZ,
  notes            TEXT
);

CREATE INDEX idx_cash_sessions_org_open ON cash_sessions (organization_id) WHERE status = 'open';

CREATE TABLE sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers (id) ON DELETE SET NULL,
  cash_session_id  UUID REFERENCES cash_sessions (id) ON DELETE SET NULL,
  status           sale_status NOT NULL DEFAULT 'draft',
  sale_number      TEXT,
  subtotal         NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_total        NUMERIC(18, 2) NOT NULL DEFAULT 0,
  discount_total   NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total            NUMERIC(18, 2) NOT NULL DEFAULT 0,
  void_reason      TEXT,
  voided_at        TIMESTAMPTZ,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_org_created ON sales (organization_id, created_at DESC);
CREATE INDEX idx_sales_org_status ON sales (organization_id, status);

CREATE TABLE sale_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  variant_id       UUID REFERENCES product_variants (id) ON DELETE RESTRICT,
  description      TEXT,
  quantity         NUMERIC(18, 4) NOT NULL,
  unit_price       NUMERIC(18, 4) NOT NULL,
  line_discount    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_rate         NUMERIC(7, 4),
  line_tax         NUMERIC(18, 2) NOT NULL DEFAULT 0,
  line_total       NUMERIC(18, 2) NOT NULL
);

CREATE INDEX idx_sale_lines_sale ON sale_lines (sale_id);

CREATE TABLE sale_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  method           payment_method NOT NULL,
  amount           NUMERIC(18, 2) NOT NULL,
  reference        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_payments_sale ON sale_payments (sale_id);

CREATE TABLE receivables (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  sale_id          UUID REFERENCES sales (id) ON DELETE SET NULL,
  document_number  TEXT,
  issued_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at           DATE,
  total            NUMERIC(18, 2) NOT NULL,
  balance_due      NUMERIC(18, 2) NOT NULL,
  status           receivable_status NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receivables_org_customer ON receivables (organization_id, customer_id);
CREATE INDEX idx_receivables_org_status ON receivables (organization_id, status);

CREATE TABLE receivable_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id    UUID NOT NULL REFERENCES receivables (id) ON DELETE CASCADE,
  amount           NUMERIC(18, 2) NOT NULL,
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  method           payment_method NOT NULL DEFAULT 'cash',
  reference        TEXT,
  recorded_by      UUID REFERENCES organization_members (id) ON DELETE SET NULL
);

CREATE INDEX idx_receivable_payments_rec ON receivable_payments (receivable_id);

CREATE TABLE payables (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  document_number  TEXT,
  issued_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at           DATE,
  total            NUMERIC(18, 2) NOT NULL,
  balance_due      NUMERIC(18, 2) NOT NULL,
  status           payable_status NOT NULL DEFAULT 'open',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payables_org_supplier ON payables (organization_id, supplier_id);

CREATE TABLE payable_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id       UUID NOT NULL REFERENCES payables (id) ON DELETE CASCADE,
  amount           NUMERIC(18, 2) NOT NULL,
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  method           payment_method NOT NULL DEFAULT 'transfer',
  reference        TEXT,
  recorded_by      UUID REFERENCES organization_members (id) ON DELETE SET NULL
);

CREATE INDEX idx_payable_payments_pay ON payable_payments (payable_id);

CREATE TABLE purchases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  reference        TEXT,
  status           TEXT NOT NULL DEFAULT 'received',
  total            NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id      UUID NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  variant_id       UUID REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity         NUMERIC(18, 4) NOT NULL,
  unit_cost        NUMERIC(18, 4) NOT NULL,
  line_total       NUMERIC(18, 2) NOT NULL
);

CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations (id) ON DELETE CASCADE,
  actor_member_id  UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_created ON audit_logs (organization_id, created_at DESC);

INSERT INTO permissions (code, description) VALUES
  ('org.settings', 'Ver y editar configuración de la organización'),
  ('pos.sale', 'Crear y completar ventas en POS'),
  ('pos.void', 'Anular ventas'),
  ('pos.discount', 'Aplicar descuentos ampliados'),
  ('inventory.view', 'Ver inventario y movimientos'),
  ('inventory.adjust', 'Ajustes de inventario'),
  ('products.write', 'Crear y editar productos'),
  ('categories.write', 'Crear y editar categorías'),
  ('customers.write', 'Crear y editar clientes'),
  ('suppliers.write', 'Crear y editar proveedores'),
  ('cash.open_close', 'Abrir y cerrar caja'),
  ('ar.manage', 'Cuentas por cobrar y cobros'),
  ('ap.manage', 'Cuentas por pagar y pagos'),
  ('members.invite', 'Invitar empleados y asignar roles'),
  ('reports.financial', 'Reportes financieros sensibles')
ON CONFLICT (code) DO NOTHING;

-- RLS multi-tenant: acceso por membresía (auth.users ↔ organization_members)
-- Requiere migración previa 20260328120000_initial_schema.sql

-- IDs de organizaciones donde el usuario autenticado es miembro activo (evita recursión en RLS)
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.organization_id
  FROM organization_members m
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'::member_status;
$$;

REVOKE ALL ON FUNCTION public.user_organization_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;

-- Crear organización + settings + primera membresía (usuario actual como dueño)
CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_organization: sesión requerida';
  END IF;
  IF length(trim(p_slug)) < 2 THEN
    RAISE EXCEPTION 'create_organization: slug inválido';
  END IF;

  INSERT INTO organizations (name, slug)
  VALUES (trim(p_name), lower(trim(p_slug)))
  RETURNING id INTO v_org_id;

  INSERT INTO organization_settings (organization_id) VALUES (v_org_id);

  INSERT INTO organization_members (organization_id, user_id, status)
  VALUES (v_org_id, auth.uid(), 'active');

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;

-- ----------------------------------------------------------------------------- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- organizations (sin INSERT directo: usar create_organization)
-- Incluye orgs con invitación pendiente (misma fila en organization_members aún no activa)
CREATE POLICY organizations_select_member ON organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.user_organization_ids())
    OR id IN (
      SELECT m.organization_id
      FROM organization_members m
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY organizations_update_member ON organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.user_organization_ids()))
  WITH CHECK (id IN (SELECT public.user_organization_ids()));

-- organization_settings (lectura también si hay invitación pendiente)
CREATE POLICY organization_settings_select ON organization_settings
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.user_organization_ids())
    OR organization_id IN (
      SELECT m.organization_id
      FROM organization_members m
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY organization_settings_insert ON organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY organization_settings_update ON organization_settings
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY organization_settings_delete ON organization_settings
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- catálogo global de permisos
CREATE POLICY permissions_select_authenticated ON permissions
  FOR SELECT TO authenticated
  USING (true);

-- roles
CREATE POLICY roles_all_member ON roles
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- role_permissions
CREATE POLICY role_permissions_all_member ON role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IN (SELECT public.user_organization_ids())
    )
  );

-- organization_members
CREATE POLICY organization_members_select ON organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY organization_members_insert ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY organization_members_update ON organization_members
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY organization_members_delete ON organization_members
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- Invitaciones: el usuario puede actualizar su propia fila (p. ej. activar cuenta)
CREATE POLICY organization_members_update_self ON organization_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- member_roles
CREATE POLICY member_roles_all_member ON member_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members m
      WHERE m.id = member_roles.member_id
        AND m.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members m
      WHERE m.id = member_roles.member_id
        AND m.organization_id IN (SELECT public.user_organization_ids())
    )
  );

-- Tablas con organization_id directo
CREATE POLICY categories_all_member ON categories
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY customers_all_member ON customers
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY suppliers_all_member ON suppliers
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY locations_all_member ON locations
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY products_all_member ON products
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY product_variants_all_member ON product_variants
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY stock_levels_all_member ON stock_levels
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY inventory_movements_all_member ON inventory_movements
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY cash_registers_all_member ON cash_registers
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY cash_sessions_all_member ON cash_sessions
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY sales_all_member ON sales
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY receivables_all_member ON receivables
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY payables_all_member ON payables
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY purchases_all_member ON purchases
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY audit_logs_all_member ON audit_logs
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- Hijas sin organization_id (aislamiento vía padre)
CREATE POLICY sale_lines_all_member ON sale_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_lines.sale_id
        AND s.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_lines.sale_id
        AND s.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY sale_payments_all_member ON sale_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_payments.sale_id
        AND s.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_payments.sale_id
        AND s.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY receivable_payments_all_member ON receivable_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receivables r
      WHERE r.id = receivable_payments.receivable_id
        AND r.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receivables r
      WHERE r.id = receivable_payments.receivable_id
        AND r.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY payable_payments_all_member ON payable_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payables p
      WHERE p.id = payable_payments.payable_id
        AND p.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payables p
      WHERE p.id = payable_payments.payable_id
        AND p.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY purchase_lines_all_member ON purchase_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_lines.purchase_id
        AND p.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_lines.purchase_id
        AND p.organization_id IN (SELECT public.user_organization_ids())
    )
  );

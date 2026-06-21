-- Permisos por vista (Ver / Crear / Editar / Eliminar) y roles del sistema

INSERT INTO permissions (code, description) VALUES
  ('dashboard.view', 'Ver inicio'),
  ('dashboard.create', 'Crear en inicio'),
  ('dashboard.edit', 'Editar en inicio'),
  ('dashboard.delete', 'Eliminar en inicio'),
  ('pos.view', 'Ver punto de venta'),
  ('pos.create', 'Crear ventas en POS'),
  ('pos.edit', 'Editar ventas en POS'),
  ('pos.delete', 'Anular ventas en POS'),
  ('caja.view', 'Ver caja'),
  ('caja.create', 'Abrir caja'),
  ('caja.edit', 'Editar caja'),
  ('caja.delete', 'Cerrar o anular caja'),
  ('productos.view', 'Ver productos'),
  ('productos.create', 'Crear productos'),
  ('productos.edit', 'Editar productos'),
  ('productos.delete', 'Eliminar productos'),
  ('categorias.view', 'Ver categorías'),
  ('categorias.create', 'Crear categorías'),
  ('categorias.edit', 'Editar categorías'),
  ('categorias.delete', 'Eliminar categorías'),
  ('inventario.view', 'Ver existencias'),
  ('inventario.create', 'Crear en inventario'),
  ('inventario.edit', 'Editar inventario'),
  ('inventario.delete', 'Eliminar en inventario'),
  ('movimientos.view', 'Ver movimientos'),
  ('movimientos.create', 'Registrar movimientos'),
  ('movimientos.edit', 'Editar movimientos'),
  ('movimientos.delete', 'Eliminar movimientos'),
  ('clientes.view', 'Ver clientes'),
  ('clientes.create', 'Crear clientes'),
  ('clientes.edit', 'Editar clientes'),
  ('clientes.delete', 'Eliminar clientes'),
  ('proveedores.view', 'Ver proveedores'),
  ('proveedores.create', 'Crear proveedores'),
  ('proveedores.edit', 'Editar proveedores'),
  ('proveedores.delete', 'Eliminar proveedores'),
  ('empleados.view', 'Ver empleados'),
  ('empleados.create', 'Crear empleados'),
  ('empleados.edit', 'Editar empleados'),
  ('empleados.delete', 'Eliminar empleados'),
  ('roles.view', 'Ver roles y permisos'),
  ('roles.create', 'Crear roles'),
  ('roles.edit', 'Editar permisos de roles'),
  ('roles.delete', 'Eliminar roles'),
  ('cuentas-por-cobrar.view', 'Ver cuentas por cobrar'),
  ('cuentas-por-cobrar.create', 'Crear cuentas por cobrar'),
  ('cuentas-por-cobrar.edit', 'Editar cuentas por cobrar'),
  ('cuentas-por-cobrar.delete', 'Eliminar cuentas por cobrar'),
  ('cuentas-por-pagar.view', 'Ver cuentas por pagar'),
  ('cuentas-por-pagar.create', 'Crear cuentas por pagar'),
  ('cuentas-por-pagar.edit', 'Editar cuentas por pagar'),
  ('cuentas-por-pagar.delete', 'Eliminar cuentas por pagar'),
  ('configuracion.view', 'Ver configuración de marca'),
  ('configuracion.create', 'Crear en configuración'),
  ('configuracion.edit', 'Editar marca y colores'),
  ('configuracion.delete', 'Eliminar en configuración')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_organization_roles(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id uuid;
  v_vendedor_role_id uuid;
BEGIN
  INSERT INTO roles (organization_id, name, slug, is_system)
  VALUES (p_org_id, 'Administrador', 'administrador', true)
  ON CONFLICT (organization_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_system = true
  RETURNING id INTO v_admin_role_id;

  IF v_admin_role_id IS NULL THEN
    SELECT id INTO v_admin_role_id
    FROM roles
    WHERE organization_id = p_org_id
      AND slug = 'administrador';
  END IF;

  INSERT INTO roles (organization_id, name, slug, is_system)
  VALUES (p_org_id, 'Vendedor', 'vendedor', true)
  ON CONFLICT (organization_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_system = true
  RETURNING id INTO v_vendedor_role_id;

  IF v_vendedor_role_id IS NULL THEN
    SELECT id INTO v_vendedor_role_id
    FROM roles
    WHERE organization_id = p_org_id
      AND slug = 'vendedor';
  END IF;

  INSERT INTO role_permissions (role_id, permission_code)
  SELECT v_admin_role_id, p.code
  FROM permissions p
  WHERE p.code LIKE '%.%'
    AND p.code NOT IN (
      SELECT rp.permission_code
      FROM role_permissions rp
      WHERE rp.role_id = v_admin_role_id
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_code)
  SELECT v_vendedor_role_id, v.code
  FROM (
    VALUES
      ('dashboard.view'),
      ('pos.view'),
      ('pos.create'),
      ('pos.edit'),
      ('caja.view'),
      ('caja.create'),
      ('caja.edit'),
      ('productos.view'),
      ('categorias.view'),
      ('inventario.view'),
      ('movimientos.view'),
      ('clientes.view'),
      ('clientes.create'),
      ('clientes.edit')
  ) AS v(code)
  WHERE NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = v_vendedor_role_id
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_organization_roles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_organization_roles(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_member_id uuid;
  v_admin_role_id uuid;
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
  VALUES (v_org_id, auth.uid(), 'active')
  RETURNING id INTO v_member_id;

  PERFORM public.seed_organization_roles(v_org_id);

  SELECT id INTO v_admin_role_id
  FROM roles
  WHERE organization_id = v_org_id
    AND slug = 'administrador';

  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO member_roles (member_id, role_id)
    VALUES (v_member_id, v_admin_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_org_id;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM organizations LOOP
    PERFORM public.seed_organization_roles(r.id);
  END LOOP;
END $$;

INSERT INTO member_roles (member_id, role_id)
SELECT m.id, ro.id
FROM organization_members m
JOIN roles ro
  ON ro.organization_id = m.organization_id
 AND ro.slug = 'administrador'
WHERE m.status = 'active'::member_status
  AND NOT EXISTS (
    SELECT 1 FROM member_roles mr WHERE mr.member_id = m.id
  )
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

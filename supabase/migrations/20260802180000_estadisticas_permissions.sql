-- Permisos para la vista de Estadísticas

INSERT INTO permissions (code, description) VALUES
  ('estadisticas.view', 'Ver estadísticas'),
  ('estadisticas.create', 'Crear en estadísticas'),
  ('estadisticas.edit', 'Editar estadísticas'),
  ('estadisticas.delete', 'Eliminar en estadísticas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'administrador'
  AND p.code LIKE 'estadisticas.%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, 'estadisticas.view'
FROM roles r
WHERE r.slug = 'vendedor'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_organization_roles(p_org_id uuid)
RETURNS boolean
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
      ('estadisticas.view'),
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

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_organization_roles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_organization_roles(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

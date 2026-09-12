-- Vista propia de Etiquetas (antes compartía permisos con Categorías)

INSERT INTO permissions (code, description) VALUES
  ('etiquetas.view', 'Ver etiquetas'),
  ('etiquetas.create', 'Crear etiquetas'),
  ('etiquetas.edit', 'Editar etiquetas'),
  ('etiquetas.delete', 'Eliminar etiquetas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT rp.role_id, replace(rp.permission_code, 'categorias.', 'etiquetas.')
FROM role_permissions rp
WHERE rp.permission_code LIKE 'categorias.%'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_organization_roles(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_propietario_role_id uuid;
  v_admin_role_id uuid;
  v_vendedor_role_id uuid;
BEGIN
  INSERT INTO roles (organization_id, name, slug, is_system)
  VALUES (p_org_id, 'Propietario', 'propietario', true)
  ON CONFLICT (organization_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_system = true
  RETURNING id INTO v_propietario_role_id;

  IF v_propietario_role_id IS NULL THEN
    SELECT id INTO v_propietario_role_id
    FROM roles
    WHERE organization_id = p_org_id
      AND slug = 'propietario';
  END IF;

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
  SELECT v_propietario_role_id, p.code
  FROM permissions p
  WHERE p.code LIKE '%.%'
    AND p.code NOT IN (
      SELECT rp.permission_code
      FROM role_permissions rp
      WHERE rp.role_id = v_propietario_role_id
    )
  ON CONFLICT DO NOTHING;

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
      ('etiquetas.view'),
      ('inventario.view'),
      ('movimientos.view'),
      ('clientes.view'),
      ('clientes.create'),
      ('clientes.edit')
  ) AS v(code)
  WHERE v.code NOT IN (
    SELECT rp.permission_code
    FROM role_permissions rp
    WHERE rp.role_id = v_vendedor_role_id
  )
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_organization_roles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_organization_roles(uuid) TO authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM organizations LOOP
    PERFORM public.seed_organization_roles(r.id);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

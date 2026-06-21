-- Rol Propietario: dueño de la organización (acceso total, no editable)

DROP FUNCTION IF EXISTS public.seed_organization_roles(uuid);

CREATE FUNCTION public.seed_organization_roles(p_org_id uuid)
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

CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_member_id uuid;
  v_propietario_role_id uuid;
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

  SELECT id INTO v_propietario_role_id
  FROM roles
  WHERE organization_id = v_org_id
    AND slug = 'propietario';

  IF v_propietario_role_id IS NOT NULL THEN
    INSERT INTO member_roles (member_id, role_id)
    VALUES (v_member_id, v_propietario_role_id)
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
SELECT DISTINCT ON (m.organization_id) m.id, ro.id
FROM organization_members m
JOIN roles ro
  ON ro.organization_id = m.organization_id
 AND ro.slug = 'propietario'
WHERE m.status = 'active'::member_status
  AND NOT EXISTS (
    SELECT 1
    FROM member_roles mr
    JOIN roles r ON r.id = mr.role_id
    WHERE mr.member_id = m.id
      AND r.slug = 'propietario'
  )
ORDER BY m.organization_id, m.created_at ASC
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- Al crear organización: ficha de empleado Propietario para el usuario creador

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
  v_user_email text;
  v_user_meta jsonb;
  v_full_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_organization: sesión requerida';
  END IF;
  IF length(trim(p_slug)) < 2 THEN
    RAISE EXCEPTION 'create_organization: slug inválido';
  END IF;

  SELECT u.email, u.raw_user_meta_data
  INTO v_user_email, v_user_meta
  FROM auth.users u
  WHERE u.id = auth.uid();

  v_full_name := nullif(trim(coalesce(
    v_user_meta->>'full_name',
    v_user_meta->>'name',
    ''
  )), '');

  v_first_name := coalesce(
    nullif(trim(split_part(v_full_name, ' ', 1)), ''),
    nullif(trim(split_part(v_user_email, '@', 1)), ''),
    'Usuario'
  );

  v_last_name := coalesce(
    nullif(trim(substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 2)), ''),
    ''
  );

  IF length(v_first_name) < 2 THEN
    v_first_name := 'Usuario';
  END IF;

  INSERT INTO organizations (name, slug)
  VALUES (trim(p_name), lower(trim(p_slug)))
  RETURNING id INTO v_org_id;

  INSERT INTO organization_settings (organization_id) VALUES (v_org_id);

  INSERT INTO organization_members (organization_id, user_id, status, display_name)
  VALUES (
    v_org_id,
    auth.uid(),
    'active',
    nullif(trim(v_full_name), '')
  )
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

    INSERT INTO employees (
      organization_id,
      first_name,
      last_name,
      email,
      status,
      role_id,
      created_by
    )
    VALUES (
      v_org_id,
      v_first_name,
      v_last_name,
      nullif(trim(v_user_email), ''),
      'active',
      v_propietario_role_id,
      v_member_id
    );
  END IF;

  RETURN v_org_id;
END;
$$;

INSERT INTO employees (
  organization_id,
  first_name,
  last_name,
  email,
  status,
  role_id,
  created_by
)
SELECT
  m.organization_id,
  CASE
    WHEN length(
      coalesce(
        nullif(trim(split_part(v_full_name, ' ', 1)), ''),
        nullif(trim(split_part(u.email, '@', 1)), ''),
        'Usuario'
      )
    ) >= 2 THEN coalesce(
      nullif(trim(split_part(v_full_name, ' ', 1)), ''),
      nullif(trim(split_part(u.email, '@', 1)), ''),
      'Usuario'
    )
    ELSE 'Usuario'
  END AS first_name,
  coalesce(
    nullif(trim(substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 2)), ''),
    ''
  ) AS last_name,
  nullif(trim(u.email), '') AS email,
  'active'::employee_status AS status,
  ro.id AS role_id,
  m.id AS created_by
FROM organization_members m
JOIN auth.users u ON u.id = m.user_id
JOIN member_roles mr ON mr.member_id = m.id
JOIN roles ro
  ON ro.id = mr.role_id
 AND ro.organization_id = m.organization_id
 AND ro.slug = 'propietario'
CROSS JOIN LATERAL (
  SELECT nullif(trim(coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    ''
  )), '') AS v_full_name
) names
WHERE m.status = 'active'::member_status
  AND NOT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.organization_id = m.organization_id
      AND (
        (e.email IS NOT NULL AND u.email IS NOT NULL AND lower(e.email) = lower(u.email))
        OR e.created_by = m.id
      )
  );

NOTIFY pgrst, 'reload schema';

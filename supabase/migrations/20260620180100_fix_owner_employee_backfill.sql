-- Corregir backfill: el propietario debe tener su ficha aunque haya creado otros empleados

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
  AND u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.organization_id = m.organization_id
      AND lower(e.email) = lower(u.email)
  );

NOTIFY pgrst, 'reload schema';

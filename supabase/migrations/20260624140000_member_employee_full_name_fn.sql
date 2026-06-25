-- Resolver nombre completo del empleado a partir del miembro que registró la venta/movimiento

CREATE OR REPLACE FUNCTION public.member_employee_full_name(
  p_organization_id uuid,
  p_member_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(trim(concat_ws(' ', e.first_name, e.last_name)), '')
  FROM organization_members m
  JOIN auth.users u ON u.id = m.user_id
  JOIN employees e
    ON e.organization_id = m.organization_id
   AND e.email IS NOT NULL
   AND lower(trim(e.email)) = lower(trim(u.email))
  WHERE m.organization_id = p_organization_id
    AND m.id = p_member_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.member_employee_full_name(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_employee_full_name(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

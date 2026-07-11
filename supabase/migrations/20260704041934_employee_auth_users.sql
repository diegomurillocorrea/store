-- Crear usuarios auth autoconfirmados al registrar empleados, y backfill de existentes

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees (user_id);

CREATE OR REPLACE FUNCTION public.create_confirmed_auth_user (
  p_email text,
  p_password text,
  p_full_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM organization_members m
    JOIN member_roles mr ON mr.member_id = m.id
    JOIN role_permissions rp ON rp.role_id = mr.role_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND rp.permission_code = 'empleados.create'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para crear usuarios de empleados.';
  END IF;

  v_email := lower(trim(p_email));

  IF v_email IS NULL OR v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'El correo electrónico no es válido.';
  END IF;

  IF p_password IS NULL OR char_length(p_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe un usuario con ese correo electrónico.';
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_strip_nulls(jsonb_build_object(
      'full_name', nullif(trim(coalesce(p_full_name, '')), ''),
      'email_verified', true
    )),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_confirmed_auth_user(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_confirmed_auth_user(text, text, text) TO authenticated;

-- Backfill: empleados con correo sin usuario auth → usuario autoconfirmado + membresía + rol
DO $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_member_id uuid;
  v_full_name text;
  v_temp_password text := 'Empleado123!';
  r_email record;
  r_emp record;
BEGIN
  FOR r_email IN
    SELECT DISTINCT lower(trim(e.email)) AS email
    FROM employees e
    WHERE e.email IS NOT NULL
      AND trim(e.email) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE lower(u.email) = lower(trim(e.email))
      )
  LOOP
    v_email := r_email.email;

    SELECT
      nullif(trim(concat_ws(' ', e.first_name, e.last_name)), '')
    INTO v_full_name
    FROM employees e
    WHERE lower(trim(e.email)) = v_email
    ORDER BY e.created_at ASC
    LIMIT 1;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_temp_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_strip_nulls(jsonb_build_object(
        'full_name', v_full_name,
        'email_verified', true
      )),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END LOOP;

  UPDATE employees e
  SET user_id = u.id
  FROM auth.users u
  WHERE e.email IS NOT NULL
    AND trim(e.email) <> ''
    AND e.user_id IS NULL
    AND lower(trim(e.email)) = lower(u.email);

  FOR r_emp IN
    SELECT
      e.id,
      e.organization_id,
      e.first_name,
      e.last_name,
      e.email,
      e.status,
      e.role_id,
      e.user_id
    FROM employees e
    WHERE e.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM organization_members m
        WHERE m.organization_id = e.organization_id
          AND m.user_id = e.user_id
      )
  LOOP
    INSERT INTO organization_members (
      organization_id,
      user_id,
      status,
      display_name
    ) VALUES (
      r_emp.organization_id,
      r_emp.user_id,
      CASE
        WHEN r_emp.status = 'active' THEN 'active'::member_status
        ELSE 'suspended'::member_status
      END,
      nullif(trim(concat_ws(' ', r_emp.first_name, r_emp.last_name)), '')
    )
    RETURNING id INTO v_member_id;

    IF r_emp.role_id IS NOT NULL THEN
      INSERT INTO member_roles (member_id, role_id)
      VALUES (v_member_id, r_emp.role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

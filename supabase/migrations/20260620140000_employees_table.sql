-- Empleados: fichas de personal por organización (independientes de auth.users)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
    CREATE TYPE employee_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS employees (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL DEFAULT '',
  phone            TEXT,
  email            TEXT,
  status           employee_status NOT NULL DEFAULT 'active',
  role_id          UUID REFERENCES roles (id) ON DELETE SET NULL,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_org_names ON employees (
  organization_id,
  lower(first_name),
  lower(last_name)
);

CREATE INDEX IF NOT EXISTS idx_employees_org_status ON employees (organization_id, status);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employees_all_member ON employees;

CREATE POLICY employees_all_member ON employees
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

NOTIFY pgrst, 'reload schema';

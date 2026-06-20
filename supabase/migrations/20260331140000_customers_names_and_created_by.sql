-- Clientes: nombres/apellidos separados y created_by (mismo patrón que proveedores)

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES organization_members (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'name'
  ) THEN
    UPDATE customers
    SET
      first_name = COALESCE(
        NULLIF(trim(split_part(name, ' ', 1)), ''),
        name
      ),
      last_name = COALESCE(
        NULLIF(trim(substring(name from position(' ' in name) + 1)), ''),
        ''
      )
    WHERE first_name IS NULL;

    ALTER TABLE customers DROP COLUMN name;
  END IF;
END $$;

ALTER TABLE customers
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN last_name SET DEFAULT '';

DROP INDEX IF EXISTS idx_customers_org_name;

CREATE INDEX IF NOT EXISTS idx_customers_org_names ON customers (
  organization_id,
  lower(first_name),
  lower(last_name)
);

-- Movimientos financieros manuales (ingresos y egresos fuera de ventas/compras)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_movement_type') THEN
    CREATE TYPE financial_movement_type AS ENUM ('income', 'expense');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS financial_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  cash_session_id  UUID REFERENCES cash_sessions (id) ON DELETE SET NULL,
  movement_type    financial_movement_type NOT NULL,
  concept          TEXT NOT NULL,
  amount           NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  movement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method   payment_method,
  reference        TEXT,
  created_by       UUID REFERENCES organization_members (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_movements_org_date
  ON financial_movements (organization_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_movements_org_type
  ON financial_movements (organization_id, movement_type);

ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_movements'
      AND policyname = 'financial_movements_all_member'
  ) THEN
    CREATE POLICY financial_movements_all_member ON financial_movements
      FOR ALL TO authenticated
      USING (organization_id IN (SELECT public.user_organization_ids()))
      WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

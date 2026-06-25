-- Campos adicionales para checkout POS: descuento % y cambio en efectivo

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(7, 4) NOT NULL DEFAULT 0;

ALTER TABLE sale_payments
  ADD COLUMN IF NOT EXISTS amount_tendered NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS change_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sales.discount_percent IS 'Porcentaje de descuento aplicado a la venta (0–100).';
COMMENT ON COLUMN sale_payments.amount_tendered IS 'Monto entregado por el cliente (efectivo).';
COMMENT ON COLUMN sale_payments.change_amount IS 'Cambio devuelto al cliente.';

NOTIFY pgrst, 'reload schema';

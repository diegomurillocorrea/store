-- Proveedores: registrar quién creó el contacto (mismo patrón que categorías)

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES organization_members (id) ON DELETE SET NULL;

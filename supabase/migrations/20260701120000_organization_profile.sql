-- Perfil de sucursal: descripción, ubicación, horarios y redes sociales

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organization_settings.description IS 'Descripción pública de la sucursal';
COMMENT ON COLUMN organization_settings.location_address IS 'Dirección legible de la sucursal';
COMMENT ON COLUMN organization_settings.location_lat IS 'Latitud para mapa';
COMMENT ON COLUMN organization_settings.location_lng IS 'Longitud para mapa';
COMMENT ON COLUMN organization_settings.business_hours IS 'Horarios por día: { monday: { closed, open, close }, ... }';
COMMENT ON COLUMN organization_settings.social_links IS 'URLs de redes: { website, instagram, facebook, ... }';

-- Permisos separados para Marca y colores (la vista /configuracion usa configuracion.*)
INSERT INTO permissions (code, description) VALUES
  ('configuracion-marca.view', 'Ver marca y colores'),
  ('configuracion-marca.create', 'Crear en marca y colores'),
  ('configuracion-marca.edit', 'Editar marca y colores'),
  ('configuracion-marca.delete', 'Eliminar en marca y colores')
ON CONFLICT (code) DO NOTHING;

UPDATE permissions SET description = 'Ver configuración de sucursal' WHERE code = 'configuracion.view';
UPDATE permissions SET description = 'Editar configuración de sucursal' WHERE code = 'configuracion.edit';

INSERT INTO role_permissions (role_id, permission_code)
SELECT rp.role_id,
  CASE rp.permission_code
    WHEN 'configuracion.view' THEN 'configuracion-marca.view'
    WHEN 'configuracion.create' THEN 'configuracion-marca.create'
    WHEN 'configuracion.edit' THEN 'configuracion-marca.edit'
    WHEN 'configuracion.delete' THEN 'configuracion-marca.delete'
  END
FROM role_permissions rp
WHERE rp.permission_code IN (
  'configuracion.view',
  'configuracion.create',
  'configuracion.edit',
  'configuracion.delete'
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_organization_slug_available(
  p_slug text,
  p_exclude_org_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM organizations o
    WHERE lower(trim(o.slug)) = lower(trim(p_slug))
      AND (p_exclude_org_id IS NULL OR o.id <> p_exclude_org_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_organization_slug_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_slug_available(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

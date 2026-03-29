-- Marca: colores por modo claro / oscuro + texto secundario (antes zinc-500/400)
ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS primary_color_light TEXT,
  ADD COLUMN IF NOT EXISTS primary_color_dark TEXT,
  ADD COLUMN IF NOT EXISTS accent_color_light TEXT,
  ADD COLUMN IF NOT EXISTS accent_color_dark TEXT,
  ADD COLUMN IF NOT EXISTS muted_color_light TEXT,
  ADD COLUMN IF NOT EXISTS muted_color_dark TEXT;

-- Valores iniciales desde columnas legacy o defaults
UPDATE organization_settings SET
  primary_color_light = COALESCE(primary_color_light, primary_color, '#27272a'),
  primary_color_dark = COALESCE(primary_color_dark, '#e4e4e7'),
  accent_color_light = COALESCE(accent_color_light, accent_color, '#2563eb'),
  accent_color_dark = COALESCE(accent_color_dark, '#60a5fa'),
  muted_color_light = COALESCE(muted_color_light, '#71717a'),
  muted_color_dark = COALESCE(muted_color_dark, '#a3a3a3');

ALTER TABLE organization_settings
  ALTER COLUMN primary_color_light SET DEFAULT '#27272a',
  ALTER COLUMN primary_color_light SET NOT NULL,
  ALTER COLUMN primary_color_dark SET DEFAULT '#e4e4e7',
  ALTER COLUMN primary_color_dark SET NOT NULL,
  ALTER COLUMN accent_color_light SET DEFAULT '#2563eb',
  ALTER COLUMN accent_color_light SET NOT NULL,
  ALTER COLUMN accent_color_dark SET DEFAULT '#60a5fa',
  ALTER COLUMN accent_color_dark SET NOT NULL,
  ALTER COLUMN muted_color_light SET DEFAULT '#71717a',
  ALTER COLUMN muted_color_light SET NOT NULL,
  ALTER COLUMN muted_color_dark SET DEFAULT '#a3a3a3',
  ALTER COLUMN muted_color_dark SET NOT NULL;

-- Mantener legacy en sync con modo claro (por si hay consultas antiguas)
UPDATE organization_settings SET
  primary_color = primary_color_light,
  accent_color = accent_color_light;

COMMENT ON COLUMN organization_settings.muted_color_light IS 'Texto secundario / etiquetas en modo claro (sustituye gris por defecto)';
COMMENT ON COLUMN organization_settings.muted_color_dark IS 'Texto secundario / etiquetas en modo oscuro';

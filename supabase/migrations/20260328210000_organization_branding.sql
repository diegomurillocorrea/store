-- Marca visual por organización (logo + colores)
ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#27272a',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#2563eb';

COMMENT ON COLUMN organization_settings.logo_url IS 'URL pública del logo (https o ruta absoluta)';
COMMENT ON COLUMN organization_settings.primary_color IS 'Color principal en hex (#rgb o #rrggbb)';
COMMENT ON COLUMN organization_settings.accent_color IS 'Color de acento (enlaces, indicador activo) en hex';

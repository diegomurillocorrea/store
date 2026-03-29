-- Lienzo del panel por org: fondo general y panel de contenido (claro / oscuro)
ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS shell_background_light TEXT,
  ADD COLUMN IF NOT EXISTS shell_background_dark TEXT,
  ADD COLUMN IF NOT EXISTS shell_surface_light TEXT,
  ADD COLUMN IF NOT EXISTS shell_surface_dark TEXT;

UPDATE organization_settings SET
  shell_background_light = COALESCE(shell_background_light, '#fffbf4'),
  shell_background_dark = COALESCE(shell_background_dark, '#22180f'),
  shell_surface_light = COALESCE(shell_surface_light, '#fffcf7'),
  shell_surface_dark = COALESCE(shell_surface_dark, '#2e261c');

ALTER TABLE organization_settings
  ALTER COLUMN shell_background_light SET DEFAULT '#fffbf4',
  ALTER COLUMN shell_background_light SET NOT NULL,
  ALTER COLUMN shell_background_dark SET DEFAULT '#22180f',
  ALTER COLUMN shell_background_dark SET NOT NULL,
  ALTER COLUMN shell_surface_light SET DEFAULT '#fffcf7',
  ALTER COLUMN shell_surface_light SET NOT NULL,
  ALTER COLUMN shell_surface_dark SET DEFAULT '#2e261c',
  ALTER COLUMN shell_surface_dark SET NOT NULL;

COMMENT ON COLUMN organization_settings.shell_background_light IS 'Fondo del marco (sidebar + área exterior) en modo claro';
COMMENT ON COLUMN organization_settings.shell_background_dark IS 'Fondo del marco en modo oscuro';
COMMENT ON COLUMN organization_settings.shell_surface_light IS 'Fondo del panel de contenido principal en modo claro';
COMMENT ON COLUMN organization_settings.shell_surface_dark IS 'Fondo del panel de contenido principal en modo oscuro';

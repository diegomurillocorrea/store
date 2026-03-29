-- Imagen de fondo del panel de contenido (estilo WhatsApp / chat)
ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS panel_wallpaper_url TEXT;

COMMENT ON COLUMN organization_settings.panel_wallpaper_url IS 'URL https de imagen de fondo del área de contenido (opcional; usar Storage o CDN público)';

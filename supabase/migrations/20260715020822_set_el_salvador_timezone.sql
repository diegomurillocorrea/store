-- Store business calendar is always El Salvador time.
ALTER TABLE organizations
  ALTER COLUMN timezone SET DEFAULT 'America/El_Salvador';

UPDATE organizations
SET timezone = 'America/El_Salvador'
WHERE timezone IS DISTINCT FROM 'America/El_Salvador';

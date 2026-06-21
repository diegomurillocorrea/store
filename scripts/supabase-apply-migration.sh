#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

usage() {
  echo "Usage:"
  echo "  npm run db:apply -- supabase/migrations/YYYYMMDD_name.sql"
  echo "  npm run db:apply:latest"
  exit 1
}

apply_file() {
  local file="$1"
  echo "Applying migration: $(basename "$file")"
  npx supabase db query --linked -f "$file"
  echo "Reloading PostgREST schema cache…"
  npx supabase db query --linked "NOTIFY pgrst, 'reload schema';"
}

if [ "${1:-}" = "--latest" ]; then
  FILE="$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort | tail -1)"
  if [ -z "$FILE" ]; then
    echo "No migration files found in $MIGRATIONS_DIR"
    exit 1
  fi
  apply_file "$FILE"
  exit 0
fi

if [ $# -lt 1 ]; then
  usage
fi

FILE="$1"
if [[ "$FILE" != /* ]]; then
  FILE="$ROOT_DIR/$FILE"
fi

if [ ! -f "$FILE" ]; then
  echo "Migration file not found: $FILE"
  exit 1
fi

apply_file "$FILE"

#!/usr/bin/env bash
# =============================================================================
# Converge — DB apply (run pending forward-only deltas)
# =============================================================================
# Applies prisma/sql/migrations/*.sql in filename order against DATABASE_URL and
# records each in the schema_migrations table. Idempotent — already-applied files
# are skipped. NON-destructive (no DROP DATABASE). For an empty/fresh DB, load
# the full schema.sql first (npm run db:reset in dev, or apply schema.sql once
# over TLS for the initial prod bootstrap).
#
# Safety: prompts before touching a non-local host (prod). Pass --force for CI.
# For DO Managed MySQL set MYSQL_SSL_CA=/path/to/ca.crt (TLS is auto-required for
# remote hosts).
#
# Usage:
#   ./scripts/db-apply.sh           # interactive
#   ./scripts/db-apply.sh --force   # non-interactive (CI)
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
MIG_DIR="$ROOT_DIR/prisma/sql/migrations"
FORCE=0
[[ "${1:-}" == "--force" || "${1:-}" == "-f" ]] && FORCE=1

if [[ -z "${DATABASE_URL:-}" ]]; then
  [[ -f "$ENV_FILE" ]] || { echo "Error: DATABASE_URL not set and $ENV_FILE missing." >&2; exit 1; }
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi
[[ -n "${DATABASE_URL:-}" ]] || { echo "Error: DATABASE_URL empty." >&2; exit 1; }

urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
DB_USER="$(urldecode "$(echo "$DATABASE_URL" | sed -E 's|^mysql://([^:]+):.*|\1|')")"
DB_PASS="$(urldecode "$(echo "$DATABASE_URL" | sed -E 's|^mysql://[^:]+:([^@]+)@.*|\1|')")"
DB_HOST="$(echo "$DATABASE_URL" | sed -E 's|^mysql://[^:]+:[^@]+@([^:/]+):.*|\1|')"
DB_PORT="$(echo "$DATABASE_URL" | sed -E 's|^mysql://[^:]+:[^@]+@[^:]+:([0-9]+)/.*|\1|')"
DB_NAME="$(echo "$DATABASE_URL" | sed -E 's|^mysql://[^:]+:[^@]+@[^:]+:[0-9]+/([^?]+).*|\1|')"
[[ -n "$DB_NAME" ]] || { echo "Error: could not parse database name." >&2; exit 1; }

CLI_HOST="$DB_HOST"; [[ "$DB_HOST" == "localhost" ]] && CLI_HOST="127.0.0.1"

# TLS + confirmation for non-local (production) targets.
SSL_ARGS=()
case "$DB_HOST" in
  localhost | 127.0.0.1 | db) ;;
  *)
    SSL_ARGS+=(--ssl-mode=REQUIRED)
    [[ -n "${MYSQL_SSL_CA:-}" ]] && SSL_ARGS+=(--ssl-ca="$MYSQL_SSL_CA")
    if [[ $FORCE -ne 1 ]]; then
      echo "Target is a NON-LOCAL host: $DB_USER@$DB_HOST/$DB_NAME"
      read -r -p "Apply pending migrations to this database? [y/N]: " REPLY
      [[ "$REPLY" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
    fi
    ;;
esac

export MYSQL_PWD="$DB_PASS"
MY() { mysql --protocol=TCP -h "$CLI_HOST" -P "$DB_PORT" -u "$DB_USER" ${SSL_ARGS[@]+"${SSL_ARGS[@]}"} "$@"; }

echo "Target: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Ensure the tracking table exists (predates this table on older DBs).
MY "$DB_NAME" -e "CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (version)) ENGINE=InnoDB;"

shopt -s nullglob
applied=0
for f in "$MIG_DIR"/*.sql; do
  v="$(basename "$f")"
  exists="$(MY "$DB_NAME" -N -B -e "SELECT 1 FROM schema_migrations WHERE version='$v' LIMIT 1;")"
  if [[ -n "$exists" ]]; then
    echo "skip   $v"
    continue
  fi
  echo "apply  $v"
  MY "$DB_NAME" < "$f"
  MY "$DB_NAME" -e "INSERT INTO schema_migrations (version) VALUES ('$v');"
  applied=$((applied + 1))
done

echo "Done. Applied $applied new migration(s)."

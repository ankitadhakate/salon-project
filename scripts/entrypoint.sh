#!/bin/sh
# Web process only. Migrations run in scripts/migrate-job.sh so several
# Cloud Run replicas cannot migrate at the same time.
set -eu

if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

exec npx next start -H 0.0.0.0 -p "${PORT:-3847}"

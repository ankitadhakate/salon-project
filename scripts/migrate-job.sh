#!/bin/sh
# Cloud Run Job, or the one-shot command a single-instance host runs before listen.
# Applies migrations and, in production, creates the admin if missing.
# Never loads sample salons. The web process (scripts/entrypoint.sh) does not migrate.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL before running the migrate job." >&2
  exit 1
fi

if [ -z "${DIRECT_URL:-}" ]; then
  export DIRECT_URL="$DATABASE_URL"
  echo "DIRECT_URL was unset. Migrations will use DATABASE_URL."
fi

echo "Applying database migrations"
npx prisma migrate deploy

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "Production migrate job: ensuring the admin exists. Sample salons are not loaded."
  npx tsx prisma/ensure-admin.ts
else
  echo "NODE_ENV is not production. Migrations applied. The seed was not run."
fi

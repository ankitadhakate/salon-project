#!/bin/sh
# Cloud Run Job. The web container does not run this.
# Applies migrations, then seeds. When NODE_ENV=production the seed writes the
# admin, cities, and areas only. It does not load sample salons.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL before running the migrate job." >&2
  exit 1
fi

if [ -z "${DIRECT_URL:-}" ]; then
  case "${DATABASE_URL}" in
    *-pooler*|*\pgbouncer=true*)
      echo "Set DIRECT_URL to the non-pooled Neon connection. Migrations cannot use the pooled DATABASE_URL." >&2
      exit 1
      ;;
  esac
  export DIRECT_URL="$DATABASE_URL"
  echo "DIRECT_URL was unset. Migrations will use DATABASE_URL."
fi

echo "Applying database migrations"
npx prisma migrate deploy

echo "Seeding"
npx tsx prisma/seed.ts

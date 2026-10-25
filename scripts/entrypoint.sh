#!/bin/sh
# Web process only. Migrations and the seed run in npm run migrate:deploy.
set -eu

if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

exec npx next start -H 0.0.0.0 -p "${PORT:-3847}"

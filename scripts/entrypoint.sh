#!/bin/sh
# Boot: migrate, then start. The sample seed never runs when NODE_ENV=production.
set -eu

echo "Applying database migrations"
npx prisma migrate deploy

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "Production boot: skipping the seed. Sample salons are not loaded."
  npx tsx prisma/ensure-admin.ts
else
  echo "Development boot: running the seed"
  npx tsx prisma/seed.ts
fi

exec npx next start -H 0.0.0.0 -p "${PORT:-3847}"

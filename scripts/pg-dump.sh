#!/bin/sh
# Daily logical backup. Writes a custom-format dump under backups/.
# When BACKUP_S3_BUCKET is set, also uploads it (and a weekly copy on Sundays).
# See RESTORE.md. This script does not print the database URL.
set -eu

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is not installed. Install postgresql-client." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL to the Postgres connection string." >&2
  exit 1
fi

mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="backups/saj-${stamp}.dump"
pg_dump --format=custom --no-owner --no-acl --file="$out" "$DATABASE_URL"
echo "Wrote $out"

if [ -z "${BACKUP_S3_BUCKET:-}" ]; then
  exit 0
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "BACKUP_S3_BUCKET is set but the aws CLI is not installed. The local dump was kept." >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-}"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

upload() {
  dest="$1"
  if [ -n "${S3_ENDPOINT:-}" ]; then
    aws s3 cp "$out" "$dest" --endpoint-url "$S3_ENDPOINT"
  else
    aws s3 cp "$out" "$dest"
  fi
}

upload "s3://${BACKUP_S3_BUCKET}/daily/saj-${stamp}.dump"
echo "Uploaded daily dump"

# date -u +%u is 7 on Sunday.
if [ "$(date -u +%u)" = "7" ]; then
  upload "s3://${BACKUP_S3_BUCKET}/weekly/saj-${stamp}.dump"
  echo "Uploaded weekly off-site copy"
fi

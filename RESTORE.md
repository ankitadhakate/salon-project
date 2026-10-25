# Restore a database

Use this when the Postgres data is lost or a bad edit has to be undone. Nothing here creates a host account or deploys the app. Practice it once on a throwaway database before you need it.

Backups come from `scripts/pg-dump.sh`. A dump is a `pg_dump` custom-format file. It does not include photos. On Cloud Run, photos live in Cloud Storage (`GCS_BUCKET`). The s3 driver stores them under `S3_BUCKET` (R2, or an existing S3 API). Restoring the database does not restore a deleted photo object, and restoring a photo bucket does not put the database row back. Keep both.

## What to run, and when

| Job | Command | Where the file goes |
| --- | --- | --- |
| Every day | `DATABASE_URL="…" sh scripts/pg-dump.sh` | `backups/backup-TIMESTAMP.dump` on the machine that ran it |
| Same command, when `BACKUP_S3_BUCKET` is set | uploads with `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. Optional. `IMAGE_DRIVER=gcs` does not supply these keys. | `s3://BACKUP_S3_BUCKET/daily/…` |
| Sundays | the same script also copies that day's dump | `s3://BACKUP_S3_BUCKET/weekly/…` |

Neon keeps point-in-time backups. Prefer a dump you have downloaded when you want a copy that does not live only on Neon. Point-in-time recovery is an alternative to a dump for a recent mistake. Leave `BACKUP_S3_BUCKET` unset on Cloud Run. The org blocks creating a service-account HMAC key, and photo storage does not use those keys.

The web image installs `postgresql-client`, so a one-off shell on the web service can run the script. Prefer a separate scheduled job so a full disk on the web instance is not your only copy. Do not commit files under `backups/`.

## Restore

1. Put the app in a state where nobody is writing. On Cloud Run, stop traffic to `saj-web` or deploy a revision that is not serving writes. A restore while the app is running will be overwritten immediately.
2. Download the dump you trust. For an off-site copy: `aws s3 cp s3://BACKUP_S3_BUCKET/daily/backup-TIMESTAMP.dump ./restore.dump --endpoint-url "$S3_ENDPOINT"`.
3. Restore into the target database. `--clean` drops objects that are in the dump before recreating them. This destroys the current data in that database.

   ```sh
   pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" restore.dump
   ```

   If the database itself is gone, create an empty one on Neon first, then run the same command without `--clean`.
4. Run `npm run migrate:deploy` before the web process listens. On Cloud Run, execute the `saj-migrate` job, then send traffic to `saj-web`. Migrations that are already in the dump are skipped. A migration added after the dump was taken is applied. When `NODE_ENV=production` the seed in that command writes the admin, cities, and areas, and does not load sample salons.
5. Check a row you know. For example, the admin email and one live salon's name and phone. Open that salon's public page and confirm the photos still load from `https://storage.googleapis.com/<GCS_BUCKET>/`. If a photo 404s, the database row points at an object that is not in the bucket. That is not fixed by restoring Postgres again.
6. Resume the web service. Sign in as the admin from `ADMIN_EMAIL`. The dump's password hash is the one that was current when you dumped, which may not match today's `ADMIN_PASSWORD`.

## If the dump is older than a contact-number change

The listing audit on the admin review desk shows the old and new phone and WhatsApp values for edits made after this release. Use it to see what a restore would roll back. Tell the owner before you put an older number back on a live page.

## Test that a restore works

Do this against a second database, never against the live one.

```sh
DATABASE_URL="$LIVE_URL" sh scripts/pg-dump.sh
createdb salon_restore_test
pg_restore --no-owner --no-acl --dbname "$RESTORE_URL" backups/backup-TIMESTAMP.dump
psql "$RESTORE_URL" -c 'SELECT COUNT(*) FROM "Salon";'
dropdb salon_restore_test
```

`SELECT COUNT(*)` should match the live database at the time of the dump. Then drop the test database.

# Restore a database

Use this when the Postgres data is lost or a bad edit has to be undone. Nothing here creates a host account or deploys the app. Practice it once on a throwaway database before you need it.

Backups come from `scripts/pg-dump.sh`. A dump is a `pg_dump` custom-format file. It does not include photos. Photos live in R2 (`S3_BUCKET`). Restoring the database does not restore a deleted photo object, and restoring a photo bucket does not put the database row back. Keep both.

## What to run, and when

| Job | Command | Where the file goes |
| --- | --- | --- |
| Every day | `DATABASE_URL="…" sh scripts/pg-dump.sh` | `backups/backup-TIMESTAMP.dump` on the machine that ran it |
| Same command, when `BACKUP_S3_BUCKET` is set | uploads with the existing `S3_*` credentials | `s3://BACKUP_S3_BUCKET/daily/…` |
| Sundays | the same script also copies that day's dump | `s3://BACKUP_S3_BUCKET/weekly/…` |

Render's paid Postgres plan also has its own backups. Prefer a dump you have downloaded when you want a copy that does not live only on Render. Point-in-time recovery, if the plan includes it, is an alternative to a dump for a recent mistake. A weekly object in R2 is the off-site copy.

The web image installs `postgresql-client`, so a one-off shell on the web service can run the script. Prefer a separate scheduled job so a full disk on the web instance is not your only copy. Do not commit files under `backups/`.

## Restore

1. Put the app in a state where nobody is writing. On Render, suspend the web service or scale it to zero. A restore while the app is running will be overwritten immediately.
2. Download the dump you trust. For an off-site copy: `aws s3 cp s3://BACKUP_S3_BUCKET/daily/backup-TIMESTAMP.dump ./restore.dump --endpoint-url "$S3_ENDPOINT"`.
3. Restore into the target database. `--clean` drops objects that are in the dump before recreating them. This destroys the current data in that database.

   ```sh
   pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" restore.dump
   ```

   If the database itself is gone, create an empty one first (`createdb` or the Render dashboard), then run the same command without `--clean`.
4. Run `sh scripts/migrate-job.sh` before the web process listens. On Render, starting the service with the Docker command in DEPLOY.md does this. On Cloud Run, execute the migrate job, then start the service. Migrations that are already in the dump are skipped. A migration added after the dump was taken is applied.
5. Check a row you know. For example, the admin email and one live salon's name and phone. Open that salon's public page and confirm the photos still load from R2. If a photo 404s, the database row points at an object that is not in the bucket. That is not fixed by restoring Postgres again.
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

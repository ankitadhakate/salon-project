# Deploy

This is the launch setup for [notsooboring.com](https://notsooboring.com). Nothing in this file creates an account or deploys the app. You run the steps.

The app listens on `PORT`. Cloud Run sets `PORT`, and `npm start` reads it (`next start -p ${PORT:-3847}`). `NEXT_PUBLIC_APP_URL` is the canonical origin. Change that one variable when a brand domain replaces notsooboring.com. Keep `ALLOW_INDEXING` false until the pages you want in search have real listings and written intros.

The image command is `npm start`. It does not migrate and it does not seed. Run `npm run migrate:deploy` as a separate Cloud Run Job before sending traffic to a new revision. With `NODE_ENV=production` that job applies migrations and seeds the admin, cities, and areas. It does not load sample salons.

## Host

The launch host is **Cloud Run**, **Cloud SQL**, and **Cloud Storage**, in `asia-south1`. Follow [Google Cloud](#google-cloud-cloud-run-cloud-sql-cloud-storage). The image is one stage. It is not a Next.js standalone build: the web service and the Cloud Run Job share it, and the job needs the Prisma CLI, `tsx`, and the seed.

Render, below, is the single-container alternative. One instance runs the migrate script and then the app.

### Render (single-container alternative)

Use **Render**, in the **Singapore** region (closest Render region to India). Put the web service and Postgres in the same region and connect them with the internal database URL.

| Piece | Plan | Monthly |
| --- | --- | --- |
| Web service, instance `0.5c-512mb` (0.5 CPU, 512 MB) | Always on | $7 |
| Postgres, instance `0.1c-256mb` (0.1 CPU, 256 MB) | Paid, with backups. 1 GB storage included; extra storage is $0.30/GB | $6 |
| Hobby workspace | No workspace fee. 5 GB outbound bandwidth, then $0.15/GB. Two custom domains included | $0 |
| Cloudflare R2 for photos | 10 GB storage and a free operation allowance. R2 does not charge egress. Beyond the free storage, about $0.015/GB | about $0 at launch |

**About $13 per month** before tax, roughly **₹1,100** at ₹85 per US dollar. The exchange rate moves. A quiet launch that stays inside 1 GB of database storage and 5 GB of Render bandwidth stays on that figure. Photos are loaded from R2, so they do not count toward Render bandwidth.

Do not use the free web instance. It sleeps after a period with no traffic. Do not use the free Postgres instance. It expires about 30 days after creation. If the $7 instance restarts because it runs out of memory, move the web service to `1c-2g` ($25/month, 1 CPU, 2 GB).

Railway Hobby is $5 of included usage, and an always-on Next.js app plus Postgres usually exceeds that. Fly.io can be cheaper and takes more wiring. Render is the simpler fixed bill, and it has a documented apex address.

## 1. Photos (Cloudflare R2)

1. Create an R2 bucket, for example `salon-photos`.
2. Create an API token that can read and write that bucket.
3. Turn on public access for the bucket, or attach a custom domain such as `images.notsooboring.com`.
4. Note the S3 endpoint (`https://<accountid>.r2.cloudflarestorage.com`), the bucket name, the access key, the secret, and the public base URL. No trailing slash on the public URL. The environment table below is the Cloud Storage launch setup. For this Render path, set `S3_ENDPOINT` to the R2 endpoint, `S3_FORCE_PATH_STYLE=false`, and `S3_PUBLIC_URL` to the R2 public origin.

## 2. Render Postgres

1. New Postgres, region Singapore, instance `0.1c-256mb`.
2. Copy the **internal** connection string. It looks like `postgresql://USER:PASSWORD@dpg-xxx-a/salon`. The web service uses this, not the external URL.

## 3. Render web service

1. New Web Service from this Git repository. Environment: Docker. Region: Singapore. Instance: `0.5c-512mb`.
2. Set the Docker command to `sh -c "npm run migrate:deploy && exec npm start"`. Render runs one instance, so that command migrates, seeds, then starts Next.js on `$PORT`. The image command alone is `npm start` and does not migrate.
3. Add the environment variables below, then deploy.

`npm run migrate:deploy` applies `prisma/migrations` and runs the seed. When `NODE_ENV=production` the seed creates the admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if that user does not exist yet, and upserts the launch city and its areas. It does not load sample salons or sample owners. Service pages are still added in the admin screen. If a database was seeded outside production and still has sample rows, run `npm run db:clear-demo` before launch. Sample salons stay labelled Sample either way, and they stay hidden on the public site unless `SHOW_DEMO_LISTINGS=true`.

## Environment variables

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Production refuses secrets and passwords that ship in `.env.example`.

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Internal Postgres URL from step 2. The app uses this at runtime. |
| `DIRECT_URL` | Same value as `DATABASE_URL` on Render (no pooler). Prisma Migrate uses this. If you add a pooler later, keep this as the direct URL. |
| `AUTH_SECRET` | Unique random string, at least 32 characters |
| `NEXT_PUBLIC_APP_URL` | `https://notsooboring.com` |
| `SITE_NAME` | Leave unset to use the built-in name, or set the public brand |
| `ALLOW_INDEXING` | `false` |
| `INDEX_MIN_SALONS` | `8` |
| `ADMIN_EMAIL` | Your admin address |
| `ADMIN_PASSWORD` | Unique password, at least 12 characters |
| `ADMIN_NAME` | Display name for the admin |
| `SHOW_DEMO_LISTINGS` | Leave unset, or `false` |
| `IMAGE_DRIVER` | `s3` |
| `S3_BUCKET` | Cloud Storage bucket name |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://storage.googleapis.com` |
| `S3_ACCESS_KEY_ID` | HMAC access key |
| `S3_SECRET_ACCESS_KEY` | HMAC secret |
| `S3_PUBLIC_URL` | `https://storage.googleapis.com/<bucket>`, no trailing slash |
| `S3_FORCE_PATH_STYLE` | `true` |
| `BACKUP_S3_BUCKET` | Optional. Off-site dump bucket for `scripts/pg-dump.sh`. Leave unset to keep dumps local only |

Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for magic-link email, claim confirmation codes, and the note sent when an owner changes a contact number. Without SMTP, owners use their password, and a claim link cannot be finished in production because the confirmation email cannot be sent. Optional: `AUTO_APPROVE_LISTINGS=true` only if you want the first submissions to skip review. The admin screen overrides that after the setting row exists. Optional: `BACKUP_S3_BUCKET` for `scripts/pg-dump.sh`. It reuses the `S3_*` credentials. See [RESTORE.md](RESTORE.md).

`NODE_ENV=production` is set by Cloud Run and by Render. You do not need to add it. The migrate job sees that value and seeds the admin, cities, and areas without sample salons.

Photo uploads send S3 checksums only when the operation requires them (`WHEN_REQUIRED`). The Cloud Storage XML API and Cloudflare R2 both reject the AWS SDK default. `scripts/pg-dump.sh` sets the same checksum mode for `aws s3 cp`.

## Google Cloud (Cloud Run, Cloud SQL, Cloud Storage)

This is the launch host. Nothing here creates a project or deploys the app. Region `asia-south1`. Cloud Run service id `web`. Keep `ALLOW_INDEXING` false.

### Photos (Cloud Storage XML API)

1. Create a bucket, for example `salon-photos`, in the same region.
2. Create an HMAC key for a service account that can write objects in that bucket.
3. Make objects readable at `https://storage.googleapis.com/<bucket>/<object>`, or put a public base URL of your own in `S3_PUBLIC_URL`. No trailing slash.
4. Set `S3_ENDPOINT=https://storage.googleapis.com`, `S3_FORCE_PATH_STYLE=true`, and `S3_PUBLIC_URL=https://storage.googleapis.com/<bucket>`. The app stores each photo at `S3_PUBLIC_URL` plus the object key.

The same variables work for Cloudflare R2. Use the R2 S3 endpoint, `S3_FORCE_PATH_STYLE=false`, and the R2 public URL.

### Image

Build this Dockerfile and push it to Artifact Registry. The build passes placeholder `DATABASE_URL` and `DIRECT_URL` into `prisma generate` only. Those values are not stored in the image. Set the real URLs on the Cloud Run service and on the job.

Leave the container command empty so the image command runs: `npm start`. That listens on `PORT`, which Cloud Run sets. Do not point the web service at `npm run migrate:deploy`. Several replicas would migrate at once.

The Dockerfile stays one stage on purpose. A standalone runner would drop the Prisma CLI and the seed, and this job runs both from the same image.

### Migrate job

Create a Cloud Run Job from the same image. Container command:

```sh
npm run migrate:deploy
```

Run the job after each deploy that includes a new file under `prisma/migrations`, and wait until it succeeds before sending traffic to that revision. The job needs `NODE_ENV=production` and the same `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `IMAGE_DRIVER=s3`, and `ADMIN_EMAIL` / `ADMIN_PASSWORD` as the web service. It applies migrations, then seeds the admin, the launch city, and its areas. It does not load sample salons. If `DIRECT_URL` is missing, the job copies `DATABASE_URL`.

Attach the Cloud SQL instance to both the service and the job.

### Cloud SQL connection strings

Postgres 16, same region as Cloud Run. When there is no pooler, set `DATABASE_URL` and `DIRECT_URL` to the same socket URL. Encode the password.

```
postgresql://USER:PASSWORD@localhost/DBNAME?host=/cloudsql/PROJECT:REGION:INSTANCE
```

`REGION` is `asia-south1` for this setup. The app URL can add a pool limit so one instance does not open too many connections:

```
postgresql://USER:PASSWORD@localhost/DBNAME?host=/cloudsql/PROJECT:REGION:INSTANCE&connection_limit=5
```

If `DATABASE_URL` goes through a pooler, `DIRECT_URL` stays the direct socket URL above. Prisma Migrate uses `DIRECT_URL`. The running app uses `DATABASE_URL`.

### Firebase Hosting

`firebase.json` rewrites every path to Cloud Run service `web` in `asia-south1`. The Cloud Run service allows unauthenticated invocations so Hosting can reach it. Point notsooboring.com at Firebase Hosting after the service is up.

`/_next/static` is cached for one year and marked immutable by the app (`next.config.ts`) and by the matching header in `firebase.json`. HTML stays dynamic. Do not add a Hosting cache rule for `**`.

### Checksums

`lib/storage.ts` sets `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED` on the S3 client used for uploads and deletes. That is what the Cloud Storage XML API accepts.

## 4. DNS for notsooboring.com

Add the domain on the Render service first (Settings → Custom Domains). Add the apex `notsooboring.com`. Render also adds `www.notsooboring.com` and redirects `www` to the apex, which matches `NEXT_PUBLIC_APP_URL`. Hobby includes those two domains.

Remove every `AAAA` record. Render is IPv4, and an `AAAA` record sends some visitors the wrong way.

### Registrar DNS (Namecheap and most others)

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `216.24.57.1` |
| CNAME | `www` | `<your-service>.onrender.com` |

`<your-service>.onrender.com` is the hostname Render shows on the service page. Delete any other A or CNAME on `@` or `www`, including the registrar's parking or URL-forward records.

If the DNS host supports ALIAS, ANAME, or CNAME flattening (DNSimple, Namecheap Advanced DNS in some setups), you can point `@` at `<your-service>.onrender.com` that way instead of the A record. Prefer that when it is available, because it follows Render if the load-balancer address changes. The A record above is the one Render publishes for hosts that cannot flatten a CNAME at the apex.

### Cloudflare DNS

Do not use the A record on Cloudflare. Add two CNAME records, both DNS-only (grey cloud) until Render says the certificate is issued:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `@` | `<your-service>.onrender.com` | DNS only |
| CNAME | `www` | `<your-service>.onrender.com` | DNS only |

SSL/TLS mode: **Full**. After the certificate shows as issued, you can turn the proxy on.

### Check

In the Render custom-domain panel, click Verify. Then open `https://notsooboring.com` and `https://www.notsooboring.com`. The www host should land on the apex. Log in as the admin you set in the environment and confirm the review desk loads.

## Indexing stays off

Leave `ALLOW_INDEXING=false` for the launch. The site then sends `noindex` on every response, `/robots.txt` disallows `/`, and `/sitemap.xml` is a 404.

Turn it on later by setting `ALLOW_INDEXING=true` and redeploying. Even then:

- Sample salons stay `noindex` and out of the sitemap.
- A city, locality, or service page is included only when its intro in the admin is non-empty and it has at least `INDEX_MIN_SALONS` live listings that are not samples.

## Later domain

When the brand domain is ready, add it the same way, set `NEXT_PUBLIC_APP_URL` to `https://` plus that apex, redeploy, and point DNS. Session cookies and canonical URLs follow that variable.

## Backups

Cloud SQL keeps its own backups. On the Render alternative, use the paid Postgres plan so that host keeps its own backups too. Also take a logical dump you control:

```sh
DATABASE_URL="postgresql://…" sh scripts/pg-dump.sh
```

Run that daily. Set `BACKUP_S3_BUCKET` (and the existing `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) so the script uploads the dump. On Sundays it also writes a weekly object under `weekly/` in that bucket. The runbook for putting a dump back, and for testing that once against a throwaway database, is [RESTORE.md](RESTORE.md).

Before the first public launch, run `npm run db:clear-demo` if this database ever had sample salons loaded. Production boot will not do that for you, and it will not re-seed them.

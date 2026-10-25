# Deploy

This is the launch setup for [letstrim.com](https://letstrim.com). Nothing in this file creates an account or deploys the app. You run the steps.

The app listens on `PORT`. Cloud Run sets `PORT`, and `npm start` reads it (`next start -p ${PORT:-3847}`). Set `NEXT_PUBLIC_APP_URL` to `https://letstrim.com` for production. The app reads the origin from that variable and does not hard-code the host. Keep `ALLOW_INDEXING` false until the pages you want in search have real listings and written intros.

The image command is `npm start`. It does not migrate and it does not seed. Run `npm run migrate:deploy` as a separate Cloud Run Job before sending traffic to a new revision. With `NODE_ENV=production` that job applies migrations and seeds the admin, cities, and areas. It does not load sample salons.

## Host

The launch host is **Cloud Run** in `asia-south1`, behind **Firebase Hosting** rewrites, with **Neon** Postgres and **Cloud Storage** for photos. Follow [Google Cloud](#google-cloud-cloud-run-neon-cloud-storage). The image is one stage. It is not a Next.js standalone build: the web service and the Cloud Run Job share it, and the job needs the Prisma CLI, `tsx`, and the seed.

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
3. Turn on public access for the bucket, or attach a custom domain such as `images.letstrim.com`.
4. Note the S3 endpoint (`https://<accountid>.r2.cloudflarestorage.com`), the bucket name, the access key, the secret, and the public base URL. No trailing slash on the public URL. For this Render path, set `IMAGE_DRIVER=s3`, `S3_ENDPOINT` to the R2 endpoint, `S3_FORCE_PATH_STYLE=false`, and `S3_PUBLIC_URL` to the R2 public origin. Cloud Run uses `IMAGE_DRIVER=gcs` instead. See [Google Cloud](#google-cloud-cloud-run-neon-cloud-storage).

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
| `DATABASE_URL` | Pooled Neon URL with `sslmode=require`. The app uses this at runtime. On Render, the internal Postgres URL (no pooler). |
| `DIRECT_URL` | Neon direct URL with `sslmode=require`, no `-pooler` host. Prisma Migrate uses this (`directUrl` in the schema). On Render, the same value as `DATABASE_URL`. |
| `TRUST_PROXY_HOPS` | Optional. Trusted proxies on the right of `X-Forwarded-For`. Default `2` (Firebase Hosting and the Google Front End). The client IP is the address just to their left. A shorter list uses the leftmost trusted hop, or `X-Real-Ip` when there are fewer entries than the trusted hops. |
| `AUTH_SECRET` | Unique random string, at least 32 characters |
| `NEXT_PUBLIC_APP_URL` | `https://letstrim.com` |
| `SITE_NAME` | Leave unset for LetsTrim, or set another public brand |
| `ALLOW_INDEXING` | `false` |
| `INDEX_MIN_SALONS` | `8` |
| `ADMIN_EMAIL` | Your admin address |
| `ADMIN_PASSWORD` | Unique password, at least 12 characters |
| `ADMIN_NAME` | Display name for the admin |
| `SHOW_DEMO_LISTINGS` | Leave unset, or `false` |
| `IMAGE_DRIVER` | `gcs` on Cloud Run. `s3` on Render or Cloudflare R2. Production rejects `local`. |
| `GCS_BUCKET` | Cloud Storage bucket. Required when `IMAGE_DRIVER=gcs`. |
| `GCS_PUBLIC_URL` | Optional. Defaults to `https://storage.googleapis.com/<GCS_BUCKET>`. No trailing slash. |
| `S3_BUCKET` | R2 or S3 bucket. Required when `IMAGE_DRIVER=s3`. |
| `S3_REGION` | `auto` for R2 |
| `S3_ENDPOINT` | R2 S3 endpoint. Not used by `IMAGE_DRIVER=gcs`. |
| `S3_ACCESS_KEY_ID` | R2 or HMAC access key. Not used by `IMAGE_DRIVER=gcs`. |
| `S3_SECRET_ACCESS_KEY` | R2 or HMAC secret. Not used by `IMAGE_DRIVER=gcs`. |
| `S3_PUBLIC_URL` | Public photo origin for the s3 driver. No trailing slash. |
| `S3_FORCE_PATH_STYLE` | `false` for R2. `true` only if an existing HMAC key still talks to the XML API. |
| `BACKUP_S3_BUCKET` | Optional. `scripts/pg-dump.sh` still uploads with the S3 keys above. Leave unset on Cloud Run unless those keys already exist. Photo storage does not use them. |

Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for magic-link email, claim confirmation codes, and the note sent when an owner changes a contact number. Without SMTP, owners use their password, and a claim link cannot be finished in production because the confirmation email cannot be sent. Optional: `AUTO_APPROVE_LISTINGS=true` only if you want the first submissions to skip review. The admin screen overrides that after the setting row exists. Optional: `BACKUP_S3_BUCKET` for `scripts/pg-dump.sh`. It reuses the `S3_*` credentials, including when photos use `IMAGE_DRIVER=gcs`. That dump upload is optional. See [RESTORE.md](RESTORE.md).

`NODE_ENV=production` is set by Cloud Run and by Render. You do not need to add it. The migrate job sees that value and seeds the admin, cities, and areas without sample salons.

The s3 driver sends checksums only when the operation requires them (`WHEN_REQUIRED`). Cloudflare R2 rejects the AWS SDK default. `scripts/pg-dump.sh` sets the same checksum mode for `aws s3 cp`. `IMAGE_DRIVER=gcs` does not use that client.

## Google Cloud (Cloud Run, Neon, Cloud Storage)

This is the launch host. Nothing here creates a project or deploys the app. Cloud Run region `asia-south1`. Service id `saj-web`. Firebase Hosting rewrites every path to that service. Keep `ALLOW_INDEXING` false.

### Photos (Cloud Storage, keyless)

The org enforces `constraints/iam.disableServiceAccountKeyCreation`. That constraint also blocks service-account HMAC keys, so Cloud Run does not use the S3 XML API. Photos use `IMAGE_DRIVER=gcs` and `@google-cloud/storage`. The client uses Application Default Credentials from the runtime service account. There is no key file and no HMAC key.

1. Create a bucket, for example `salon-photos`, in `asia-south1`, with uniform bucket-level access.
2. Grant `allUsers` the role `roles/storage.objectViewer` on the bucket so photo URLs are world-readable. Do not grant object ACLs. Uniform bucket-level access would reject them, and the app does not set `public: true` or a predefined ACL.
3. Grant the Cloud Run runtime service account access to objects in that bucket:

```sh
gcloud storage buckets add-iam-policy-binding gs://salon-photos \
  --member="serviceAccount:saj-run@saj-prod-512711.iam.gserviceaccount.com" \
  --role="roles/storage.objectUser"
```

4. Attach `saj-run@saj-prod-512711.iam.gserviceaccount.com` to the Cloud Run service `saj-web`. The metadata server then supplies Application Default Credentials. Do not set `GOOGLE_APPLICATION_CREDENTIALS`.
5. Set `IMAGE_DRIVER=gcs` and `GCS_BUCKET` to the bucket name. `GCS_PUBLIC_URL` is optional. When it is unset, each photo URL is `https://storage.googleapis.com/<bucket>/<object>`. No trailing slash if you set it.

Uploads set `Content-Type: image/webp` and `Cache-Control: public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable`.

`IMAGE_DRIVER=s3` remains for Cloudflare R2 and for any S3 API that already has keys. Do not create an HMAC key for this project.

`scripts/pg-dump.sh` still uploads a dump with `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` when `BACKUP_S3_BUCKET` is set. That path is optional and is not the photo driver. The same org constraint blocks creating a service-account HMAC key for it. Leave `BACKUP_S3_BUCKET` unset unless those keys already exist.

### Image

Build this Dockerfile and push it to Artifact Registry. The build passes placeholder `DATABASE_URL` and `DIRECT_URL` into `prisma generate` only. Those values are not stored in the image. Set the real URLs on the Cloud Run service and on the job.

Leave the container command empty so the image command runs: `npm start`. That listens on `PORT`, which Cloud Run sets. Do not point the web service at `npm run migrate:deploy`. Several replicas would migrate at once.

The Dockerfile stays one stage on purpose. A standalone runner would drop the Prisma CLI and the seed, and this job runs both from the same image.

### Migrate job

Create a Cloud Run Job from the same image. Container command:

```sh
npm run migrate:deploy
```

Run the job after each deploy that includes a new file under `prisma/migrations`, and wait until it succeeds before sending traffic to that revision. The job needs `NODE_ENV=production` and the same `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `IMAGE_DRIVER=gcs`, `GCS_BUCKET`, and `ADMIN_EMAIL` / `ADMIN_PASSWORD` as the web service. The seed runs the production check, which requires `GCS_BUCKET` when the driver is `gcs`, even though this job does not upload photos. The job applies migrations, then seeds the admin, the launch city, and its areas. It does not load sample salons. Set `DIRECT_URL` on the job. If `DATABASE_URL` is the Neon pooler, the script refuses to copy it. When there is no pooler and `DIRECT_URL` is missing, the job copies `DATABASE_URL`.

### Neon connection strings

Create a Neon Postgres database. Prisma reads `url` (`DATABASE_URL`) for the app and `directUrl` (`DIRECT_URL`) for migrations. Encode the password. Both URLs need `sslmode=require`.

Pooled, used by Cloud Run at runtime:

```
postgresql://USER:PASSWORD@ep-example-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

Direct, used by the migrate job:

```
postgresql://USER:PASSWORD@ep-example.REGION.aws.neon.tech/neondb?sslmode=require
```

The pooled host contains `-pooler`. The direct host does not. Do not point `DIRECT_URL` at the pooler. Neon keeps its own point-in-time backups. Also take a logical dump. See [Backups](#backups).

### Firebase Hosting

`firebase.json` rewrites `**` to Cloud Run service `saj-web` in `asia-south1`. `.firebaserc` selects project `saj-prod-512711`. The Firebase CLI requires a public directory, so `public` is `firebase-public` (a placeholder `404.html`). Hosting still sends app paths to Cloud Run. The Cloud Run service allows unauthenticated invocations so Hosting can reach it. Point letstrim.com at Firebase Hosting after the service is up.

Hosting forwards only the `__session` cookie to Cloud Run. The login session is stored in `__session` (HttpOnly, Secure when the public origin is https, SameSite=Lax). Listing stats do not set a cookie. A repeat view is deduped with a salted hash of the client IP, the user agent, and the salon-local day. `TRUST_PROXY_HOPS` defaults to 2 so that hash uses the address just left of Firebase Hosting and the Google Front End. If `X-Forwarded-For` is shorter than that chain, the hash uses the leftmost trusted hop, or `X-Real-Ip` / unknown when the trusted hops themselves are missing. It does not use a lone client-supplied address.

Add letstrim.com in Firebase Hosting and use the DNS records Hosting shows. The DNS steps further down are only for the Render alternative.

### Cache

Public directory and salon pages send `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` and `Vary: Cookie` when the request has no `__session` cookie and is not `?preview=1`. The vary header keeps Firebase Hosting from serving that logged-out copy to a signed-in browser. `/admin`, `/dashboard`, `/partner` (including claim), `/login`, `/signup`, `/auth`, and `/api` send `private, no-store`, as does any request that carries `__session` or is not a GET. Those are the routes that set the session cookie, so a `Set-Cookie` response is not cached.

`/_next/static`, `/uploads`, and `/demo` send a one-year immutable cache, with `s-maxage` and `stale-while-revalidate`, from `next.config.ts` and from `firebase.json`. Photos uploaded to Cloud Storage are stored with the same `Cache-Control`. Do not add a Hosting cache rule for `**`. That would override these headers for HTML.

### Checksums

`IMAGE_DRIVER=s3` sets `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED` on the S3 client. Cloudflare R2 accepts that. Cloud Run photo uploads use the Cloud Storage JSON client and do not send AWS checksum headers.

## 4. DNS for the Render alternative

Add the domain on the Render service first (Settings → Custom Domains). Add the apex `letstrim.com`. Render also adds `www.letstrim.com` and redirects `www` to the apex, which matches `NEXT_PUBLIC_APP_URL`. Hobby includes those two domains.

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

In the Render custom-domain panel, click Verify. Then open `https://letstrim.com` and `https://www.letstrim.com`. The www host should land on the apex. Log in as the admin you set in the environment and confirm the review desk loads.

## Indexing stays off

Leave `ALLOW_INDEXING=false` for the launch. The site then sends `noindex` on every response, `/robots.txt` disallows `/`, and `/sitemap.xml` is a 404.

Turn it on later by setting `ALLOW_INDEXING=true` and redeploying. Even then:

- Sample salons stay `noindex` and out of the sitemap.
- A city, locality, or service page is included only when its intro in the admin is non-empty and it has at least `INDEX_MIN_SALONS` live listings that are not samples.

## Domain

Production is `https://letstrim.com`. Set `NEXT_PUBLIC_APP_URL` to that origin, add the apex in Firebase Hosting, and point DNS at the records Hosting shows. Session cookies, canonical URLs, and links in email follow `NEXT_PUBLIC_APP_URL`. The hostname is not hard-coded in the app.

## Backups

Neon keeps point-in-time backups. On the Render alternative, use the paid Postgres plan so that host keeps its own backups too. Also take a logical dump you control:

```sh
DATABASE_URL="postgresql://…" sh scripts/pg-dump.sh
```

Run that daily. Set `BACKUP_S3_BUCKET` (and `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) so the script uploads the dump. On Sundays it also writes a weekly object under `weekly/` in that bucket. Those are S3 HMAC keys. `IMAGE_DRIVER=gcs` does not provide them, and this org blocks creating a service-account HMAC key, so leave `BACKUP_S3_BUCKET` unset on Cloud Run unless the keys already exist. The runbook for putting a dump back, and for testing that once against a throwaway database, is [RESTORE.md](RESTORE.md).

Before the first public launch, run `npm run db:clear-demo` if this database ever had sample salons loaded. Production boot will not do that for you, and it will not re-seed them.

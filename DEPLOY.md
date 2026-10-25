# Deploy

This is the launch setup for [letstrim.com](https://letstrim.com). Pushes to `main` deploy production from GitHub Actions. This file does not create accounts or apply changes by itself.

Production is Google Cloud and Firebase only:

- Cloud Run service `saj-web` in `asia-south1`, minimum instances `0`, behind Firebase Hosting rewrites.
- Neon Postgres: pooled `DATABASE_URL` for the app, and `DIRECT_URL` for migrations.
- Photos in Cloud Storage with `IMAGE_DRIVER=gcs` and `GCS_BUCKET`. No HMAC keys.
- Migrations in the Cloud Run job `saj-migrate`.
- Secrets in Secret Manager.
- Domain `https://letstrim.com`. DNS records in GoDaddy come from the Firebase custom-domain wizard.

The app listens on `PORT`. Cloud Run sets `PORT`, and `npm start` reads it (`next start -p ${PORT:-3847}`). Set `NEXT_PUBLIC_APP_URL` to `https://letstrim.com`. The app reads the origin from that variable and does not hard-code the host. Keep `ALLOW_INDEXING` false until the pages you want in search have real listings and written intros.

The image command is `npm start`. It does not migrate and it does not seed. The image is one stage. It is not a Next.js standalone build: `saj-web` and `saj-migrate` share it, and the job needs the Prisma CLI, `tsx`, and the seed.

## Production pipeline

`.github/workflows/deploy.yml` deploys production. It runs on a push to `main`, and from Actions → Deploy → Run workflow when the selected ref is `main`. A manual run from any other ref fails. Pull requests do not deploy.

The workflow waits on concurrency group `production-deploy` and does not cancel a deploy that is already running. Its token can read the repo and request an OIDC token (`contents: read`, `id-token: write`). Nothing in the workflow is a service-account key.

The deploy job uses the GitHub environment `production`. Typecheck, lint, and tests run before that job is queued, so a required reviewer is asked only after those checks pass.

Order of work:

1. The CI workflow (`.github/workflows/ci.yml`) runs via `workflow_call`: `npm ci`, `prisma generate`, `tsc --noEmit`, `npm run lint`, and `npm test`. The service deploy does not start unless that job succeeds.
2. Authenticate with `google-github-actions/auth` (Workload Identity Federation, `create_credentials_file: true`) as `saj-deployer@saj-prod-512711.iam.gserviceaccount.com` and install the Cloud SDK. The credentials file is Application Default Credentials for `firebase-tools`. It is gitignored and listed in `.dockerignore` so `COPY . .` cannot bake it into the image.
3. Build the repo Dockerfile with Docker Buildx on the runner and push `asia-south1-docker.pkg.dev/saj-prod-512711/saj/web:<7-character sha>`. The build passes `NEXT_PUBLIC_APP_URL=https://letstrim.com` and does not pass `ALLOW_INDEXING` or any secret. Layer cache is the registry image `asia-south1-docker.pkg.dev/saj-prod-512711/saj/web-cache:latest` (the first deploy has nothing to restore). The workflow does not use `gcloud builds submit`.
4. Point Cloud Run job `saj-migrate` at that image and execute it with `--wait`. The job's existing command stays `sh scripts/migrate-job.sh` (migrations, then the production seed). The workflow does not change the job's env vars or secrets. If the execution fails, the workflow stops here.
5. Deploy Cloud Run service `saj-web` with only the new image: `gcloud run deploy saj-web --image <image> --region asia-south1`. Env vars, Secret Manager secrets, and the runtime service account `saj-run@saj-prod-512711.iam.gserviceaccount.com` stay as they are on the service. The workflow never sets `ALLOW_INDEXING`.
6. Deploy Firebase Hosting for site `saj-prod-512711`: `npx firebase-tools@15.34.1 deploy --only hosting --project saj-prod-512711 --non-interactive`.
7. Smoke test `https://letstrim.com/` and `https://saj-web-osvfthn27a-el.a.run.app/`. Each must return HTTP 200 and an `x-robots-tag` header containing `noindex`. Anything else fails the job.

The job summary lists the commit, image tag, revision, the revision that was serving before this run, and the smoke test result.

Cloud Run keeps traffic on the previous revision when `gcloud run deploy` fails (the new revision never becomes ready). A failed migration never reaches that deploy. A smoke test runs only after the service deploy has succeeded, so a red smoke test means the new revision is already serving. Put traffic back with the rollback command below.

### One-time setup

Keyless auth is already in place. Ops ran the Workload Identity Federation script separately. This repo does not create the pool, the provider, or a key. The org blocks service-account key creation (`constraints/iam.disableServiceAccountKeyCreation`).

| | |
| --- | --- |
| GCP project | `saj-prod-512711` (number `65255661358`), region `asia-south1` |
| `WIF_PROVIDER` | `projects/65255661358/locations/global/workloadIdentityPools/github/providers/salon-project` |
| `DEPLOY_SA` | `saj-deployer@saj-prod-512711.iam.gserviceaccount.com` |
| Runtime service account | `saj-run@saj-prod-512711.iam.gserviceaccount.com` |
| Image | `asia-south1-docker.pkg.dev/saj-prod-512711/saj/web:<7-character sha>` |

The provider's attribute condition accepts tokens only from `ankitadhakate/salon-project` on `refs/heads/main`. The deploy job runs on a push to `main`, or on `workflow_dispatch` from `main`. Any other ref fails before it requests a token.

`saj-deployer` has:

- `roles/run.admin` on the project
- `roles/artifactregistry.writer` on Artifact Registry repository `saj` in `asia-south1`
- `roles/firebasehosting.admin`
- `roles/serviceusage.serviceUsageConsumer`
- `roles/iam.serviceAccountUser` (`actAs`) on `saj-run`

It does not have Cloud Build or Secret Manager admin. The workflow builds and pushes with Docker on the runner. It never calls `gcloud builds submit`, and it never reads or changes env vars or secrets on `saj-migrate` or `saj-web`.

`WIF_PROVIDER` and `DEPLOY_SA` are not secrets. They are hardcoded as the defaults in the workflow `env`. A repository Actions variable of the same name overrides a default. An empty variable keeps the default.

| Variable | Default |
| --- | --- |
| `GCP_PROJECT_ID` | `saj-prod-512711` |
| `GCP_REGION` | `asia-south1` |
| `GAR_REPOSITORY` | `saj` |
| `WIF_PROVIDER` | `projects/65255661358/locations/global/workloadIdentityPools/github/providers/salon-project` |
| `DEPLOY_SA` | `saj-deployer@saj-prod-512711.iam.gserviceaccount.com` |
| `FIREBASE_PROJECT` | `saj-prod-512711` |

### Required reviewers

The deploy job is bound to the GitHub environment `production`. GitHub creates that environment the first time the workflow runs. To make Ankita approve each production deploy:

1. Open the repository **Settings → Environments → production**. Create `production` first if it is not there yet.
2. Under Deployment protection rules, enable **Required reviewers** and add Ankita.
3. Under Deployment branches, allow `main` only.

Checks still run as soon as `main` changes. The deploy job waits until a required reviewer approves it.

### Roll back

List revisions if you need the name:

```sh
gcloud run revisions list --service saj-web --region asia-south1 --project saj-prod-512711
```

Send all traffic to an older revision:

```sh
gcloud run services update-traffic saj-web --to-revisions=<rev>=100 --region asia-south1 --project saj-prod-512711
```

`<rev>` is the revision name, for example the previous revision printed in the job summary. This does not undo a migration `saj-migrate` already applied. To roll the app forward again, re-run the Deploy workflow from `main` or push a fix to `main`.

## Photos (Cloud Storage, keyless)

The org enforces `constraints/iam.disableServiceAccountKeyCreation`. That constraint also blocks service-account HMAC keys, so Cloud Run does not use the S3 XML API. Photos use `IMAGE_DRIVER=gcs` and `@google-cloud/storage`. The client uses Application Default Credentials from the runtime service account. There is no key file and no HMAC key.

1. Create a bucket, for example `salon-photos`, in `asia-south1`, with uniform bucket-level access.
2. Grant `allUsers` the role `roles/storage.objectViewer` on the bucket so photo URLs are world-readable. Do not grant object ACLs. Uniform bucket-level access would reject them, and the app does not set `public: true` or a predefined ACL.
3. Grant the Cloud Run runtime service account access to objects in that bucket:

```sh
gcloud storage buckets add-iam-policy-binding gs://salon-photos \
  --member="serviceAccount:saj-run@saj-prod-512711.iam.gserviceaccount.com" \
  --role="roles/storage.objectUser"
```

4. Attach `saj-run@saj-prod-512711.iam.gserviceaccount.com` to the Cloud Run service `saj-web` and to the job `saj-migrate`. The metadata server then supplies Application Default Credentials. Do not set `GOOGLE_APPLICATION_CREDENTIALS`.
5. Set `IMAGE_DRIVER=gcs` and `GCS_BUCKET` to the bucket name. Leave `GCS_PUBLIC_URL` unset.

Uploads set `Content-Type: image/webp` and `Cache-Control: public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable`.

Photo URLs are `https://storage.googleapis.com/<GCS_BUCKET>/<object>` until `GCS_PUBLIC_URL` is set. Leave it unset. An `img` subdomain would need a load balancer in front of the bucket. A DNS record alone does not serve the bucket on that host.

Do not create an HMAC key for this project. `scripts/pg-dump.sh` can still upload a dump with `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` when `BACKUP_S3_BUCKET` is set. That path is optional and is not the photo driver. The same org constraint blocks creating a service-account HMAC key for it. Leave `BACKUP_S3_BUCKET` unset unless those keys already exist.

## Neon

Create a Neon Postgres database. Prisma reads `url` (`DATABASE_URL`) for the app and `directUrl` (`DIRECT_URL`) for migrations. Encode the password. Both URLs need `sslmode=require`.

Pooled, used by Cloud Run at runtime:

```
postgresql://USER:PASSWORD@ep-example-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

Direct, used by `saj-migrate`:

```
postgresql://USER:PASSWORD@ep-example.REGION.aws.neon.tech/neondb?sslmode=require
```

The pooled host contains `-pooler`. The direct host does not. Do not point `DIRECT_URL` at the pooler. Neon keeps its own point-in-time backups. Also take a logical dump. See [Backups](#backups).

## Secrets

Store the production environment in Secret Manager and reference those secrets from `saj-web` and `saj-migrate`. That includes `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `ADMIN_PASSWORD`. Do not put those values in the image, in git, or in a plaintext env file on the service.

`NEXT_PUBLIC_APP_URL` is read at build time by `next build` and again at runtime. Set it to `https://letstrim.com` for the production build. Non-secret settings (`IMAGE_DRIVER`, `GCS_BUCKET`, `ALLOW_INDEXING`, `ADMIN_EMAIL`, `ADMIN_NAME`) can live beside the secrets on the service and the job. Leave `SITE_NAME` unset to use LetsTrim.

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Production refuses secrets and passwords that ship in `.env.example`.

## Image

The production workflow builds this Dockerfile on the GitHub runner and pushes it to Artifact Registry. The build passes placeholder `DATABASE_URL` and `DIRECT_URL` into `prisma generate` only. Those values are not stored in the image. The real URLs come from Secret Manager on `saj-web` and `saj-migrate`. The workflow also passes `NEXT_PUBLIC_APP_URL=https://letstrim.com`, which `next build` inlines. It does not pass `ALLOW_INDEXING`. That flag stays on the Cloud Run service, and the smoke test requires `noindex`.

Leave the container command empty so the image command runs: `npm start`. That listens on `PORT`, which Cloud Run sets. Do not point `saj-web` at `npm run migrate:deploy`. Several replicas would migrate at once.

The Dockerfile stays one stage on purpose. A standalone runner would drop the Prisma CLI and the seed, and `saj-migrate` runs both from the same image.

## Cloud Run service

Service id `saj-web`, region `asia-south1`, minimum instances `0`. The service allows unauthenticated invocations so Firebase Hosting can reach it. Attach the runtime service account from [Photos](#photos-cloud-storage-keyless). Scaling to zero is the idle state. The first request after idle starts an instance.

## Migrate job

Job id `saj-migrate`, same image, same region, same service account. Container command:

```sh
sh scripts/migrate-job.sh
```

That is the script behind `npm run migrate:deploy`. The production workflow updates only the job image, then runs `gcloud run jobs execute saj-migrate --wait` before it deploys `saj-web`. It does this on every deploy, not only when `prisma/migrations` changes. Applied migrations are skipped. The seed still runs. The workflow does not change the job command, env vars, or secrets. If the execution fails, `saj-web` is left on its current revision.

The job needs `NODE_ENV=production` and the same secrets and settings as `saj-web`: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `IMAGE_DRIVER=gcs`, `GCS_BUCKET`, and `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The seed runs the production check, which requires `GCS_BUCKET` when the driver is `gcs`, even though this job does not upload photos. The job applies migrations, then seeds the admin, the launch city, and its areas. It does not load sample salons. Set `DIRECT_URL` on the job. If `DATABASE_URL` is the Neon pooler, the script refuses to copy it. When there is no pooler and `DIRECT_URL` is missing, the job copies `DATABASE_URL`.

`npm run migrate:deploy` applies `prisma/migrations` and runs the seed. When `NODE_ENV=production` the seed creates the admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if that user does not exist yet, and upserts the launch city and its areas. It does not load sample salons or sample owners. Service pages are still added in the admin screen. If a database was seeded outside production and still has sample rows, run `npm run db:clear-demo` before launch. Sample salons stay labelled Sample either way, and they stay hidden on the public site unless `SHOW_DEMO_LISTINGS=true`.

## Firebase Hosting

`firebase.json` rewrites `**` to Cloud Run service `saj-web` in `asia-south1`. `.firebaserc` selects project `saj-prod-512711`. The Firebase CLI requires a public directory, so `public` is `firebase-public` (a placeholder `404.html`). Hosting still sends app paths to Cloud Run.

Hosting forwards only the `__session` cookie to Cloud Run. The login session is stored in `__session` (HttpOnly, Secure when the public origin is https, SameSite=Lax). Listing stats do not set a cookie. A repeat view is deduped with a salted hash of the client IP, the user agent, and the salon-local day. `TRUST_PROXY_HOPS` defaults to 2 so that hash uses the address just left of Firebase Hosting and the Google Front End. If `X-Forwarded-For` is shorter than that chain, the hash uses the leftmost trusted hop, or `X-Real-Ip` / unknown when the trusted hops themselves are missing. It does not use a lone client-supplied address.

### Cache

Public directory and salon pages send `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` and `Vary: Cookie` when the request has no `__session` cookie and is not `?preview=1`. The vary header keeps Firebase Hosting from serving that logged-out copy to a signed-in browser. `/admin`, `/dashboard`, `/partner` (including claim), `/login`, `/signup`, `/auth`, and `/api` send `private, no-store`, as does any request that carries `__session` or is not a GET. Those are the routes that set the session cookie, so a `Set-Cookie` response is not cached.

`/_next/static`, `/uploads`, and `/demo` send a one-year immutable cache, with `s-maxage` and `stale-while-revalidate`, from `next.config.ts` and from `firebase.json`. Photos uploaded to Cloud Storage are stored with the same `Cache-Control`. Do not add a Hosting cache rule for `**`. That would override these headers for HTML.

## Domain (GoDaddy)

Production is `https://letstrim.com`. Set `NEXT_PUBLIC_APP_URL` to that origin. Session cookies, canonical URLs, and links in email follow `NEXT_PUBLIC_APP_URL`. The hostname is not hard-coded in the app.

Add the custom domain in Firebase Hosting and open the custom-domain wizard. Copy the DNS records the wizard shows into GoDaddy for `letstrim.com`. Use the records the wizard prints. Add `www` only when the wizard includes it. Firebase issues the certificate after those records resolve. Then open `https://letstrim.com`, sign in as the admin from Secret Manager, and confirm the review desk loads.

## Environment variables

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Pooled Neon URL with `sslmode=require`. The app uses this at runtime. Secret Manager. |
| `DIRECT_URL` | Neon direct URL with `sslmode=require`, no `-pooler` host. Prisma Migrate uses this (`directUrl` in the schema). Secret Manager. |
| `TRUST_PROXY_HOPS` | Optional. Trusted proxies on the right of `X-Forwarded-For`. Default `2` (Firebase Hosting and the Google Front End). The client IP is the address just to their left. A shorter list uses the leftmost trusted hop, or `X-Real-Ip` when there are fewer entries than the trusted hops. |
| `AUTH_SECRET` | Unique random string, at least 32 characters. Secret Manager. |
| `NEXT_PUBLIC_APP_URL` | `https://letstrim.com` |
| `SITE_NAME` | Leave unset for LetsTrim, or set another public brand |
| `ALLOW_INDEXING` | `false` |
| `INDEX_MIN_SALONS` | `8` |
| `ADMIN_EMAIL` | Your admin address |
| `ADMIN_PASSWORD` | Unique password, at least 12 characters. Secret Manager. |
| `ADMIN_NAME` | Display name for the admin |
| `SHOW_DEMO_LISTINGS` | Leave unset, or `false` |
| `IMAGE_DRIVER` | `gcs` |
| `GCS_BUCKET` | Cloud Storage bucket |
| `GCS_PUBLIC_URL` | Leave unset. Photos load from `https://storage.googleapis.com/<GCS_BUCKET>`. |

`NODE_ENV=production` is set by Cloud Run. You do not need to add it. `saj-migrate` sees that value and seeds the admin, cities, and areas without sample salons.

Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (`hello@letstrim.com`) for magic-link email, claim confirmation codes, and the note sent when an owner changes a contact number. Put `SMTP_PASS` in Secret Manager. Without SMTP, owners use their password, and a claim link cannot be finished in production because the confirmation email cannot be sent. Optional: `AUTO_APPROVE_LISTINGS=true` only if you want the first submissions to skip review. The admin screen overrides that after the setting row exists.

## Indexing stays off

Leave `ALLOW_INDEXING=false` for the launch. The site then sends `noindex` on every response, `/robots.txt` disallows `/`, and `/sitemap.xml` is a 404.

Turn it on later by setting `ALLOW_INDEXING=true` and redeploying. Even then:

- Sample salons stay `noindex` and out of the sitemap.
- A city, locality, or service page is included only when its intro in the admin is non-empty and it has at least `INDEX_MIN_SALONS` live listings that are not samples.

## Backups

Neon keeps point-in-time backups. Also take a logical dump you control:

```sh
DATABASE_URL="postgresql://…" sh scripts/pg-dump.sh
```

Run that daily. Leave `BACKUP_S3_BUCKET` unset on Cloud Run. The dump upload uses S3 HMAC keys, `IMAGE_DRIVER=gcs` does not provide them, and this org blocks creating a service-account HMAC key. The runbook for putting a dump back, and for testing that once against a throwaway database, is [RESTORE.md](RESTORE.md).

Before the first public launch, run `npm run db:clear-demo` if this database ever had sample salons loaded. Production boot will not do that for you, and it will not re-seed them.

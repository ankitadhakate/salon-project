# Deploy Saj

This is the launch setup for [notsooboring.com](https://notsooboring.com). Nothing in this file creates an account or deploys the app. You run the steps.

The app listens on `PORT` (Render sets it). `NEXT_PUBLIC_APP_URL` is the canonical origin. Change that one variable when a brand domain replaces notsooboring.com. Keep `ALLOW_INDEXING` false until the pages you want in search have real listings and written intros.

## Host

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

1. Create an R2 bucket, for example `saj-photos`.
2. Create an API token that can read and write that bucket.
3. Turn on public access for the bucket, or attach a custom domain such as `images.notsooboring.com`.
4. Note the S3 endpoint (`https://<accountid>.r2.cloudflarestorage.com`), the bucket name, the access key, the secret, and the public base URL. No trailing slash on the public URL.

## 2. Render Postgres

1. New Postgres, region Singapore, instance `0.1c-256mb`.
2. Copy the **internal** connection string. It looks like `postgresql://USER:PASSWORD@dpg-xxx-a/saj`. The web service uses this, not the external URL.

## 3. Render web service

1. New Web Service from this Git repository. Environment: Docker. Region: Singapore. Instance: `0.5c-512mb`.
2. Leave the Docker command empty so the image command runs: migrate, create the admin if missing, then `next start` on `$PORT`.
3. Add the environment variables below, then deploy.

The first boot applies `prisma/migrations` and runs `prisma/ensure-admin.ts`. That creates the admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` only if that user does not exist yet. It does not load cities or sample salons.

The sample seed (`npm run db:seed`, and the `prisma.seed` hook) refuses to run when `NODE_ENV=production`. The container entrypoint skips it in production as well. Do not point a production shell at `npm run db:seed`. Add cities, localities, and service pages in the admin screen. If a database was seeded outside production and still has sample rows, run `npm run db:clear-demo` before launch. Sample salons stay labelled Sample either way, and they stay hidden on the public site unless `SHOW_DEMO_LISTINGS=true`.

## Environment variables

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Production refuses secrets and passwords that ship in `.env.example`.

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Internal Postgres URL from step 2 |
| `AUTH_SECRET` | Unique random string, at least 32 characters |
| `NEXT_PUBLIC_APP_URL` | `https://notsooboring.com` |
| `SITE_NAME` | `Saj` |
| `ALLOW_INDEXING` | `false` |
| `INDEX_MIN_SALONS` | `8` |
| `ADMIN_EMAIL` | Your admin address |
| `ADMIN_PASSWORD` | Unique password, at least 12 characters |
| `ADMIN_NAME` | Display name for the admin |
| `SHOW_DEMO_LISTINGS` | Leave unset, or `false` |
| `IMAGE_DRIVER` | `s3` |
| `S3_BUCKET` | R2 bucket name |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | R2 access key |
| `S3_SECRET_ACCESS_KEY` | R2 secret |
| `S3_PUBLIC_URL` | Public photo origin, no trailing slash |
| `S3_FORCE_PATH_STYLE` | `false` |
| `BACKUP_S3_BUCKET` | Optional. Off-site dump bucket for `scripts/pg-dump.sh`. Leave unset to keep dumps local only |

Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for magic-link email, claim confirmation codes, and the note sent when an owner changes a contact number. Without SMTP, owners use their password, and a claim link cannot be finished in production because the confirmation email cannot be sent. Optional: `AUTO_APPROVE_LISTINGS=true` only if you want the first submissions to skip review. The admin screen overrides that after the setting row exists. Optional: `BACKUP_S3_BUCKET` for `scripts/pg-dump.sh`. It reuses the `S3_*` credentials. See [RESTORE.md](RESTORE.md).

`NODE_ENV=production` is set by Render. You do not need to add it. That value is also what keeps the sample seed from running on boot.

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

Use the paid Render Postgres plan so the host keeps its own backups. Also take a logical dump you control:

```sh
DATABASE_URL="postgresql://…" sh scripts/pg-dump.sh
```

Run that daily. Set `BACKUP_S3_BUCKET` (and the existing `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) so the script uploads the dump. On Sundays it also writes a weekly object under `weekly/` in that bucket. The runbook for putting a dump back, and for testing that once against a throwaway database, is [RESTORE.md](RESTORE.md).

Before the first public launch, run `npm run db:clear-demo` if this database ever had sample salons loaded. Production boot will not do that for you, and it will not re-seed them.

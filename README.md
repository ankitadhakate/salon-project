# Saj

Saj is a salon discovery site for India, launching in Pune. People search by locality and service. Salon owners sign up, write their own listing, and receive enquiries on WhatsApp. Customers don't pay. During the early partner program, owners don't pay either.

Pages are server-rendered. Public URLs look like `/pune/baner` and `/pune/koregaon-park/saffron-atelier`.

## Stack

- Next.js (App Router) and React
- Tailwind CSS and shadcn/ui
- Prisma with SQLite for local use and a single-server deploy
- Password sessions, plus email magic links when SMTP is set
- Images on local disk by default, or S3-compatible storage (Cloudflare R2, AWS, MinIO)

## Run it locally

Node 20 or newer.

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

`npm run db:setup` is the non-interactive version (`migrate deploy` plus seed) used by a fresh clone or a server.

### Development accounts

Created by the seed. Change `ADMIN_PASSWORD` before you seed anything you care about. The admin password is written only when that user is first created. Set `SEED_RESET_ADMIN_PASSWORD=true` and run the seed again to replace it.

| Role | Email | Password |
| --- | --- | --- |
| Salon owner (sample) | demo-owner@saj.local | saj-demo-owner |
| Admin | admin@saj.local | saj-admin-dev |

The login page shows these only when `NODE_ENV` is not production.

### Sample listings

The seed inserts fictional salons in Baner, Kothrud, Viman Nagar, Hinjewadi, Koregaon Park, Aundh, Wakad, Kharadi, and Shivajinagar, plus the full locality list (Hadapsar, Camp, and the rest) with no salons yet. Every sample is marked **Sample** on the card and on the page. Artwork is generated SVG, not a photograph. WhatsApp is switched off on samples so a click never messages a real phone.

They appear in development. Production hides them unless `SHOW_DEMO_LISTINGS=true`.

Remove them before a public launch:

```bash
npm run db:clear-demo
```

That deletes sample listings, sample owner accounts, and `public/demo`. Real signups, the admin, and the locality list stay.

## Owner flow

1. Open `/for-salons` and create an account (password, or an email link).
2. Optional referral code is stored on the account and copied onto the listing, so you can see which invite brought them in.
3. On `/dashboard`, add the salon, services and prices, hours, photos, and WhatsApp number.
4. Submit. With the default review setting, the listing stays pending until an admin approves it.
5. The public page is `/pune/<area>/<salon-slug>`.

One listing per account. The web address is chosen from the name the first time you save it and does not change if you rename the salon later.

## Admin

`/admin` lists signups (with referral codes) and listings. Approve, hide, or mark pending. The checkbox "Require a review before a listing goes live" is the approval toggle. Turn it off and the next submission goes straight to live. Already-live edits stay live either way.

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` locally. On the Docker deploy below, the compose file points this at `/data/saj.db`. |
| `AUTH_SECRET` | Random string, 16+ characters. Signs the session cookie. |
| `NEXT_PUBLIC_APP_URL` | Public origin, including `https://` on a real domain. The cookie is marked Secure when this is https. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used the first time you seed the admin. |
| `AUTO_APPROVE_LISTINGS` | If `true` before the setting exists, new submissions skip review. The admin screen overrides this afterwards. |
| `SHOW_DEMO_LISTINGS` | Force sample listings on or off. |
| `SMTP_*` | Sends magic-link email. Without it, development prints the link on the login screen and in the server log. Production asks the owner to use a password instead of showing the link. |
| `IMAGE_DRIVER=s3` plus `S3_*` | Store uploads on S3 or R2. `S3_PUBLIC_URL` is the base URL customers load. |
| `ACTION_ALLOWED_ORIGINS` | Extra hosts allowed to POST server actions, if a proxy presents a different host. |

## Images

`lib/storage.ts` is the only place that writes photos. The local driver saves to `public/uploads`. The S3 driver uses `@aws-sdk/client-s3` and is selected with `IMAGE_DRIVER=s3`. For Cloudflare R2, set `S3_ENDPOINT`, `S3_REGION=auto`, and a public bucket URL or custom domain in `S3_PUBLIC_URL`.

Uploads are limited to JPG, PNG, and WebP under 5 MB, checked by file signature.

## Deploy on a VPS with your own domain

SQLite and local uploads are a good fit for one server. They are a poor fit for multi-instance serverless hosting, because each instance would have its own disk.

1. Point an A record (and `www` if you want it) at the server.
2. Clone the repo, copy `.env.example` to `.env`, and set:
   - `AUTH_SECRET` to a long random value
   - `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - `NODE_ENV` is set to production by compose
3. Install Docker and run:

```bash
docker compose up -d --build
docker compose exec web npx tsx prisma/seed.ts
```

The database file lives in the `saj-data` volume. Uploaded photos live in `saj-uploads`.

4. Put Caddy (or nginx) in front for HTTPS. A Caddyfile:

```
yourdomain.com {
  reverse_proxy localhost:3847
}
```

5. Log in as admin, confirm the review toggle, then run `docker compose exec web npm run db:clear-demo` if the seed's sample salons should not be public. Production already hides them unless `SHOW_DEMO_LISTINGS=true`.

The app listens on port 3847.

## Postgres

The schema uses plain strings and integers so it can move off SQLite. The migration checked in with this repo is SQLite SQL, so don't point that migration at Postgres as-is.

1. Install Postgres and set `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/saj`.
2. In `prisma/schema.prisma`, set `provider = "postgresql"`.
3. Delete `prisma/migrations` (keep a copy if you still need the SQLite history).
4. Run `npx prisma migrate dev --name init` to create a Postgres migration.
5. Seed with `npm run db:seed`.

Use `IMAGE_DRIVER=s3` if more than one app server will run.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3847 |
| `npm run db:setup` | Apply migrations and seed |
| `npm run db:clear-demo` | Delete sample listings and sample users |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |

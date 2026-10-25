# Saj

Saj is a salon discovery site. People search by city, locality, and service. Salon owners sign up, write their own listing, and receive enquiries on WhatsApp. Customers don't pay. During the early partner program, owners don't pay either.

The site name comes from `SITE_NAME` (default Saj). The public origin comes from `NEXT_PUBLIC_APP_URL`. Pune is the first city in the database, not a hardcoded brand. Public URLs look like `/pune/baner` and `/pune/koregaon-park/saffron-atelier`.

Deploy steps, cost, and DNS for notsooboring.com are in [DEPLOY.md](DEPLOY.md).

## Stack

- Next.js (App Router) and React
- Tailwind CSS and shadcn/ui
- Prisma with PostgreSQL
- Password sessions, plus email magic links when SMTP is set
- Images on local disk in development, or S3-compatible storage (Cloudflare R2, AWS, MinIO). Production requires S3.

## Run it locally

Node 22, and PostgreSQL 16.

```bash
cp .env.example .env
# Create the database, then set DATABASE_URL in .env.
# Example: createdb saj && createuser saj
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

`npm run db:setup` applies migrations and seeds Pune, its localities, empty service-page intros, the admin, and the sample salons.

### Development accounts

Created by the seed. Change `ADMIN_PASSWORD` before you seed anything you care about. The admin password is written only when that user is first created. Set `SEED_RESET_ADMIN_PASSWORD=true` and run the seed again to replace it.

| Role | Email | Password |
| --- | --- | --- |
| Salon owner (sample) | demo-owner@saj.local | saj-demo-owner |
| Admin | admin@saj.local | saj-admin-dev |

The login page shows these only when `NODE_ENV` is not production. The seed refuses to run when `NODE_ENV=production`. Production boot creates the admin with `npm run db:admin` and does not load sample salons.

### Sample listings

The seed inserts fictional salons in Baner, Kothrud, Viman Nagar, Hinjewadi, Koregaon Park, Aundh, Wakad, Kharadi, and Shivajinagar, plus the Pune locality list with many areas still empty. Every sample is marked **Sample** on the card and on the page. Artwork is generated SVG, not a photograph. WhatsApp is switched off on samples so a click never messages a real phone.

They appear in development. Production hides them unless `SHOW_DEMO_LISTINGS=true`. They stay in the database either way.

Sample salon pages are always `noindex` and are never listed in the sitemap.

Remove them when you no longer want the demos:

```bash
npm run db:clear-demo
```

That deletes sample listings, sample owner accounts, and `public/demo`. Real signups, the admin, cities, and localities stay.

## Search indexing

`ALLOW_INDEXING` defaults to false. Until it is the string `true`:

- every page sends `noindex`
- `/robots.txt` disallows `/`
- `/sitemap.xml` responds with 404

When indexing is on, a city, locality, or service page is still left out unless both of these are true:

- the team has saved a non-empty intro for that page in `/admin`
- it has at least `INDEX_MIN_SALONS` approved listings that are not samples (default 8)

Home and `/for-salons` can be indexed once the flag is on. The partner area, old login and signup URLs, and the admin stay `noindex`.

## Owner flow

Customers browse with no account. Owners use `/partner`.

1. Open `/partner` or `/for-salons` and start setup. It is five short steps: account, salon, contact, services, photos. About five minutes. On the salon step, search the address and drag the map pin. Latitude and longitude are stored with the listing.
2. Each category offers common services with suggested prices. Tick them, then edit the price. At least three photos are required before submit.
3. Optional referral code is stored on the account and copied onto the listing.
4. Submit. With the default review setting, the listing stays pending until an admin approves it. Edits to a listing that is already live stay on the public page.
5. The partner dashboard shows listing views, call taps, WhatsApp taps, and direction taps for today and in total. Those are daily counts only.
6. The public page is `/<city>/<locality>/<salon-slug>`. The dashboard also shows a phone-sized preview.

`/login`, `/signup`, and `/dashboard` redirect into the partner area.

## Maps and near me

Maps use OpenStreetMap tiles through Leaflet. Address search uses the public Nominatim service. Neither needs an API key. Directions open a Google Maps link (`maps/dir`) which also needs no key and is not the paid Maps JavaScript API.

At launch volume this is ₹0 / $0. OpenStreetMap asks that heavy tile traffic move to your own tile server or a tile host. If that happens, set `NEXT_PUBLIC_MAP_TILE_URL` (the URL can include a provider key) and `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`. Point `GEOCODER_URL` at another search endpoint if Nominatim's one-request-per-second limit is too low.

Customers can opt in with "Use my location". The browser shares a position for that tab only, and the list sorts by distance, with 2 km, 5 km, 10 km, or any distance. Each card shows how far away the salon is. If permission is denied, a locality picker is the fallback. Coordinates are not stored on an account.

## Claim a listing

On `/admin`, the team can create a draft with no owner and an email or phone. The page shows a claim link (and emails it when SMTP is set). The owner opens `/partner/claim/<token>`, confirms that contact, sets a password or logs into an existing partner account, and takes over the draft. Submitting it still enters the review queue. The link expires in 7 days.

One listing per account. The web address is chosen from the name the first time you save it and does not change if you rename the salon later. Changing city or locality keeps the name unique inside the new place.

## Admin

`/admin` lists signups (with referral codes) and listings. Unclaimed listings say Unclaimed. Approve, hide, or mark pending. The checkbox "Require a review before a listing goes live" is the approval toggle. Turn it off and the next submission goes straight to live. Already-live edits stay live either way.

The same page adds cities, localities, and service pages, and stores the intros that decide whether those pages can be indexed.

## Environment

See `.env.example`. Production rejects the development secret, the development admin password, a non-Postgres database, an `http` origin, and anything other than `IMAGE_DRIVER=s3`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string the app uses at runtime. |
| `DIRECT_URL` | Direct Postgres URL for Prisma Migrate. Same value as `DATABASE_URL` when there is no pooler. |
| `AUTH_SECRET` | Random string. 16+ characters in development, 32+ in production. Signs the session cookie. |
| `NEXT_PUBLIC_APP_URL` | Public origin. Cookie is Secure when this is https. |
| `SITE_NAME` | Brand in the header, titles, and email. Default Saj. |
| `ALLOW_INDEXING` | `true` to allow indexing. Anything else, including unset, keeps the site out of search. |
| `INDEX_MIN_SALONS` | Minimum approved non-sample salons for a city, area, or service page to be indexed. Default 8. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used the first time the seed or `npm run db:admin` creates the admin. |
| `AUTO_APPROVE_LISTINGS` | If `true` before the setting exists, new submissions skip review. The admin screen overrides this afterwards. |
| `SHOW_DEMO_LISTINGS` | Force sample listings on or off. |
| `SMTP_*` | Sends magic-link email, claim confirmation codes, and contact-number change notes. Without it, development shows the link on screen. Production will not finish a claim, because the confirmation email cannot be sent. |
| `IMAGE_DRIVER=s3` plus `S3_*` | Store uploads on S3 or R2. `S3_PUBLIC_URL` is the base URL customers load. Required in production. Checksums are sent only when required, which is what Cloudflare R2 accepts. |
| `ACTION_ALLOWED_ORIGINS` | Extra hosts allowed to POST server actions, if a proxy presents a different host. |

## Images

`lib/storage.ts` is the only place that writes photos. The local driver saves to `public/uploads`. The S3 driver uses `@aws-sdk/client-s3` and is selected with `IMAGE_DRIVER=s3`. For Cloudflare R2, set `S3_ENDPOINT`, `S3_REGION=auto`, and a public bucket URL or custom domain in `S3_PUBLIC_URL`. The client sets request and response checksums to `WHEN_REQUIRED`, because R2 rejects the SDK default.

Uploads are one photo at a time, limited to JPG, PNG, and WebP under 5 MB, checked by file signature. They are re-encoded with sharp: auto-rotated, stripped of EXIF and GPS, resized to at most 1600px wide, and saved as WebP.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3847 |
| `npm run db:setup` | Apply migrations and seed |
| `sh scripts/migrate-job.sh` | Apply migrations and, in production, create the admin. Does not seed. Cloud Run runs this as a job. |
| `npm run db:admin` | Create the admin user only. Safe in production. |
| `npm run db:clear-demo` | Delete sample listings and sample users |
| `sh scripts/pg-dump.sh` | Write a Postgres dump. See RESTORE.md. |
| `npm run build` / `npm start` | Production build and server. `start` listens on `PORT` or 3847. |
| `npm run lint` | ESLint |

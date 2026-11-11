# Rentals Website: Build Plan

Nov 10, 2026 · @himanshu Choyal · Live doc: https://claude.ai/artifact/Ai3YxHkEQYWwgbzuecftNC

## Overview

We build the SPEC.md site as one Next.js (App Router) app. Every external service (image storage, database host, sign-in, OTP SMS) sits behind a small interface, and env variables choose which one is used. Changing a vendor means writing one adapter file, not touching pages.

What v1 covers, per SPEC.md:

- **Public discovery, no account:** home/listing with filters, search and sort, product page `/p/[code]`, shop page `/shop/[slug]`, saved items, and the WhatsApp enquiry pop-up. All are server-rendered with Open Graph tags.
- **Sellers:** sign-in, one-form onboarding, product upload (chips only), and a dashboard with per-size availability.
- **Admin:** shop approval, option lists, reports queue, stats, audit log and login-as-seller.
- **Cross-cutting:** Hindi/English, PWA, a daily job, and fast loading on 3G and low-end Android.

Out of scope, as in SPEC.md §15: payments, bookings, user accounts, chat, reviews and measurements.

## Architecture

**Stack:** Next.js (App Router) + TypeScript, Tailwind and shadcn/ui (per CLAUDE.md), Prisma on Neon Postgres, Better Auth, next-intl for Hindi/English, and Cloudflare R2 for images. Each vendor appears in exactly one folder.

```
Browser (pages, image compressor: WebP + OG JPEG) ──direct upload, signed URL──┐
   │                                                                          │
Next.js server (SSR pages with OG tags, server actions)                       │
   │                                                                          │
Services (src/server): the only code that calls the interfaces                │
   │            │               │                 │                           │
Storage        Auth            OTP sender        Database                     │
(signed URLs)  (user, roles)   send(phone,code)  (Prisma client)              │
   │            │               │                 │                           │
dev: local ◄───────────────────────────────────────────────────────────────────┘
prod: R2       Better Auth     dev: console      dev: local Postgres
               Google + OTP    prod: MSG91       prod: Neon

Adapters are picked by STORAGE_DRIVER, OTP_DRIVER and DATABASE_URL.
```

Pages never import a vendor SDK. They call services, services call the four interfaces, and env picks the adapter behind each one. Image bytes are the one exception to the top-down path: they go straight from the browser to storage.

**Folders:** `src/app` (routes and pages), `src/components` (shadcn/ui plus our compositions), `src/server/{storage,auth,otp,db}` (interfaces and adapters), `src/server/services` (business logic and `AuditLog` writes), `src/lib` (code shared with the client, such as the compressor and WhatsApp message builder), and `messages/{hi,en}.json`.

## Image storage

Images never pass through our server. The browser compresses each photo, asks the server for a signed upload URL, and uploads straight to storage. The server only signs URLs and saves the resulting keys in the database.

**Storage interface** (`src/server/storage/index.ts`), three methods:

| Method | Purpose |
| --- | --- |
| `createUploadUrl(key, contentType, maxBytes)` | Returns a short-lived URL the browser PUTs the file to |
| `publicUrl(key)` | Turns a stored key into an absolute https URL (CDN or local) |
| `delete(key)` | Removes the file when a seller deletes an image |

Two adapters, chosen by `STORAGE_DRIVER`:

- **`r2`** (production): Cloudflare R2 through the S3 API (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`). Files are served from a public bucket domain or a custom CDN domain (`STORAGE_PUBLIC_BASE_URL`). Because R2 speaks the S3 API, moving to S3 or another S3-compatible store later only takes env changes.
- **`local`** (debugging): writes to `./.uploads` on disk. `createUploadUrl` returns our own `/api/dev-upload/[key]` route, signed with an HMAC so the flow matches R2. Files are served by `/api/dev-files/[...key]`. Both routes refuse to run when `NODE_ENV=production`.

The database stores **keys** (for example `products/R1042/abc123.webp`), never full URLs, so a change of bucket or CDN domain needs no data migration. `publicUrl()` builds the URL at render time.

**Browser compression** (`src/lib/image/compress.ts`, which runs only on the client):

1. Decode the picked file with `createImageBitmap` (respects EXIF rotation), with an `<img>` fallback for old Android WebViews.
2. **Main image:** resize to at most `IMAGE_MAX_EDGE` px (default 1600) on the long side and encode as WebP at about quality 0.8. Files already smaller than the target are still re-encoded, which strips EXIF data including GPS.
3. **OG image:** in the same pass, resize to 1200px and encode as JPEG, lowering quality step by step until it is under 300 KB.
4. Upload both files in parallel with a progress bar per image and one retry.

Making the OG image in the browser too means the server never processes images, and the §14 "on upload" job goes away. The server still checks size and type, through the signed URL's content-length and content-type limits, so a modified client cannot upload a 50 MB file.

Planned library: `browser-image-compression`. It is about 20 KB, handles WebP and EXIF, and runs in a web worker. We load it only on the upload page.

## Database

Neon Postgres is the only database, accessed through Prisma (SPEC.md §2 recommends it). Nothing outside `src/server/` imports Prisma. Pages and server actions call service functions such as `products.listForHome(filters)` and `shops.approve(id, actor)`.

- **Swapping the host:** Prisma talks plain Postgres, so `DATABASE_URL` decides where data lives: Neon in production, a Neon branch for previews, or local Postgres in Docker for offline work. A Neon-specific line appears in one place only, the Prisma client setup, which uses Neon's serverless driver adapter when `DB_DRIVER=neon` and the standard driver otherwise.
- **No repository interfaces on top of Prisma.** That layer would duplicate Prisma's API and would not help us change vendors, which Postgres already does. The service modules are the seam.
- **Migrations:** `prisma migrate dev` locally and `prisma migrate deploy` in CI before each deploy. A seed script loads Barwani, its areas and the starting option lists (categories, colours with hex values, sizes, and so on) in both languages.
- **Search:** the `pg_trgm` extension, which Neon supports, gives typo tolerance on titles and option labels. Before the query runs, `SearchSynonym` rows map terms like *lehnga* or *लहंगा* to Lehenga. There is no external search service at this scale.

**Data model:** the tables follow SPEC.md §3 one to one. Sign-in needs these additions:

| Table | Why |
| --- | --- |
| `User` (id, email, name, googleId, phone, phoneVerified, role `seller` / `admin`) | One account record for both sellers and admins; role-protected per §9 |
| `Session`, `Account`, `Verification` | Required by the auth library (sessions, Google link, OTP codes) |
| `Shop.ownerUserId` | Links a shop to its seller; `null` for shops an admin created on someone's behalf until they claim it |
| `RateLimit` (key, count, windowEnd) | OTP and report rate limits in Postgres, with no Redis to run |

`ProductImage` stores `key` and `ogKey` instead of the `url` / `ogUrl` in the spec (see Image storage). The verified number lives on `User.phoneNumber` and is copied to `Shop.loginPhone`, which lets a seller claim a shop an admin created for them.

## Sign-in

Only sellers (and admins) have accounts. A Google account is **mandatory**: there is no phone-only login. The phone OTP runs **once**, at first sign-up, to verify the shop's number. After that, every login is just **Continue with Google**, with no OTP. Shoppers still have no account (SPEC.md §1).

1. Seller taps **Continue with Google**, and Google returns their email and name.
2. **First time only** (`User.phoneVerified` is false): a phone screen asks for a +91 number, sends a 6-digit OTP, and checks it. Sellers cannot reach onboarding or the dashboard until this is done.
3. Once verified, the number becomes `User.phone` and pre-fills the WhatsApp number in the onboarding form ("Same as login number" stays ticked).
4. **Every later visit:** Continue with Google goes straight to the dashboard. OTP runs again only if the seller changes their verified phone in settings.
5. The session sits in an httpOnly, Secure, SameSite=Lax cookie lasting `SESSION_MAX_AGE_DAYS` (default 30), as §2 requires, so most visits need no tap at all.

**Library:** Better Auth. It ships a Google provider, a phone-number/OTP plugin, database sessions through a Prisma adapter, and built-in rate limiting. That saves us writing token and cookie code. It sits behind `src/server/auth/` with two exports, `getCurrentUser()` and `requireRole('seller' | 'admin')`. Pages use only these, so replacing Better Auth with Auth.js or something else later stays inside that folder.

**OTP sender interface** (`src/server/otp/`): one method, `send(phone, code)`. The library creates, stores and checks the code. We only deliver it. Adapters are picked by `OTP_DRIVER`:

- `console`: prints the code to the server log (dev and tests, no cost)
- `msg91`: SMS through MSG91, which handles India's DLT template registration
- `whatsapp`: a later option, through WhatsApp Cloud API

**Cost and abuse limits**, because each OTP costs money: at most `OTP_MAX_PER_PHONE_PER_HOUR` (default 3) per number and `OTP_MAX_PER_IP_PER_HOUR` (default 10) per IP, a 30-second resend cooldown in the UI, 5 wrong tries per code, and a 5-minute expiry.

**Admin:** `role = admin` is set when the account is created, for emails listed in `ADMIN_EMAILS`, so there is no sign-up path to admin. Sending an OTP requires a signed-in Google session. **Login as seller** adds an `impersonatingShopId` to the admin's session, shows a red banner, and writes every action to `AuditLog` under the admin's id. **Create shop on behalf** makes a `Shop` with no owner. A seller who later signs in with that shop's phone number claims it.

## Configuration

All configuration is read and checked once, in `src/server/env.ts`, with a Zod schema. A missing or wrong value stops the app at startup with a clear message, never halfway through a request. Each driver's credentials are required only when that driver is selected. `.env.example` lists everything, and local dev runs with `STORAGE_DRIVER=local` and `OTP_DRIVER=console`, with no cloud accounts needed apart from Google sign-in.

| Variable | Default | Controls |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3000` | Absolute base for OG tags, share links and WhatsApp messages |
| `DATABASE_URL` | none | Postgres connection (Neon or local) |
| `DB_DRIVER` | `pg` | `neon` = serverless driver adapter, `pg` = standard |
| `STORAGE_DRIVER` | `local` | `local` or `r2` |
| `STORAGE_LOCAL_DIR` | `./.uploads` | Local adapter folder |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | none | R2 credentials (required when `r2`) |
| `STORAGE_PUBLIC_BASE_URL` | derived | Public CDN or bucket domain for images |
| `UPLOAD_URL_TTL_SECONDS` | `300` | How long a signed upload URL stays valid |
| `NEXT_PUBLIC_IMAGE_MAX_EDGE` | `1600` | Browser resize target for main images |
| `NEXT_PUBLIC_IMAGE_MAX_UPLOAD_MB` | `5` | Upload limit, enforced by the signed URL |
| `NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT` | `8` | The §15 "decided later" image limit, set now and changeable later |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | none | Google sign-in |
| `AUTH_SECRET` | none | Session signing |
| `SESSION_MAX_AGE_DAYS` | `30` | Seller cookie lifetime |
| `OTP_DRIVER` | `console` | `console`, `msg91`, later `whatsapp` |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | none | SMS credentials (required when `msg91`) |
| `OTP_MAX_PER_PHONE_PER_HOUR`, `OTP_MAX_PER_IP_PER_HOUR` | `3`, `10` | OTP cost limits |
| `REPORT_MAX_PER_IP_PER_HOUR` | `5` | Report-listing rate limit (§10) |
| `STALE_AFTER_DAYS` | `30` | Stale banner and lower ranking |
| `ADMIN_EMAILS` | none | Comma list given admin role by the seed |
| `CRON_SECRET` | none | Protects the daily job endpoint |
| `DEFAULT_CITY_SLUG` | `barwani` | Preselected city |

`NEXT_PUBLIC_` values reach the browser, so no secret ever gets that prefix. Business data that admins should change without a redeploy (option lists, synonyms) stays in the database, not in env.

## Phases

Six phases, in order. Each one ends with something usable, so we can show it to a shop owner and change course early.

1. **Foundation:** Next.js + TypeScript + Tailwind + shadcn/ui init, `env.ts`, Prisma schema and seed, the storage and OTP interfaces with their local/console adapters, next-intl (hi/en) and a basic layout. *Done when:* the app boots locally with no cloud accounts.
2. **Seller sign-in and onboarding:** Google + phone OTP, the one-form onboarding, the "Waiting for approval" screen, and a minimal admin page to approve shops. *Done when:* a test seller gets from sign-in to approval.
3. **Product upload:** the chip-based wizard, N colours making N products, browser compression, signed uploads, image reorder and delete, and code generation. *Done when:* a seller uploads a 3-colour lehenga over throttled 3G.
4. **Discovery and enquiry:** home/listing with chips, filters, sort and search, product and shop pages with OG tags, the WhatsApp pop-up with `sendBeacon`, Saved, Share and Report. *Done when:* a pasted product link shows the dress preview in WhatsApp.
5. **Seller dashboard and jobs:** per-size availability controls, free-from date, hide, mark sold, duplicate, stats, the stale banner and the daily cron. *Done when:* a free-from date resets overnight.
6. **Admin and launch:** the full admin panel (option lists, reports, stats, audit log, login as seller, create shop), static pages, PWA, switching to R2 + MSG91 + Neon production, and a Lighthouse pass on a low-end Android. *Done when:* the first Barwani shops are live.

## Open questions and risks

- [ ] **Hosting:** the plan assumes Vercel (Next.js SSR plus Vercel Cron for the daily job). Cloudflare Workers via OpenNext would also work, and only the cron trigger would change.
- [ ] **SMS provider and DLT:** sending SMS OTP in India needs a registered DLT sender ID and template, which can take 1–2 weeks. Start that during Phase 1.
- [ ] **Language choice storage:** SPEC.md §11 says `localStorage`. Server-rendered pages cannot read that, so the first paint would be in the wrong language. The plan stores it in a cookie as well, and keeps the pop-up behaviour.

- **Risk: sellers without a Google account.** Because Google is mandatory, some shop owners will need help creating a Gmail account during in-person onboarding. Admin-created shops (§9) cover the gap until then.
- **Risk: OG previews on WhatsApp.** WhatsApp caches previews and needs an image under about 300 KB at a public https URL. The R2 bucket must be publicly readable, or behind a CDN domain, from day one.
- **Risk: old Android browsers.** WebP encoding through canvas is missing on some very old WebViews. The compressor falls back to JPEG when `toBlob('image/webp')` returns PNG.

## Build status

- **Phases 1–2 built (2026-11-10).** Foundation, Google + one-time phone OTP, onboarding, the pending/paused/live seller screens, and admin shop approval with audit log.
- **Moved to Phase 3:** the onboarding shop photo and map pin, because they need the browser-compression upload flow.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Rentals: a mobile-first, Hindi/English discovery site for dress rental shops in Barwani. Product spec: `SPEC.md`. Build plan, env table and phases: `docs/PLAN.md` (live copy: https://claude.ai/artifact/Ai3YxHkEQYWwgbzuecftNC). All six phases are built in code (status and what's left for launch: `docs/PLAN.md` "Build status"). Public pages: `/`, `/p/[code]`, `/shop/[slug]`, `/saved`, `/(info)/[page]`. Seller: `/seller` (dashboard), `/seller/products/new` (`?from=` duplicates), `/seller/products/[id]/edit`, `/seller/settings`. Admin: `/admin/*`. Seller pages get their shop from `getSellerContext()` / `requireLiveShop()` in `src/server/seller.ts`, which also handles admin "act as seller" (an `impersonate` cookie honoured only for admins).

## Commands

```bash
npm run dev            # http://localhost:3000 (use localhost, not 127.0.0.1: Next blocks dev assets cross-origin)
npm run build          # prisma generate + next build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit (run `npx next typegen` first if PageProps/LayoutProps route types are stale)
npm test               # node:test via tsx, files matching src/**/*.test.ts
npx tsx --test src/lib/slug.test.ts   # one test file
npm run db:migrate     # prisma migrate dev (creates + applies a migration)
npm run db:seed        # option lists + Barwani (idempotent upserts)
npm run db:deploy      # prisma migrate deploy (CI / production); on Neon set DIRECT_URL (non-pooler host) or it times out on the advisory lock
```

Copy `.env.example` to `.env`. Local dev needs only `DATABASE_URL`, `AUTH_SECRET` and Google OAuth keys; storage and OTP default to `local` / `console` (the OTP code is printed in the dev server log).

## Architecture

- **Next.js 16 App Router.** APIs differ from older versions: read `node_modules/next/dist/docs/` before using an unfamiliar API (see `AGENTS.md`). `params`, `searchParams`, `cookies()` and `headers()` are async. `cacheComponents` is deliberately off because every page reads the locale cookie.
- **Swappable vendors.** Pages and server actions never import a vendor SDK. Each vendor sits behind one folder in `src/server/`, and env picks the adapter:
  - `storage/` (`STORAGE_DRIVER=local|r2`): `createUploadUrl`, `publicUrl` and `delete`. The browser PUTs straight to a signed URL. `local` writes to `./.uploads` through `/api/dev-upload` and `/api/dev-files`, which 404 unless `STORAGE_DRIVER=local`. The database stores storage **keys**, never URLs.
  - `otp/` (`OTP_DRIVER=console|msg91`): only delivers the code; Better Auth generates and checks it.
  - `auth/`: Better Auth is imported only in `better-auth.ts`. Everything else uses `getCurrentUser`, `requireUser` and `requireRole` from `auth/index.ts`, and on the client the three functions in `src/lib/auth-client.ts`.
  - `db.ts` (`DB_DRIVER=pg|neon`): the only Neon-specific line.
- **Env** is parsed once with Zod in `src/server/env.ts`. A driver's keys are required only when that driver is selected. Add new config there and to `.env.example`.
- **Services** in `src/server/services/` hold business logic and write `AuditLog` rows inside the same transaction. Don't run queries on `db` inside a `db.$transaction` callback: it can deadlock on a small pool. Use `tx`.
- **Auth policy** (`better-auth.ts`): Google is mandatory. Only the OAuth callback may create a session (`databaseHooks.session.create.before`). Phone OTP runs once, while signed in, to verify the shop number (`/phone-number/verify` must have `updatePhoneNumber: true`). Sending a code needs a session and is rate-limited per phone and per IP in Postgres (`src/server/rate-limit.ts`). Emails in `ADMIN_EMAILS` get `role=admin` when the account is created.
- **Prisma 7.** The client is generated to `src/generated/prisma` (gitignored; `postinstall` regenerates it). Import from `@/generated/prisma/client`. CLI config is in `prisma.config.ts`.
- **i18n**: next-intl without URL locales. Locale is the `locale` cookie (`hi` default), read in `src/i18n/request.ts`. All UI strings live in `messages/{hi,en}.json`, so add every key to both. Option lists store `nameEn` and `nameHi` columns.
- **Visual system**: the "tobacco and olive" palette, set as CSS variables in `src/app/globals.css` and mapped onto shadcn tokens. Faces are Eczar (headings) and Mukta (body), both with Devanagari. Corners are square, and tap targets are at least 48px (`h-12`/`h-14`). The haldi/tobacco stripe (`components/app/stripe.tsx`) is the product's one ornament. Main choices use chips (ToggleGroup), never dropdowns (SPEC §13).

## UI & Component Rules
- **STRICTLY USE SHADCN/UI:** Never manually write raw HTML/Tailwind primitives (like custom buttons, modals, inputs, dropdowns, tables, or sidebars) from scratch.
- **CLI Installation Only:** Always check `src/components/ui` (or your configured components directory) first. If a component or block is missing, install it using the official CLI (`npx shadcn@latest add <component-name>`) rather than writing the component file manually.
- **Prefer Official Blocks & Composition:** Before building complex layouts (auth pages, dashboards, settings, sidebars), search the shadcn/ui registry/MCP for an existing block and install it via CLI. Compose existing shadcn primitives together rather than creating custom CSS/Tailwind wrappers.
- **Follow Official Docs Patterns:** Use official patterns from ui.shadcn.com (e.g., React Hook Form + Zod with shadcn `<Form>` components, TanStack Table with `<DataTable>`).

shadcn here is the `base-nova` style on Base UI: `ToggleGroup` values are arrays, and `Input` sets `md:text-sm`, so pass `md:text-lg` when you want large text. Forms use server actions with `useActionState`. Return the submitted values in the state, because React resets the form after an action.

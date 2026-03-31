# NEXA

NEXA is now a production-oriented streaming platform starter with:

- account registration, login, and cookie-based sessions
- user roles: viewer, creator, moderator, admin
- creator studio with RTMP/playback settings
- Stripe-ready donation checkout with sandbox fallback
- Stripe webhook endpoint for checkout completion
- moderation reports, bans, channel takedown actions, and chat moderation
- real-time live chat with SSE streaming
- local JSON persistence by default, with Prisma/PostgreSQL-ready scaffolding

## Run locally

```powershell
node server.js
```

or

```powershell
npm.cmd run dev
```

Then open `http://localhost:3000`.

## Seeded demo accounts

- `admin@nexa.local` / `Admin123!`
- `creator@nexa.local` / `Creator123!`
- `moderator@nexa.local` / `Moderator123!`
- `viewer@nexa.local` / `Viewer123!`

## Main pages

- `/` production home page
- `/auth` login + register
- `/channel/nexa-arena` watch, donate, and report
- `/channel/nexa-arena` watch, donate, report, and join live chat
- `/studio` creator streaming control room
- `/admin` moderation dashboard
- `/checkout/sandbox?donationId=...` local payment fallback

## Core API routes

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/channels`
- `GET /api/channels/:slug`
- `POST /api/channels/:id/report`
- `GET /api/chat/history`
- `GET /api/chat/stream`
- `POST /api/chat/messages`
- `POST /api/payments/checkout`
- `GET /api/payments/details`
- `GET /api/payments/status`
- `POST /api/payments/sandbox/confirm`
- `POST /api/webhooks/stripe`
- `GET /api/studio/summary`
- `POST /api/studio/save`
- `GET /api/admin/summary`
- `POST /api/admin/reports/:id/resolve`
- `POST /api/admin/users/:id/ban`
- `POST /api/admin/channels/:id/takedown`
- `POST /api/admin/chat/:id/hide`

## Environment setup

Copy values from `.env.example` into your own environment.

### Payments

Use sandbox by default:

```text
PAYMENT_PROVIDER=sandbox
```

Enable Stripe checkout:

```text
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_ORIGIN=http://localhost:3000
```

Stripe webhook target:

```text
POST /api/webhooks/stripe
```

### Live streaming

Manual RTMP/HLS mode works with only Studio-managed URLs:

```text
LIVE_PROVIDER=manual
```

Enable LiveKit token generation:

```text
LIVE_PROVIDER=livekit
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_RTMP_URL=rtmp://your-livekit-ingress/live
```

### Database

JSON mode works out of the box:

```text
DATABASE_PROVIDER=json
```

Enable Prisma + PostgreSQL:

```text
DATABASE_PROVIDER=prisma
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexa
```

Then run:

```powershell
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed
```

## Important note

This repo now includes auth, moderation, chat, Stripe webhook plumbing, and Prisma/PostgreSQL scaffolding,
but it still needs hardened deployment concerns such as Redis fanout, background jobs, webhook replay handling,
PostgreSQL in a real environment, and a multi-instance chat/pubsub strategy.

## File map

- `server.js` compatibility entrypoint
- `src/server-runtime.js` main HTTP routes, webhook, and chat runtime
- `src/auth.js` sessions, password hashing, role checks
- `src/providers.js` Stripe and LiveKit integration helpers
- `src/store.js` JSON store + Prisma-aware persistence layer
- `src/views.js` page shells
- `public/client.js` browser interactions
- `public/site.css` branded production UI
- `prisma/schema.prisma` PostgreSQL schema
- `prisma/seed.js` Prisma seed script
- `data/store.json` local data store

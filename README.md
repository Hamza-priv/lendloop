# LendLoop

**Borrow what you need. Lend what you don't.**

A neighbourhood tool-lending board. Neighbours list tools, request to borrow them for a date range, and get automated notifications and overdue reminders through n8n.

Stack: Next.js (App Router) · TypeScript · Clerk · Convex · n8n (self-hosted in Docker)

---

## Brief checklist

Every requirement from the brief, and where to find it.

| Requirement | Where |
|---|---|
| Public page: tagline, read-only tool list (name + category only), "Sign in to lend or borrow" | `app/page.tsx`, `tools.listPublic` returns only `_id`, `name`, `category` |
| List a tool (name, category, condition, description) | `features/tools/ToolForm.tsx`, `tools.create` |
| Request to borrow for a date range | `features/tools/BorrowDialog.tsx`, `loans.request` (≤ 30 days, ≤ 90 days ahead, no overlaps) |
| Approve / decline own requests, mark returned | `features/loans/LoanCard.tsx`, `loans.approve` / `decline` / `markReturned` |
| All tools with availability, filter by category | `/tools`, `tools.browse` |
| My listings / My requests / Incoming requests | `/listings`, `/requests`, `/incoming` |
| Roles: admin removes any listing, views all loans, marks Trusted Lender | `/admin`, `convex/admin.ts` (every function calls `requireAdmin`) |
| Users act only on their own listings, requests and borrowing | `convex/domain/permissions.ts`, called from every service; covered by `tests/convex/permissions.test.ts` |
| RBAC enforced in Convex, not only the UI | Admin role comes only from the server-side `ADMIN_EMAILS`; UI gates are convenience only |
| n8n workflow 1: request notification via webhook, minimal fields | `n8n/workflows/request-notification.json`, payload: event type, loan id/status/dates, tool name, recipient name + email |
| n8n workflow 2: daily overdue reminders, fetch from Convex HTTP endpoint, write status back | `n8n/workflows/overdue-reminders.json`, `convex/http.ts` (`/n8n/overdue-loans`, `/n8n/reminders`) |
| HMAC signatures, verified on both sides | `convex/lib/hmac.ts`, n8n "Verify signature" nodes; timestamp + raw body, constant-time compare, 5-minute window, one secret per direction |
| Secrets only in env vars, never in code or exported JSON | Convex env + n8n container env (`$env`); exported workflows contain none |
| Idempotent write-backs | Reminders keyed `loanId:date` (unique), n8n dedupes event ids |
| Retries + error workflow, failures visible | Outbox retries with backoff, cron sweep, n8n error workflow → `/n8n/errors` → Admin "Automation health" with Retry |
| (Bonus) Automation activity on each loan | `features/loans/ActivityList.tsx` ("Reminder sent 2 days ago") |
| README: setup incl. n8n + docker-compose, env vars, architecture, security decisions | This file, `docker-compose.yml` |
| Production note | [PRODUCTION.md](PRODUCTION.md) |

**Beyond the brief.** After the core requirements I added features a real neighbourhood app would need: photos, pickup locations with directions, in-app messaging, a notification centre, "notify me when it's back", a Wanted board, a Guide and About page, and an optional AI assistant. Each follows the same rules as the core: permissions checked in Convex, only the data each step needs, and tests. They're described in the sections below.

---

## Features

**Public page**: tagline, a read-only list of available tools (name and category only, no owner details), and a "Sign in to lend or borrow" button.

**Signed-in users can:**
- list a tool (name, category, condition, description), and edit or delete their own listings
- request to borrow a tool for a date range, or cancel their own pending request
- approve or decline requests on their own tools, and mark a loan as returned
- browse all tools with availability status, filtered by category
- use the **My listings**, **My requests** and **Incoming requests** views
- see recent automation activity on each loan, e.g. "Reminder sent 2 days ago"
- add up to **4 photos** to a listing (drag and drop or pick files; the first is the cover)
- post on the **Wanted** board when nobody has listed what they need ("Screwdriver set"); neighbours tap **I have one** to offer theirs, and the poster is notified if a matching tool is listed later
- **message** a tool's owner, or the other person on a loan, in the app (Messages page)
- get **notifications** in the bell for requests, approvals, returns and messages, plus an email
- tap **Notify me when it's back** on a tool that's on loan, and get a notification and email when it's returned
- ask the **AI assistant** (the ✨ button) to find a tool for a job, check their requests, or draft a listing or a note to a neighbour
- add a **pickup location** to a listing (address search, "Use my location", or click and drag a pin on the map)
- open any tool to see its details and pickup spot on a map, then **Open in Google Maps** for the route and distance
- sort Browse by **Near me** (distance is worked out in the browser; the user's position is never sent or stored)

**Anyone (signed in or not)** can read the **Guide** (`/guide`, a step-by-step walkthrough with safety tips and FAQ) and **About** (`/about`) pages.

**Admins can:**
- remove any listing
- view all loans
- mark a user as a Trusted Lender
- see failed notifications and n8n errors, and retry failed notifications

---

## Architecture

```
 Browser (Next.js + Clerk)
     │  Convex client (typed queries / mutations, live updates)
     ▼
 Convex ──────────────────────────────────────────────────────────────┐
  api functions   tools.ts · loans.ts · users.ts · admin.ts           │
       │             (thin: check who is calling, call a service)     │
  services        toolService · loanService · outboxService · …       │
       │             (use cases: load → apply domain rules → save)    │
  domain          loan.ts · permissions.ts · tool.ts                  │
       │             (pure rules: status changes, dates, access)      │
  repositories    one per table; the only code that touches ctx.db    │
                                                                       │
  outbox table ── deliver action ──(signed POST)──►  n8n workflow 1   │
                      ▲  retries with backoff         loan notifications
                      └── cron sweep every 5 min                       │
                                                                       │
  http.ts  ◄──(signed POST)── n8n workflow 2: daily overdue reminders │
           ◄──(signed POST)── n8n workflow 3: error handler           │
 ──────────────────────────────────────────────────────────────────────┘
```

### Folder layout

| Path | What lives there |
|---|---|
| `convex/schema.ts` | Tables and indexes. Convex applies changes automatically on deploy, so there is no separate migration step. |
| `convex/domain/` | Pure business rules with no database access: loan status transitions, date validation, permission checks. |
| `convex/repositories/` | Data access, one file per table. Services never call `ctx.db` directly. |
| `convex/services/` | Use cases (`requestLoan`, `approve`, `enqueueLoanEvent`, …). |
| `convex/*.ts` | Public functions the browser calls (`tools`, `loans`, `users`, `admin`), plus internal ones (`outbox`, `automation`), `http.ts` (n8n endpoints), `crons.ts` and `seed.ts`. Convex names functions after their file, which is why these sit at the top level. |
| `convex/lib/` | HMAC signing, current-user lookup, environment variables. |
| `tests/convex/` | Vitest (kept outside `convex/` so Convex does not bundle them) + convex-test: access rules, loan rules, outbox, reminders, HMAC. |
| `app/` | Routes only. Each page is a few lines that compose features. |
| `features/` | UI grouped by feature (`tools`, `loans`, `admin`, `auth`), each with a `hooks.ts` data layer. Components never call Convex directly. |
| `shared/` | UI primitives, providers, formatting helpers. |
| `n8n/workflows/` | Exported workflows. They contain no secrets. |
| `proxy.ts` | Clerk route protection (Next.js 16 renamed `middleware.ts` to `proxy.ts`). |

### Data model

| Table | Purpose |
|---|---|
| `users` | Created on first sign-in from the Clerk identity. Fields: role (`admin` / `user`), `trustedLender`. |
| `tools` | Listings, with an optional `location` (lat, lng, label) and up to 4 photo storage ids (`images`, cover first). Deleting is a soft delete (`removedAt`), so loan history keeps the tool name. |
| `loans` | `requested → approved → returned`, or `requested → declined / cancelled`. Dates are `YYYY-MM-DD` in UTC, inclusive. |
| `outbox` | Loan events waiting for n8n, with status, attempt count, next attempt time and last error. |
| `reminders` | Overdue reminders written back by n8n. `idempotencyKey = loanId:date` is unique. |
| `automationErrors` | Failures reported by the n8n error workflow. |
| `conversations`, `messages` | Private chats between two users, one per pair and tool. Read markers drive unread badges and emails. |
| `notifications` | The bell: one row per notification. Repeated messages in one chat update a single row. |
| `wanted` | Wanted-board posts: what someone needs, optional category and date, open for 30 days or until closed. |
| `watches` | "Notify me when it's back" requests, removed once the watcher has been told. |
| `assistantMessages`, `assistantThreads` | Each user's AI assistant conversation, stored exactly as exchanged with the model, and whether a reply is in progress. |

---

## How the integration works

### Convex → n8n: loan events (transactional outbox)

1. When a loan changes (requested, approved, declined, cancelled or returned), the same mutation also inserts an `outbox` row. Both are saved, or neither is.
2. A background action claims the row, signs the payload and POSTs it to the n8n webhook.
3. On a 2xx response, the row is marked `sent`. On a failure or timeout, it retries after 30 s, 2 min, 10 min and 30 min. After 5 failed attempts it is marked `failed` and shown on the Admin page with a **Retry** button.
4. A cron job runs every 5 minutes and re-schedules any due row whose delivery was lost.
5. Each event has an `eventId`. n8n keeps recent ids, so a re-delivered event doesn't notify anyone twice.

The payload contains only the fields the notification needs: event type, loan id, status and dates, tool name, and the recipient's name and email.

### n8n → Convex: overdue reminders

1. Every day at 09:00 UTC (or via **Run now** in n8n), the workflow POSTs to `/n8n/overdue-loans`.
2. Convex returns approved loans past their end date that haven't been reminded today, with only the borrower's name and email, the tool name and the end date.
3. n8n sends one reminder per loan. The channel is a logged mock notification.
4. n8n writes each result back to `/n8n/reminders` with `idempotencyKey = loanId:date`. Convex stores each key once, so a retried write-back returns `{"created": false}` instead of creating a duplicate.

### Request signing (both directions)

- Signature: `HMAC-SHA256(secret, "<unix timestamp>.<raw body>")`, sent as `x-lendloop-signature: sha256=<hex>` with `x-lendloop-timestamp`.
- The receiver recomputes the signature over the **raw** body and compares it in constant time.
- Requests more than 5 minutes old are rejected.
- Each direction has its own secret: `WEBHOOK_SECRET_TO_N8N` and `WEBHOOK_SECRET_FROM_N8N`.
- Secrets live in Convex environment variables and in n8n's container environment, read with `$env`. They never appear in code or in the exported workflow JSON.

### Failure visibility

- n8n HTTP nodes retry 3 times, 5 s apart.
- All three workflows point to **LendLoop - Error handler**. It logs the failure and reports it, signed, to `/n8n/errors`, which shows on the Admin page under **Automation health**.
- Failed outbox events also show there.

---

### Messages, notifications and "notify me"

- Anyone signed in can message a tool's owner (tool details, **Message owner**), and either side of a loan can message the other (**Message** on the loan card). Only the two people in a conversation can read or write it.
- Every loan change, new message and "available again" event creates an in-app notification and an email in the **same mutation** that caused it. Emails go through the same outbox and n8n workflow as loan emails (event types `message.received`, `tool.available` and `wanted.match`).
- Message emails work like LinkedIn's: one email when a conversation goes from read to unread, not one per message. The bell groups messages per conversation the same way.
- Limits: messages up to 2,000 characters, at most 30 per conversation every 10 minutes.

### Wanted board

- Anyone signed in can post up to 5 open requests (title, optional details, category and "needed by" date). Posts expire after 30 days.
- **I have one** opens a chat with the person who asked and sends a first message, so they get a notification and an email. Chats remember which request they're about.
- When a tool is listed, it's matched against open requests by keyword (filler words and plurals ignored, category respected). People whose request it matches get a notification and a `wanted.match` email.
- A search on Browse that finds nothing offers to post a request for it, and the assistant suggests the board when nothing fits.

### Photos

- The browser asks Convex for a one-time upload URL (`tools.generateUploadUrl`, signed-in users only) and uploads the file straight to Convex storage.
- On save, the server checks every photo again: at most 4, no duplicates, JPG/PNG/WebP/GIF only, 5 MB each.
- Removing a photo while editing deletes its file. A daily cron (`storage.cleanupOrphanImages`) deletes uploads that never ended up on a listing after a day.
- The public landing page shows no photos, only name and category.

### AI assistant

- A chat panel for signed-in users, backed by an AI model in a Convex Node action (`convex/assistantAgent.ts`).
- Claude gets two **read-only** tools: `search_tools` (the same data the Browse page shows) and `get_my_activity` (the user's own requests and listings). It can't create, change or cancel anything.
- Listing text written by other users is treated as data, not instructions. Each user gets 20 questions an hour and 30 per chat.
- **Crisis safety:** messages about suicide, self-harm or hurting someone are caught before any AI model sees them (`convex/domain/safety.ts`) and get a fixed, human-written reply with emergency numbers and helplines. The model's instructions cover subtler wording.
- **What it can see:** only the Browse page's data and the user's own activity. Tests check it never returns emails or coordinates.
- The conversation is stored exactly as exchanged with the API and replayed unchanged on the next turn.
- **Provider:** Google Gemini (`gemini-3.5-flash-lite`) on the free tier when `GEMINI_API_KEY` is set (create a key at Google AI Studio), otherwise Claude when `ANTHROPIC_API_KEY` is set. `AI_PROVIDER=gemini|anthropic` forces one, and `GEMINI_MODEL` overrides the model name. Set them with `npx convex env set ...`. Without a key, the panel says the assistant isn't set up. Google may use free-tier conversations to improve its products.

### Tool locations and directions

- Maps are [OpenStreetMap](https://www.openstreetmap.org) tiles drawn with [Leaflet](https://leafletjs.com). No API key or billing is needed.
- Address search uses OpenStreetMap's Nominatim service, and only runs when the user presses Enter.
- **Open in Google Maps** opens `https://www.google.com/maps/dir/?api=1&destination=lat,lng`, which needs no key. Google Maps shows the route and distance from wherever the user is.
- **Who sees a location:** signed-in users, so they can judge distance before asking. The public landing page never includes it (`tools.listPublic` returns name and category only). Coordinates are rounded to about a metre, and the form suggests a nearby corner or gate rather than a front door.
- **Near me** asks the browser for its position only when clicked. Distances and sorting happen in the browser; the position is never sent to the server.
- Tests: `tests/convex/location.test.ts`.

---

## Local setup

Prerequisites: Node 20+, Docker Desktop, and a free [Clerk](https://clerk.com) account. Convex can run locally without an account.

### 1. Install

```bash
npm install
```

### 2. Clerk

1. Create a Clerk application.
2. In the Clerk dashboard, open **Integrations → Convex** and activate it. Copy the **Frontend API URL**, e.g. `https://xxx.clerk.accounts.dev`.
3. Copy the API keys into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

   Quicker for a first look: `npx clerk@latest init --framework next --accountless` writes temporary dev keys with no account. Convex can only read the sign-in once the app is claimed (`npx clerk@latest auth login`) and the Convex integration from step 2 is turned on.

   If the Convex integration isn't offered, create a JWT template named `convex` instead (Clerk dashboard → **JWT templates**) with these claims: `{"aud": "convex", "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}"}`. The app reads email and name from that token.

   **Troubleshooting sign-up:** if Clerk shows "For your security, this request could not be completed" or "The External Account was not found", the browser can't reach Clerk's bot-protection script at `cdn.protect.clerk.com` (some networks block parts of it). Try another network, or turn off Protect for the development instance in the Clerk dashboard.

### 3. Convex

```bash
npx convex dev
```

On first run this creates a deployment (choose **local** to run without an account) and writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Keep it running. In a second terminal, set the server variables:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://xxx.clerk.accounts.dev
npx convex env set ADMIN_EMAILS you@example.com
npx convex env set N8N_LOAN_EVENTS_WEBHOOK_URL http://127.0.0.1:5678/webhook/lendloop-loan-events
npx convex env set WEBHOOK_SECRET_TO_N8N <secret A>
npx convex env set WEBHOOK_SECRET_FROM_N8N <secret B>
npm run seed
```

Generate each secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

`npm run seed` adds 3 demo users, 6 tools, 1 pending request and 1 overdue loan. Running it again does nothing.

Dev helpers for testing both sides with one account. Call the CLI directly, because `npx convex run` can hang on some networks:

```bash
node node_modules/convex/bin/main.js run dev:demoRequest '{"email":"you@example.com"}'                      # a demo neighbour asks for your newest tool
node node_modules/convex/bin/main.js run dev:placeDemoToolsNear '{"lat":51.5072,"lng":-0.1276}'            # demo tools get pickup spots near a point
node node_modules/convex/bin/main.js run dev:demoRespond '{"email":"you@example.com","action":"approve"}'   # a demo lender answers your request
node node_modules/convex/bin/main.js run dev:demoReply '{"email":"you@example.com","text":"Saturday works!"}' # a demo neighbour replies in your newest chat
node node_modules/convex/bin/main.js run dev:demoWanted                                                      # Ben posts Wanted requests; Amira lists a matching ladder
node node_modules/convex/bin/main.js run dev:assistantAsk '{"email":"you@example.com","text":"..."}'         # ask the assistant from the CLI; read with dev:assistantChat
```

> **Networking note:** this setup assumes a **local** Convex deployment, so Convex can reach n8n at `127.0.0.1:5678` and n8n can reach Convex at `host.docker.internal:3211`. With a cloud Convex deployment, expose n8n through a tunnel (or n8n Cloud) and set `LENDLOOP_CONVEX_SITE_URL` to the deployment's `.convex.site` URL.

### 4. n8n

```bash
cp .env.example .env      # then fill N8N_ENCRYPTION_KEY and the same two secrets
npm run n8n:up
npm run n8n:import
docker compose exec n8n n8n publish:workflow --id=LLnotify00000001
docker compose exec n8n n8n publish:workflow --id=LLoverdue0000001
docker compose exec n8n n8n publish:workflow --id=LLerrors00000001
docker compose restart n8n
```

Open http://localhost:5678 to see the workflows and their executions. Mock notifications and reminders appear in `docker compose logs -f n8n` as `[LendLoop notify]` and `[LendLoop reminder]` lines.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 and sign in. The email in `ADMIN_EMAILS` gets the Admin page.

### Checks

```bash
npm test           # 59 tests: access rules, loan rules, outbox, idempotency, HMAC, locations, photos, messaging, notifications, Wanted board, assistant limits and crisis safety
npm run typecheck
npm run lint
npm run build
```

---

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Convex client URL (written by `npx convex dev`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | `.env.local` | Clerk |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Lets Convex verify Clerk tokens |
| `ADMIN_EMAILS` | Convex | Comma-separated admin emails; the role is set on each sign-in |
| `N8N_LOAN_EVENTS_WEBHOOK_URL` | Convex | n8n webhook for loan events |
| `WEBHOOK_SECRET_TO_N8N` | Convex + `.env` | Convex signs, n8n verifies |
| `WEBHOOK_SECRET_FROM_N8N` | Convex + `.env` | n8n signs, Convex verifies |
| `N8N_ENCRYPTION_KEY` | `.env` | Encrypts n8n's stored credentials |
| `LENDLOOP_CONVEX_SITE_URL` | `.env` | Convex HTTP actions URL as seen from the n8n container |
| `GEMINI_API_KEY` | Convex (optional) | Turns on the AI assistant with Google Gemini (free tier). Create at Google AI Studio |
| `GEMINI_MODEL` | Convex (optional) | Overrides the Gemini model, default `gemini-3.5-flash-lite` |
| `ANTHROPIC_API_KEY` | Convex (optional) | Runs the assistant on Claude instead, when no Gemini key is set |
| `AI_PROVIDER` | Convex (optional) | `gemini` or `anthropic` to force one when both keys are set |

---

## Security and data-minimisation decisions

Two rules guided everything: **check every rule on the server**, and **send each part of the system only the data it needs**.

**1. Rules are checked on the server, not just in the UI**
- Every Convex function first finds out who is calling (from the Clerk sign-in), then checks the rule in `convex/domain/permissions.ts`. For example: only the owner can edit a listing, only the lender can approve, only the borrower can cancel, and nobody can borrow their own tool.
- The UI only hides buttons. Calling a function directly gives the same answer as clicking. The tests prove this by calling functions as the wrong user.
- The admin role comes from the `ADMIN_EMAILS` setting on the server. The browser can't grant it.

**2. Each part gets only the data it needs**
- The public page gets only each tool's name and category.
- Signed-in users see an owner's name and Trusted Lender badge, never their email. Only admins see emails, on the Users tab.
- n8n gets only what a message needs: the event, the loan dates, the tool name, and the recipient's name and email.
- The AI assistant can only read what the Browse page shows, plus the user's own activity. It can't see emails, locations or other people's chats.
- "Near me" works out distances in the browser. The user's location is never sent to the server.
- Pickup locations are optional, and the form suggests a nearby corner or gate instead of a front door.

**3. Convex and n8n check each other**
- Every webhook call is signed (HMAC-SHA256). The receiver checks the signature and rejects requests older than 5 minutes, so an old request can't be replayed.
- Each direction has its own secret. If one leaks, the other direction is still safe.
- Secrets live only in environment variables. The exported n8n workflows contain none.

**4. Retries never create duplicates, and failures are never silent**
- A loan change and its notification are saved together in one step (an "outbox"), then sent to n8n with retries. n8n remembers recent events and skips repeats.
- Reminders are saved with a unique key (`loanId:date`), so a retried save doesn't create a second reminder.
- Anything that keeps failing shows up on the Admin page, with a Retry button.

**5. Input is checked and abuse is limited**
- The server checks text lengths, dates (loans up to 30 days, starting at most 90 days ahead), and photos (JPG/PNG/WebP/GIF, 5 MB, up to 4).
- Limits stop flooding: 30 messages per chat every 10 minutes, 20 assistant questions per hour, 5 open Wanted requests per person.
- Message emails go out once per unread chat, not once per message.

**6. The AI assistant is safe by design**
- Messages about suicide, self-harm or hurting someone are caught on the server before the AI sees them. They get a fixed reply with emergency numbers and helplines. I tested this with the live AI too.
- The assistant treats other users' text (tool names and descriptions) as information, never as instructions. It can only read; it can't change anything.

**7. Keeping history, not clutter**
- Deleting a listing hides it but keeps past loans readable. Pending requests for it are declined, and each borrower is told.
- Deleted photos are removed from storage. A daily job removes uploads that were never used.

What I'd still change is in [PRODUCTION.md](PRODUCTION.md).

---

## Production

See [PRODUCTION.md](PRODUCTION.md).

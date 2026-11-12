# What I would change to run this in production

The app is built to be correct and safe at small scale. Before real neighbours used it, I'd change these, roughly in this order.

## 1. Real delivery, hosted properly
- **Send real emails.** Swap the n8n "logged mock" node for an email provider node (Postmark, SES). The payload stays as small as it is now.
- **Host n8n behind HTTPS** (or use n8n Cloud), turn `N8N_SECURE_COOKIE` back on, and move n8n from SQLite to Postgres.
- **Keep secrets in n8n credentials** instead of letting Code nodes read environment variables (`N8N_BLOCK_ENV_ACCESS_IN_NODE` is off today for local simplicity).
- **Use the Convex cloud deployment** and expose the webhook on a long, non-guessable path in addition to the signature check.

## 2. Reliability at higher volume
- n8n remembers the last 500 event ids in workflow static data to skip repeats. At scale, store processed ids in a real table with a TTL.
- If event volume grows, put a managed queue (SQS, RabbitMQ) between the outbox and n8n, keeping the outbox table as the source of truth.
- **Monitoring and alerts:** page someone when outbox rows fail or stay pending for more than a few minutes, or when the n8n error workflow fires.

## 3. Security and privacy hardening
- **Secret rotation:** accept two signing secrets during a rotation window so keys can change without downtime.
- **Tool locations:** with open sign-up, show only an approximate area (a ~500 m circle) until a request is approved.
- **Admin roles in the app**, with an audit log of every admin action, instead of an env variable.
- **Retention:** delete delivered outbox rows, reminders, read notifications and old chats after a set period.
- **Rate limits on every mutation and the n8n endpoints**, not only on messages, the assistant and Wanted posts.
- **Clerk:** replace the deprecated `createRouteMatcher` in `proxy.ts` with checks in each page, and keep Clerk's bot protection on in production.
- **AI assistant:** use a paid model tier, so conversations aren't used for training, and add a monitored eval of crisis and privacy prompts that runs before each prompt change.

## 4. Product and operations
- **Timezones:** dates are UTC today. Store each user's timezone so "overdue" and the 09:00 reminder match their local day.
- **Maps:** the public OpenStreetMap tile server and Nominatim are for light use only; switch to a hosted provider (MapTiler, Stadia) with a one-line URL change.
- **Moderation:** let users report a listing or a message, and show reports on the Admin page.
- **CI/CD:** run typecheck, lint, tests and the build on every push, with preview deployments per pull request.

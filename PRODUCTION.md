# What I would change for production

The app works well at small scale. Before real neighbours used it, I'd make these changes, most important first.

## 1. Real emails and proper hosting
- **Send real emails.** Replace n8n's "logged mock" step with an email service (like Postmark or Amazon SES). The data sent stays the same.
- **Run n8n over HTTPS** (or use n8n Cloud), turn its secure cookies back on, and use Postgres instead of SQLite.
- **Store secrets in n8n's credential store** instead of reading environment variables in code steps (that's switched on now only to keep local setup simple).
- **Use a hosted Convex deployment**, and put the webhook on a hard-to-guess URL as well as checking the signature.

## 2. Handling more traffic
- n8n remembers the last 500 events to skip repeats. With more traffic, keep that list in a proper database table instead.
- If traffic grows a lot, add a queue (like SQS or RabbitMQ) between Convex and n8n. The outbox table stays the source of truth.
- **Alerts:** tell someone when notifications keep failing, wait too long, or the n8n error workflow runs.

## 3. Stronger security and privacy
- **Changing secrets safely:** accept both the old and new signing secret for a short time, so secrets can change with no downtime.
- **Pickup locations:** show only a rough area (about 500 m) until a request is approved.
- **Admins managed in the app**, with a log of every admin action, instead of an environment setting.
- **Delete old data:** remove sent notifications, old reminders and old chats after a set time.
- **Rate limits everywhere**, not only on messages, the assistant and Wanted posts.
- **Clerk:** replace the old `createRouteMatcher` in `proxy.ts` with checks in each page, and keep Clerk's bot protection on.
- **AI assistant:** use a paid AI plan so chats aren't used for training, and run a set of crisis and privacy test questions before every change to its instructions.

## 4. Product and operations
- **Timezones:** dates are in UTC today. Save each user's timezone so "overdue" and the 9 am reminder match their local day.
- **Maps:** the free OpenStreetMap servers are only for light use. Switch to a paid map provider (like MapTiler); it's a one-line change.
- **Reporting:** let people report a listing or a message, and show reports to admins.
- **Automatic checks:** run type checks, lint, tests and a build on every push, with a preview site for each change.

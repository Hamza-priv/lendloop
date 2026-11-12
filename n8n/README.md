# n8n workflows

| File | ID | What it does |
|---|---|---|
| `request-notification.json` | `LLnotify00000001` | Webhook `POST /webhook/lendloop-loan-events`. Verifies the HMAC signature on the raw body, skips events it has already handled, sends a mock notification and replies 200. A bad signature gets 401. If anything throws, n8n replies 500 and Convex retries. |
| `overdue-reminders.json` | `LLoverdue0000001` | Runs daily at 09:00 UTC (plus a manual "Run now" trigger). Fetches overdue loans from Convex, sends one mock reminder per loan, and writes each result back with an idempotency key. |
| `error-handler.json` | `LLerrors00000001` | Error workflow for both of the above. Logs the failure and reports it to Convex for the Admin page. |

## Import and publish

```bash
docker compose exec n8n n8n import:workflow --separate --input=/workflows
docker compose exec n8n n8n publish:workflow --id=LLnotify00000001
docker compose exec n8n n8n publish:workflow --id=LLoverdue0000001
docker compose exec n8n n8n publish:workflow --id=LLerrors00000001
docker compose restart n8n
```

The error handler must be published too, or n8n will not run it.

## Secrets

Workflows read secrets with `$env.LENDLOOP_SECRET_FROM_CONVEX` and `$env.LENDLOOP_SECRET_TO_CONVEX`. `docker-compose.yml` maps these from `.env`. The exported JSON contains no secret values.

## Run the reminder workflow from the command line

```bash
docker compose exec -e N8N_RUNNERS_BROKER_PORT=5690 n8n n8n execute --id=LLoverdue0000001
```

(The separate broker port avoids a clash with the running n8n instance.)

## Re-export after editing in the UI

```bash
docker compose exec n8n n8n export:workflow --all --separate --output=/tmp/export
docker compose cp n8n:/tmp/export/. n8n/workflows/
```

Check the files before committing: credentials and secrets must not appear in them.

# DEPLOYMENT.md — Railway + Vercel runbook

How to take EduNexa from this repo to a live, seeded API (`apps/api` on Railway)
+ web app (`apps/web` on Vercel). Everything infra-related is already committed
(`railway.toml`, `Dockerfile.api-render`); this file is the click-by-click path
to actually deploy it and unblock the database seed.

> **Why Railway?** The API is *always-on* — no free-tier sleep/cold starts, so
> every request hits a warm server. The **free trial needs no credit card**
> ($5 of usage credits for 30 days). **After the trial**: the `$0/mo` Free plan
> (~`$1` usage credit) only covers the API if it uses sleep-on-inactivity (small
> cold start) — for full 24/7 uptime you'd move to Hobby (`$5/mo`, needs a card)
> or a card-less always-on host such as Koyeb's free tier.

The seed (`apps/api/prisma/seed.ts`) is an idempotent, upsert-based upsert of the
full Class 10 SEE curriculum (7 subjects → chapters → topics → content blocks).
It can only be proven once a real Postgres exists. **Providing the Supabase
`DATABASE_URL` (step 2) is the single dependency that unblocks the whole deploy.**

Source of truth: GitHub repo `bijay-00/EduNexa` → `main`.

---

## 1. Railway account

Go to railway.com → **Sign up** (GitHub is fastest). No credit card required.

## 2. Create the Supabase Postgres (`DATABASE_URL`)

The schema/seed run against **Supabase** (managed Postgres).

1. Go to supabase.com → **New project** → pick a region (any) → set a DB
   password → **Create project**.
2. Project dashboard → **Connect → Connection string** → copy the
   **pgBouncer / transaction-pooler** string (`postgresql://…:6543/…`). Port
   **6543** is reliable; the direct `:5432` host can be flaky (IPv6-only).
3. Save it — this is your **`DATABASE_URL`** secret. Do not commit it.

> Save for later:
> - `DATABASE_URL` → from this step
> - `JWT_SECRET` → your own random value ≥16 chars

## 3. Redis (`REDIS_URL`) — optional

The API **boots fine without Redis** (verified: `/ready` reports `redis: down`
but health/curriculum stay 200). Only the AI question-generator needs it.

- Set `REDIS_URL=redis://localhost:6379` (unused) or omit it for now.
- To add later: Upstash free tier → copy `REDIS_URL` → redeploy.

## 4. Deploy the API on Railway

`railway.toml` at the repo root builds the existing `Dockerfile.api-render`,
exposes the app on port 3000, and uses `/api/v1/health` as the health check.
Railway services never scale to zero, so the API is warm on every request.

The container runs `prisma db push` + `prisma db seed` on first boot, then
starts the API.

**CLI (fastest):**

```bash
# one-time
npm i -g @railway/cli
railway login            # opens a browser — no card needed
# from the repo root
railway init             # select "create a new project" (or link an existing one)

# set the secrets (steps 2–3)
railway variables --set DATABASE_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:6543/postgres?sslmode=require"
railway variables --set JWT_SECRET="<random >= 16 chars>"
railway variables --set REDIS_URL="redis://localhost:6379"

# deploy
railway up
```

**Dashboard (no CLI):**

1. railway.com → **New Project** → **Deploy from GitHub repo** → pick `EduNexa`
   / `main`. Railway auto-detects `railway.toml` and builds the Dockerfile.
2. Project → **Variables** → add `DATABASE_URL`, `JWT_SECRET`, and
   `REDIS_URL` (the three values above).
3. Railway deploys automatically. Monitor the build log for `Seed complete.`

Get your URL: `railway domain` (trial gets `*.up.railway.app`; the free plan
allows one custom domain if you have one).

## 5. Verify the API is live + seeded

Once the service reports healthy:

```bash
curl https://<your-api>.up.railway.app/api/v1/health
curl https://<your-api>.up.railway.app/api/v1/curriculums
```

Expected:
- `/api/v1/health` → `200 {"data":{"status":"ok",...}}`
- `/api/v1/curriculums` → includes `NEP-GRADE10` ("Nepal Grade 10 Curriculum")
- Boot log shows `Curriculum ready: …` then `Seed complete.`

If the seed errored, the API fails fast (seed failure is fatal) — inspect the
log for the failed upsert / connection string.

## 6. Point Vercel at the live API

`apps/web` proxies `/api/v1/*` upstream via `API_UPSTREAM` (the Next.js rewrite
in `apps/web/next.config.ts` handles it server-side — no CORS, no
`NEXT_PUBLIC_API_URL` needed).

1. Vercel → project `edunexa` (team `bijay-00`) → **Settings → Environment
   Variables** → set:
   - `API_UPSTREAM` → `https://<your-api>.up.railway.app`
2. **Redeploy** (or push to `main` — Vercel auto-deploys since it's git-linked
   when author permissions allow).

## 7. Updating after this

- **API / seed / schema change**: push to `main` (or `railway up`) → Railway
  rebuilds, re-runs `db push` + `db seed`, and boots. Idempotent upserts mean
  re-seeding is always safe.
- **Web change**: push to `main` → Vercel auto-deploys.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| API crashes at boot, log mentions Redis | `REDIS_URL` unreachable | remove the var or set a reachable Upstash URL (AI features need it) |
| `DATABASE_URL` connection refused | wrong/other-instance URL | use the pooler string (port `6543`); ensure the Supabase project isn't paused |
| Seed `P2002` unique violation | none normally — seed is upsert-based | check you ran `db push` first (start command does) |
| Web can't reach API | env empty on Vercel | set `API_UPSTREAM` (step 6), Redeploy |
| Trial credits gone after 30 days | trial window elapsed | switch to the **Free** plan (`$0/mo`, ~$1 usage credit) or Hobby `$5/mo` |
| Vercel deploy blocked (git author) | author-gate on Vercel git integration | use `vercel deploy --prod` CLI with a token, or add author |

---

## Remaining hardening (Phase 8, post-MVP)

- Replace `prisma db push` with committed migrations (`prisma migrate dev`).
- Add real JWT rotation/rate limiting on the API.
- Move Postgres/DB off free plans before production traffic.
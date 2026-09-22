# DEPLOYMENT.md — Render + Vercel runbook

How to take EduNexa from this repo to a live, seeded API (`apps/api` on Render)
+ web app (`apps/web` on Vercel). Everything infra-related is already committed
(`render.yaml`, `Dockerfile.api-render`); this file is the click-by-click path
to actually deploy it and unblock the database seed.

The seed (`apps/api/prisma/seed.ts`) is an idempotent, upsert-based upsert of the
full Class 10 SEE curriculum (7 subjects → chapters → topics → content blocks).
It can only be proven once a real Postgres exists. **Providing the Render
Postgres `DATABASE_URL` is the single dependency that unblocks the whole deploy.**

Source of truth: GitHub repo `bijay-00/EduNexa` → `main`.

---

## 1. Render account + API token (one-time)

- Create/confirm a **Render** account. Free tier is fine.
- Optional but recommended: generate a **Render API token** (`Account → API Keys
  → New API Key`) if you want the API deploy from the CLI instead of the
  dashboard. Not required — the dashboard path below needs no token.

## 2. Create the Supabase Postgres (`DATABASE_URL`)

The schema/seed run against **Supabase** (managed Postgres) — the Render
blueprint no longer provisions its own Postgres.

1. Go to supabase.com → **New project** → pick a region near your Render region
   (e.g. Oregon) → set a DB password → **Create project**.
2. Project dashboard → **Connect** → **Connection string** → copy the
   **pgBouncer / transaction-pooler** string (`postgresql://…:6543/…`). This is
   your **`DATABASE_URL`**. Keep it; you need it in section 4. Do **not** commit
   it — it is a secret.

> Save these for later:
> - `DATABASE_URL` → from this step
> - `REDIS_URL` → from step 3
> - `JWT_SECRET` → Render will generate, or make your own ≥16 chars

## 3. Create the Upstash Redis (`REDIS_URL`)

The API boots a BullMQ producer (`new Redis(REDIS_URL)`) and **crashes at boot
if Redis is unreachable** — so a reachable Redis is mandatory.

1. Sign up at upstash.com → **Create Database** → pick a region near your Render
   region (e.g. Oregon) → **Free** plan.
2. Open the database → **Connect / REST API** tab → copy **`REDIS_URL`**
   (`redis://default:<password>@<host>:<port>`). This works with the `ioredis`
   client the API uses.

## 4. Deploy the API via the Render blueprint

`render.yaml` declares the API Docker web service. Its `DATABASE_URL` points at
the Postgres from step 2 alert, and the container start command runs:

```
npx prisma db push   # create/migrate schema (idempotent)
npx prisma db seed   # upsert full curriculum (idempotent)
node dist/main.js    # boot the NestJS API
```

1. Render dashboard → **New** → **Blueprint** → select the `EduNexa` repo, branch
   `main`.
2. The blueprint provisions the `api` web service. During creation, link its
   `DATABASE_URL` to **your** step-2 database (pick "existing DB" if offered, not
   a second provision) — or copy your `DATABASE_URL` into the service's env.
3. Add the two `sync: false` env vars the blueprint flags:
   - **`REDIS_URL`** → paste from step 3.
   - **`JWT_SECRET`** → Render-generated (≥16 chars).
4. **Deploy**. Watch the service build logs.

## 5. Verify the API is live + seeded

Once the service reports *Live*:

```bash
curl https://<your-api>.onrender.com/health
curl https://<your-api>.onrender.com/api/v1/curriculum/grades
```

Expected:
- `/health` → `200`
- `/api/v1/curriculum/grades` → grade `10` ("Class 10")
- Boot log shows `Curriculum ready: …` then `Seed complete.`

If the seed errored, the API fails fast (seed failure is fatal) — inspect the
log for the failed upsert / connection string.

## 6. Point Vercel at the live API

`apps/web` proxies `/api/v1/*` upstream via `NEXT_PUBLIC_API_URL` and
`API_UPSTREAM`.

1. Vercel → project `edunexa` (team `bijay-00`) → **Settings → Environment
   Variables** → set:
   - `NEXT_PUBLIC_API_URL` → `https://<your-api>.onrender.com`
   - `API_UPSTREAM` → `https://<your-api>.onrender.com`
2. **Redeploy** (or push to `main` — Vercel auto-deploys since it's git-linked
   when author permissions allow).

## 7. Updating after this

- **API / seed / schema change**: push to `main` → Render re-runs `db push` +
  `db seed` + boots. Idempotent upserts mean re-seeding is always safe.
- **Web change**: push to `main` → Vercel auto-deploys.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| API crashes at boot, log mentions Redis | `REDIS_URL` missing/unreachable | set Upstash URL (step 3), Redeploy |
| `DATABASE_URL` connection refused | wrong/other-instance URL | use the instance's **External** URL; ensure *Available* |
| Seed `P2002` unique violation | none normally — seed is upsert-based | check you ran `db push` first (start command does) |
| Web can't reach API | env empty on Vercel | set `NEXT_PUBLIC_API_URL` + `API_UPSTREAM` (step 6), Redeploy |
| Vercel deploy blocked (git author) | author-gate on Vercel git integration | use `vercel deploy --prod` CLI with a token, or add author |

---

## Remaining hardening (Phase 8, post-MVP)

- Replace `prisma db push` with committed migrations (`prisma migrate dev`).
- Add real JWT rotation/rate limiting on the API.
- Move Postgres/DB off free plan before production traffic.

# DEPLOYMENT.md — Google Cloud Run / Render + Vercel runbook

How to take EduNexa from this repo to a live, seeded API (`apps/api` on **Google
Cloud Run** — fast, near-zero cold start — or Render) + web app (`apps/web` on
Vercel). Everything infra-related is committed (`Dockerfile.api-render`, and
`render.yaml` if you prefer Render); this file is the click-by-click path to
deploy it and unblock the database seed.

> **Which host?** Use **Cloud Run** if you want speed. It cold-starts in
> ~300 ms (vs. Render free tier, which sleeps after ~15 min and costs ~50 s on
> the next visit), and it always serves from a warm instance. The deploy steps
> below default to Cloud Run; the Render path (step 4b) is kept as a fallback.

The seed (`apps/api/prisma/seed.ts`) is an idempotent, upsert-based upsert of the
full Class 10 SEE curriculum (7 subjects → chapters → topics → content blocks),
run at container startup. **Providing the Supabase `DATABASE_URL` (step 2) is
the single dependency that unblocks the whole deploy.**

Source of truth: GitHub repo `bijay-00/EduNexa` → `main`.

---

## 1. Google Cloud prerequisites (one-time)

1. Go to `console.cloud.google.com` → sign up (free tier; needs a card for
   billing but the Run/Build free tiers are generous).
2. Create a **project** (e.g. `edunexa`).
3. Enable APIs: **Cloud Run**, **Cloud Build** (+ Artifact Registry).
4. Recommended: install the `gcloud` CLI (steps below use it — fastest path).
   - Windows installer: https://cloud.google.com/sdk/docs/install
   - Then: `gcloud auth login` and `gcloud config set project <your-project-id>`

## 2. Create the Supabase Postgres (`DATABASE_URL`)

1. Go to supabase.com → **New project** → pick a region (`us-west1`/Oregon to
   sit near Cloud Run's `us-west1`) → set a DB password → **Create project**.
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

- To add later: Upstash free tier → copy `REDIS_URL` (`redis://default:…@…`)
  → redeploy with it.
- For now, deploy with `REDIS_URL=redis://localhost:6379` (unused) or omit it.

## 4. Deploy the API

### 4a. On Google Cloud Run (recommended — fast)

The container runs `prisma db push` + `prisma db seed` on first boot, then
starts the API on port 3000 (`process.env.PORT`). The Dockerfile is
`infrastructure/docker/Dockerfile.api-render`.

**CLI (fastest):**

```bash
cd <repo-root>

gcloud run deploy edunexa-api \
  --source . \
  --dockerfile infrastructure/docker/Dockerfile.api-render \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars PORT=3000 \
  --set-env-vars DATABASE_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:6543/postgres?sslmode=require" \
  --set-env-vars REDIS_URL="redis://localhost:6379" \
  --set-env-vars JWT_SECRET="<random >= 16 chars>"
```

- `--allow-unauthenticated` → public URL (Vercel can call it). Remove it if you
  lock it down behind IAM later.
- First deploy builds via Cloud Build and pushes to Artifact Registry
  automatically. Subsequent deploys reuse the cache.
- Zero cold starts (optional): add `--min-instances 1` — keeps one instance
  always warm at a small cost. Even at `0` the default cold start is ~300 ms.

**Web console (no CLI):**

1. `console.cloud.google.com` → **Cloud Build** → *Build image from the repo*
   (`infrastructure/docker/Dockerfile.api-render`) *or* push an image built
   locally to Artifact Registry.
2. **Cloud Run** → **Create service** → pick the image + region → **Container /
   Variables** tab →
   - Add `PORT=3000`, `NODE_ENV=production`
   - Add the three env vars above
   - *VARIANT switch to* **Deploy a revision from a source repository** if you
     prefer Cloud Run to build the Dockerfile directly
3. **Ingress → Allow all** (so Vercel's server-side proxy can reach it), **Allow
   unauthenticated invocations** → **Create**.
4. The service URL is `https://<service>-<hash>.run.app`.

### 4b. On Render (fallback, has sleep/cold starts)

`render.yaml` declares the API Docker web service. Its `DATABASE_URL` points at
the Postgres from step 2, and the container start command runs:

```
npx prisma db push   # create/migrate schema (idempotent)
npx prisma db seed   # upsert full curriculum (idempotent)
node dist/main.js    # boot the NestJS API
```

1. Render dashboard → **New** → **Blueprint** → select the `EduNexa` repo, branch
   `main`.
2. The blueprint provisions the `api` web service. Link its `DATABASE_URL` to the
   step-2 Supabase database (or copy the string into the service env).
3. Add the `sync: false` env vars the blueprint flags:
   - **`REDIS_URL`** → from step 3 (or leave default if skipping Redis).
   - **`JWT_SECRET`** → Render-generated (≥16 chars).
4. **Deploy**. Watch the service build logs.

## 5. Verify the API is live + seeded

Once the service reports healthy:

```bash
curl https://<service>-<hash>.run.app/api/v1/health      # Cloud Run
curl https://<your-api>.onrender.com/api/v1/health       # Render
curl https://<service>-<hash>.run.app/api/v1/curriculums
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
   - `API_UPSTREAM` → `https://<service>-<hash>.run.app` (Cloud Run)
     or `https://<your-api>.onrender.com` (Render)
2. **Redeploy** (or push to `main` — Vercel auto-deploys since it's git-linked
   when author permissions allow).

## 7. Updating after this

- **API / seed / schema change**: push to `main` → `gcloud run deploy` re-runs
  `db push` + `db seed` and boots. Idempotent upserts mean re-seeding is always
  safe. (Render rebuilds automatically from `main`.)
- **Web change**: push to `main` → Vercel auto-deploys.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `gcloud run deploy` build fails | Cloud Build not enabled / registry blocked | enable **Cloud Build** + **Artifact Registry**, re-run |
| API crashes at boot, log mentions Redis | `REDIS_URL` unreachable | remove the var or set a reachable Upstash URL (AI features need it) |
| `DATABASE_URL` connection refused | wrong/other-instance URL | use the pooler string (port `6543`); ensure the Supabase project isn't paused |
| Seed `P2002` unique violation | none normally — seed is upsert-based | check you ran `db push` first (start command does) |
| Web can't reach API | env empty on Vercel | set `API_UPSTREAM` (step 6), Redeploy |
| API slow on Render free tier / first visit stalls | Render sleeps the service; **prefer Cloud Run or add a keep-awake pinger** | hit `/api/v1/health` every ~10 min (e.g. cron-job.org), or move to Cloud Run |
| 403 on Cloud Run URL from Vercel | unauthenticated invocations disabled | redeploy with `--allow-unauthenticated` (dev) or grant IAM `run.invoker` |
| Vercel deploy blocked (git author) | author-gate on Vercel git integration | use `vercel deploy --prod` CLI with a token, or add author |

---

## Remaining hardening (Phase 8, post-MVP)

- Replace `prisma db push` with committed migrations (`prisma migrate dev`).
- Move env vars/secrets into GCP **Secret Manager** (`--set-secrets`).
- Add real JWT rotation/rate limiting on the API.
- Move Postgres/DB off free plans before production traffic.
# DEPLOYMENT.md — Railway + Vercel runbook

How to take EduNexa from this repo to a live, seeded API (`apps/api` on Railway)
+ web app (`apps/web` on Vercel). Everything infra-related is already committed
(`Dockerfile.api-render`); this file is the click-by-click path to actually
deploy it and unblock the database.

> **Why Railway?** The API is *always-on* — no free-tier sleep/cold starts, so
> every request hits a warm server. The **free trial needs no credit card**
> ($5 of usage credits for 30 days). **After the trial**: the `$0/mo` Free plan
> (~`$1` usage credit) only covers the API if it uses sleep-on-inactivity (small
> cold start) — for full 24/7 uptime you'd move to Hobby (`$5/mo`, needs a card)
> or a card-less always-on host such as Koyeb's free tier.

Source of truth: GitHub repo `bijay-afk/EduNexa` → `main`.
Production API: `https://api-production-836b.up.railway.app`.

---

## 1. Railway account

Go to railway.com → **Sign up** (GitHub is fastest). No credit card required.

## 2. The Supabase Postgres (`DATABASE_URL`)

The schema/data live in **Supabase** (managed Postgres).

1. supabase.com → **Project → Connect → Connection string** → copy the
   **Transaction pooler** string on port **6543**
   (`postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres`).
   Use this exact shape — the direct `db.<ref>.supabase.co` host is IPv6-only
   and routes fail from Railway (and many home networks).
2. For Prisma to work through the transaction pooler you **must** append:
   `?pgbouncer=true&connection_limit=1`
3. Final value (example — never commit it):

```
postgresql://postgres.xrhdakmfgmenijovvhfl:<pw>@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

> Verify it: `npx prisma db execute` / a quick script that connects with the
> Prisma client and runs a count against `User`. Confirmed working from both a
> home connection and the Railway container (connect ~800ms).

## 3. Apply schema + seed (once, locally)

The production image does **not** run `prisma db push`/`db seed` at boot:
`prisma db push` is DDL, hangs indefinitely through the transaction pooler, and
re-running a heavy seed on every deploy is wasteful. Schema + seed are applied
once from your machine:

```bash
# from repo root (uses apps/api/.env, already on the pooler URL)
npm run db:push     # or: npx prisma db push --schema apps/api/prisma/schema.prisma
npm run db:seed     # or: npx prisma db seed --schema apps/api/prisma/schema.prisma
```

The seed is idempotent (upserts); re-running is safe. You're done with the DB
once `npx prisma studio` shows `NEP-GRADE10` + 7 subjects.

## 4. Deploy the API on Railway

`Dockerfile.api-render` builds the API and boots with `node dist/main.js`
(healthcheck `/api/v1/health`, published port **3000**). Those two settings are
the ones that make Railway treat a deploy as healthy — with neither, deploys
silently FAIL with no logs and the domain returns 502.

**CLI (fastest):**

```bash
# one-time
npm i -g @railway/cli
railway login            # opens a browser — no card needed
# from the repo root
railway init             # create a new project, or link an existing one

# secrets (steps 2–3)
railway variables --set DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
railway variables --set JWT_SECRET="<random >= 16 chars>"
railway variables --set REDIS_URL="redis://localhost:6379"   # optional, see §5

# one-time service config: root ".", Dockerfile, no startCommand override
railway api -f infrastructure/docker/railway-service.graphql   # see note below

# deploy
railway up
```

> **Railway service config (`railway-service.graphql`)** — the repo ships a
> GraphQL mutation at `infrastructure/docker/railway-service.graphql` that sets
> `rootDirectory: "."`, `dockerfilePath`, clears `startCommand` (so the
> Dockerfile `CMD` wins), sets healthcheck `/api/v1/health`, and publishes
> `targetPort: 3000`. Run it once per new service/environment:
> `railway api -f infrastructure/docker/railway-service.graphql`

**Dashboard (no CLI):**

1. railway.com → **New Project** → **Deploy from GitHub repo** → pick `EduNexa`
   / `main`.
2. **Deploy → Settings**: Service source = Dockerfile
   `infrastructure/docker/Dockerfile.api-render`, **Root directory** = `.`;
   leave Start Command **empty**. **Healthcheck path** = `/api/v1/health`.
   Under **Networking**, publish the service domain on port **3000**.
3. Add the three variables above. Railway deploys automatically.

Verify it's actually healthy (not just "SUCCESS"): the public domain must answer:
`curl https://<your-api>.up.railway.app/api/v1/health` → `200`.

## 5. Redis (`REDIS_URL`) — optional

The API **boots fine without Redis** (health/curriculum stay 200). Only the AI
question-generator needs it.

- Set `REDIS_URL=redis://localhost:6379` (unused) or omit it for now.
- To add later: Upstash free tier → copy `REDIS_URL` → redeploy.

## 6. Verify the API is live + seeded

```bash
curl https://<your-api>.up.railway.app/api/v1/health
curl https://<your-api>.up.railway.app/api/v1/curriculums
curl https://<your-api>.up.railway.app/api/v1/curriculums/<NEP-GRADE10-uuid>/grades
curl "https://<your-api>.up.railway.app/api/v1/grades/<grade-uuid>/subjects?limit=100"
```

Expected: health `200 {"data":{"status":"ok",…}}`; curriculums include
`NEP-GRADE10`; grades return the `10` grade; subjects return the 7 subjects
(Mathematics, Science, English, Nepali, Social Studies, Optional Mathematics,
Computer Science).

## 7. Point Vercel at the live API

`apps/web` proxies `/api/v1/*` server-side via `next.config.ts` (`API_UPSTREAM`,
no CORS, no `NEXT_PUBLIC_API_URL`). The committed default now points at
`https://api-production-836b.up.railway.app`, but an explicit env is safest:

1. Vercel → project `edunexa` (team `bijay-00`) → **Settings → Environment
   Variables** → set `API_UPSTREAM` → `https://api-production-836b.up.railway.app`.
2. **Redeploy** (or push to `main` — Vercel auto-deploys when author
   permissions allow).

## 8. Updating after this

- **API code change**: `railway up` (or push to `main` if the Railway service is
  GitHub-sourced) → Railway rebuilds + reboots. No re-seed needed.
- **DB schema/seed change**: run `db push`/`db seed` locally first, then redeploy.
- **Web change**: push to `main` → Vercel auto-deploys.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Deploy shows `FAILED` with **no logs**, or domain 502 | no healthcheck and/or no published port | set healthcheck `/api/v1/health`; publish target port **3000** (see §4) |
| App boots but silently hangs in logs after `Prisma schema loaded` | `prisma db push` in the start command hitting the transaction pooler | use the Dockerfile `CMD node dist/main.js`, no start command |
| `P1001` at deploy / runtime | `DATABASE_URL` on the IPv6-only direct host | use the `aws-0-*.pooler.supabase.com` string (port 6543) + `?pgbouncer=true&connection_limit=1` |
| `prepared statement "s0" already exists` (prisma db push) | DDL through transaction pooler | don't run `db push` in the image; run it from your machine (§3) |
| `DATABASE_URL` changes don't apply | variables cached in the running deployment | `railway redeploy` after `railway variables --set` |
| Web can't reach API | env empty/old on Vercel | set `API_UPSTREAM`, Redeploy (§7) |
| Trial credits gone after 30 days | trial window elapsed | switch to the **Free** plan (`$0/mo`, ~$1 usage credit) or Hobby `$5/mo` |
| Vercel deploy blocked (git author) | author-gate on Vercel git integration | use `vercel deploy --prod` CLI with a token, or add author |

---

## Remaining hardening (post-MVP)

- Replace `prisma db push` with committed migrations (`prisma migrate dev`).
- Add real JWT rotation/rate limiting on the API.
- Move Postgres/DB off free plans before production traffic.
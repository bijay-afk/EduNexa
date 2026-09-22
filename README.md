# Class 10 Learning Platform

Production-edition learning platform for Class 10 students and teachers. Syllabus-structured learning,
teacher question generation, and assessment — with AI question generation that is strictly grounded in
approved curriculum content.

This is a **modular monolith** monorepo (not microservices) with clear module boundaries.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4, TanStack Query, React Hook Form, Zod, KaTeX |
| Backend | NestJS, TypeScript, Prisma, REST + OpenAPI/Swagger |
| Database | PostgreSQL + pgvector (extension) |
| Cache / Queue | Redis + BullMQ |
| Storage | AWS S3 / Cloudflare R2 (media) |
| Testing | Vitest, Supertest, Playwright, k6 |
| Infra | Docker, GitHub Actions, Cloudflare |

## Layout

```
apps/
  web/      Student + Teacher web app (Next.js, PWA-ready)
  admin/    Administration app (Next.js)
  api/      NestJS API (auth, curriculum, content, questions, AI generation, assessments)
packages/
  types/      Shared domain types
  validation/ Zod schemas shared across apps
  config/     Shared environment/feature configuration
  ui/         Shared design-system components (shadcn-style primitives)
  eslint-config/ Shared ESLint flat config
infrastructure/  Dockerfiles, compose, CI
docs/           Architecture and contributor documentation
```

## Quick start

Prereqs: Node.js >= 20, npm >= 10. Docker optional for local Postgres/Redis.

```bash
npm install                                    # installs everything (workspaces)
npm run db:seed                                # starts nothing; requires a DB (see below)
npm run dev                                    # starts api (:3000), web (:4000), admin (:4001)
```

### Local databases (Docker)

```bash
docker compose up -d                           # postgres (with pgvector) + redis at :5432 / :6379
cp apps/api/.env.example apps/api/.env         # review values
npm run db:generate                            # generate the Prisma client
npm run db:push                                # push schema to your local DB
npm run db:seed                                # insert a sample curriculum
```

Without Docker, point `DATABASE_URL` in `apps/api/.env` at any PostgreSQL instance
(`?schema=public`) and any Redis for `REDIS_URL`.

## API

- Base path: `/api/v1`
- Swagger UI: `http://localhost:3000/api/docs`
- Health: `GET /api/v1/health` and `GET /api/v1/ready`
- Pino JSON logs; Sentry reserved for production.

## Common commands

```bash
npm run build          # packages first, then api, web, admin
npm run lint           # lint all workspaces
npm run typecheck      # typecheck all workspaces
npm run test           # unit tests (workspaces that define them)
npm run format         # prettier write
```

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — modules, flow, and scaling notes
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — conventions, git workflow, DoD
- See [`docs/README.md`](docs/README.md) for the full planned docs index.

## Status

Phase 1 foundation scaffold. See `docs/README.md` for development phases.
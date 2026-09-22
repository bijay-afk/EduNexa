# Architecture

The platform is a **modular monolith**. One NestJS deployment exposes a single REST API; modules own
their business logic and data. Modules are kept internally cohesive so they can be extracted into their
own services later without redesign.

## System view

```
Students ──┐            ┌── Student Portal
Teachers ──┼── Next.js ─┤
Admins ────┘            └── Teacher Portal / Admin Portal
                  │
                  ▼
            NestJS API (modular monolith)
        auth · users · curriculum · content · questions
        ai-generation · question-banks · quizzes · exams
        assignments · progress · notifications · analytics
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   PostgreSQL   Redis     Object storage
   + pgvector   + BullMQ      (S3/R2)
                 │
                 ▼
            AI workers ──▶ LLM provider
```

## Module boundaries (apps/api/src)

| Module | Responsibility |
| --- | --- |
| `config` | Environment validation (Zod). Zero secrets in code. |
| `prisma` | DB access, lifecycle, pgvector-ready client. |
| `health` | `/health`, `/ready` probes (DB + Redis). |
| `auth` | Register/login, JWT, session revocation hooks for 2FA. |
| `users` | Identity + profile; RBAC role/permission resolution. |
| `curriculum` | Grade → Subject → Chapter → Topic tree (read-heavy, cached). |
| `content` | Structured-content blocks (notes/examples/formulas/exercises). |
| `questions` | Question lifecycle: draft → review → approved; question banks; tags. |
| `ai` | Syllabus-grounded generation queue: config → retrieval → LLM → validation → drafts. |
| `assessments` | Quizzes, exams, assignments, submissions, auto-grading. |
| `progress` | Completion, streaks, weak/strong topic scoring. |
| `analytics` | Aggregate metrics; feeds dashboards. |

## Cross-cutting

- **AuthN/AuthZ**: JWT access tokens; guards enforce RBAC on the backend. Admin/super-admin roles.
- **API envelope**: `{ data, meta, error }` everywhere; structured error codes via a global exception
  filter.
- **Async work**: BullMQ queues (ai-generation, notifications). Slow work is never done inside a
  normal request.
- **Search**: PostgreSQL full-text first; OpenSearch later if scale demands it.
- **AI boundary**: verified curriculum content is retrieved (metadata-filtered + pgvector), passed to
  generation as the only context. Output is schema-validated, curriculum-validated, de-duplicated, and
  must be teacher-approved before entering the question bank. AI output is treated as untrusted data.

## Scaling notes

- Stateless API processes → horizontal scaling behind a load balancer/CDN.
- PostgreSQL connection pooling; Redis for cache + queues; CDN + object storage for media and exports.
- Target scale ladder: 1k → 10k → 100k+ students (spec §69).
- Performance budget: LCP < 2.5s, CLS < 0.1, INP < 200ms; API p95 < 300ms (spec §68).
# Documentation

Planned documentation suite (per the product spec, section 83). Files marked *(started)* exist in this
repository; the rest are authored as the corresponding phase ships.

| Doc | Status |
| --- | --- |
| `README.md` | ✅ repo root quick start |
| `ARCHITECTURE.md` | ✅ started |
| `CONTRIBUTING.md` | ✅ started |
| `PRD.md` | ⏳ Phase 0 |
| `DATABASE.md` | ⏳ Phase 1 (derive from `apps/api/prisma/schema.prisma`) |
| `API.md` | ⏳ Phase 1 (generated from OpenAPI) |
| `AUTHORIZATION.md` | ⏳ Phase 1 RBAC |
| `SECURITY.md` | ⏳ hardening phase |
| `CONTENT_MODEL.md` | ⏳ Phase 2 CMS |
| `AI_GENERATION.md` | ⏳ Phase 5 AI engine |
| `TEACHER_PORTAL.md` | ⏳ Phase 4 |
| `DEPLOYMENT.md` | ⏳ Phase 8 |
| `DISASTER_RECOVERY.md` | ⏳ Phase 8 |
| `TESTING.md` | ⏳ continuous |
| `RUNBOOK.md` | ⏳ Phase 8 |

## Development phases (from product spec §80)

- Phase 0 — Product & architecture (PRD, ERD, API spec, wireframes)
- Phase 1 — Foundation: monorepo, CI/CD, auth, DB, RBAC, design system ← *current*
- Phase 2 — Curriculum & CMS
- Phase 3 — Student learning
- Phase 4 — Teacher portal
- Phase 5 — AI question generation
- Phase 6 — Assessment
- Phase 7 — Engagement
- Phase 8 — Production hardening
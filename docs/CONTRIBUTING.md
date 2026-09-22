# Contributing

## Git workflow

```
main (protected, deployable)
└── develop
    └── feature/<scope>  (PR → develop, CI must pass)
```

- Feature branches off `develop`; PRs reviewed; protected branches require passing CI.
- Conventional, concise commit messages matching the repo style.

## DoD (every feature, spec §82)

Requirements · UI · API · Database · Validation · Authorization · Error handling · Unit tests ·
Integration tests · E2E where appropriate · Logging · Documentation · Accessibility review ·
Security review · Performance review · Deployment · Monitoring.

## Conventions

- TypeScript strict, no `any` without justification.
- API responses use the `{ data, meta, error }` envelope; reuse `packages/validation` for DTOs.
- UI components live in `packages/ui`; apps compose them. Tailwind for styling; no inline styles.
- Shared domain types in `packages/types` — never define a "local copy" of a shared type.
- Secrets live only in `.env` (git-ignored). Never commit keys/tokens.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before pushing.
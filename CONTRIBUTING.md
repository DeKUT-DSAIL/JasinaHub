# Contributing

Thanks for your interest in improving JasinaHub.

## Ground rules

- Small, focused PRs. One concern per branch.
- Every schema change ships as a new migration in `supabase/migrations/` — never edit an applied one.
- Every new `public` table needs `GRANT` statements in the same migration (see [docs/DATABASE.md](docs/DATABASE.md)).
- Never store roles on `profiles`. Use `user_roles` + `has_role()`.
- No hardcoded colors — use the semantic tokens in `src/index.css`.

## Dev loop

```bash
npm install
cp .env.example .env       # fill in Supabase values
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run build
```

Then sign in as an admin and run **Admin → Tests → Run all**. All non-destructive suites must be green.

## Commit style

Conventional Commits — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

## Reporting bugs

Open a GitHub issue with:

- Steps to reproduce
- Expected vs. actual
- Browser + OS
- Console + network errors (redact any tokens)

## Code of Conduct

Be respectful. Assume good intent. Discussion happens in issues and PRs.
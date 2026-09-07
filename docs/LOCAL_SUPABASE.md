# Local Supabase Setup

Run the entire backend locally with the Supabase CLI. Great for offline dev and destructive tests.

## Prerequisites

- **Docker Desktop** running
- **Supabase CLI** ≥ 1.180 — `npm i -g supabase` or `brew install supabase/tap/supabase`

## Start the stack

```bash
supabase start
```

First run pulls ~1 GB of images. When it finishes you'll see something like:

```
API URL:        http://127.0.0.1:54321
GraphQL URL:    http://127.0.0.1:54321/graphql/v1
DB URL:         postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:     http://127.0.0.1:54323
Inbucket URL:   http://127.0.0.1:54324
anon key:       eyJhbGciOi...
service_role:   eyJhbGciOi...
```

## Wire the app to local

Copy the anon key and API URL into `.env`:

```bash
VITE_SUPABASE_URL="http://127.0.0.1:54321"
VITE_SUPABASE_PUBLISHABLE_KEY="<local-anon-key>"
VITE_SUPABASE_PROJECT_ID="local"
```

Then `npm run dev`.

## Apply migrations + seed

```bash
supabase db reset       # drops db, replays every migration, then runs supabase/seed.sql
```

## Sign up + become admin

1. Sign up at http://localhost:8080/signup.
2. Confirm your email in the **Inbucket** UI (http://127.0.0.1:54324).
3. In **Supabase Studio → SQL** (http://127.0.0.1:54323) run:

```sql
UPDATE profiles SET verified = true WHERE email = 'you@example.com';
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```

## Serve edge functions

```bash
supabase functions serve reset-password --env-file supabase/.env.local
```

## Stop / reset

```bash
supabase stop            # keeps volumes
supabase stop --no-backup # nukes local DB volume
```

## Reproducible hosted demo (alternative)

Prefer not to run Docker? Use the hosted preview:

- **Live demo**: https://www.dsail-health.vercel.app
- Sign in with a demo account from [DEMO.md](DEMO.md).
- Read-only unless the maintainers grant your account a role.
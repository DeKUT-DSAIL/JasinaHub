# Database — Migrations & Seed

All schema, RLS, RPCs, and grants live in `supabase/migrations/*.sql`. Migrations are applied in filename (timestamp) order.

## Apply migrations

### Against a local Supabase stack

```bash
supabase start           # first time only — spins up local Postgres + Auth + Storage
supabase db reset        # drops the local DB and re-runs every migration + seed.sql
```

### Against a hosted project (Lovable Cloud / Supabase)

```bash
supabase link --project-ref <project-ref>
supabase db push         # applies pending migrations
```

On Lovable Cloud, migrations are typically applied through the platform's migration tool — the SQL files are the source of truth.

## Add a new migration

```bash
supabase migration new add_my_feature
# edit supabase/migrations/<timestamp>_add_my_feature.sql
supabase db reset        # re-run everything locally to confirm ordering
```

Every `CREATE TABLE public.<name>` **must** be followed in the same migration by:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<name> TO authenticated;
GRANT ALL ON public.<name> TO service_role;
ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... ;
```

Without the grants the Data API returns `permission denied` — RLS alone is not enough.

## Seed data

`supabase/seed.sql` runs automatically at the end of `supabase db reset`. It creates:

- 3 example categories (General Health, Nutrition, Maternal Health)
- 6 example questions across those categories
- 1 feedback question

It does **not** create users — Supabase Auth users are created through the app signup flow or the Supabase dashboard.

## Promoting a user to admin

After signing up, find your user id (Auth → Users) and run:

```sql
INSERT INTO public.user_roles (user_id, role) VALUES ('<your-uuid>', 'admin');
UPDATE public.profiles SET verified = true WHERE id = '<your-uuid>';
```

## Schema overview

See the [ERD in README.md](../README.md#entity-relationship-diagram). Core tables:

- `profiles` — user profile + verification / consent flags
- `user_roles` — role assignments (admin / user)
- `categories`, `questions` — prompt hierarchy
- `voice_responses` — audio submissions (status: pending / accepted / rejected)
- `transcriptions`, `transcription_locks` — text pipeline with pessimistic locking
- `user_progress` — per-category completion
- `user_activity_logs` — audit trail
- `feedback_questions`, `feedback_submissions`, `feedback_answers` — in-app feedback

## RPC catalog

See [API.md → RPCs](API.md#rpcs-postgres-functions).

## Backups

Hosted Supabase takes daily backups automatically. To export ad hoc:

```bash
supabase db dump --file backup.sql             # schema + data
supabase db dump --data-only --file data.sql   # data only
```
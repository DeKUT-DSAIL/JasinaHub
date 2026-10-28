# Database — Architecture, Setup & Migrations

JasinaHub uses PostgreSQL managed by Supabase, combining relational tables, Row-Level Security (RLS), custom RPC functions, automated triggers, and object storage buckets.

---

## 1. Quick Initial Setup (No Docker Required)

For new developers setting up JasinaHub for the first time, you do **not** need Docker. You can provision your database in under 2 minutes:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the left menu of your Supabase dashboard, click **SQL Editor** (`>_`).
3. Click **New query**.
4. Open the consolidated setup script in this repository: [`supabase/setup_complete.sql`](../supabase/setup_complete.sql).
5. Copy the entire file, paste it into the SQL Editor, and click **Run**.

This one-click script automatically configures:
- All custom enums (`app_role`, `response_status`)
- All 14 core relational tables and foreign keys (including `site_content`)
- Automatic triggers (`set_profile_pseudonym` and `handle_new_user` on `auth.users`)
- Stored procedures (`claim_random_transcription`, `release_transcription_lock`, `get_question_counts`, `get_admin_chart_data`, `get_transcription_stats`)
- Row-Level Security (RLS) policies and table grants
- Storage buckets (`voice-recordings` and `images`) with public playback policies
- Starter seed data (categories, prompts, and feedback questions)

---

## 2. Advanced Migration Workflow (Supabase CLI)

For developers who prefer using the CLI to track incremental migrations without Docker:

### Link to your remote Supabase project
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### Apply pending migrations
```bash
supabase db push
```

### Create a new migration
```bash
supabase migration new add_my_feature
# edit the generated file in supabase/migrations/<timestamp>_add_my_feature.sql
supabase db push
```

> [!IMPORTANT]
> Whenever you add a new table via migration (`CREATE TABLE public.<name>`), you **must** include:
> ```sql
> GRANT SELECT, INSERT, UPDATE, DELETE ON public.<name> TO authenticated;
> GRANT ALL ON public.<name> TO service_role;
> ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;
> CREATE POLICY ... ;
> ```
> Without the `GRANT` statements, Supabase's PostgREST API returns `permission denied` even if RLS policies are valid.

---

## 3. Promoting a User to Administrator

Supabase Auth manages user credentials. After signing up at `http://localhost:8080/signup`:

1. Open your **Supabase Dashboard → SQL Editor**.
2. Run the following query with your account email:

```sql
UPDATE public.profiles 
SET verified = true 
WHERE email = 'your-email@example.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 4. Schema & Entity Overview

See the full [Architecture & ERD Diagram in README.md](../README.md#database-architecture--schema).

### Core Tables:
- `profiles` — User profile, pseudonym (`JSN-XXXX`), demographic data, consent timestamp, and verification flag.
- `user_roles` — Role assignments (`admin`, `user`).
- `categories` — Thematic groupings for health questions.
- `questions` — Health prompt questions linked to categories.
- `voice_responses` — Audio recording submissions (`pending`, `accepted`, `rejected`).
- `transcriptions` — Text transcriptions produced by transcribers.
- `transcription_locks` — Atomic 15-minute locks preventing duplicate assignment.
- `user_progress` — Per-category question completion metrics.
- `user_activity_logs` — Audit log of user actions and navigation.
- `feedback_questions`, `feedback_submissions`, `feedback_answers` — Survey feedback pipeline.
- `site_content` — Dynamic Markdown content for informed consent forms and privacy policies (editable by admins in `/admin`).
- `password_reset_codes` — 6-digit short codes for password reset flow.

---

## 5. Storage Buckets

- **`voice-recordings`** (Public): WebM/Opus audio files stored under `<user-id>/<uuid>.webm`. Public read allows transcribers and reviewers to stream audio without expired tokens.
- **`images`** (Public): Visual cards for categories and questions under `question-images/`.

---

## 6. Backups

Hosted Supabase takes daily backups automatically. To export ad hoc via Supabase CLI:

```bash
supabase db dump --file backup.sql             # schema + data
supabase db dump --data-only --file data.sql   # data only
```
# API Reference

JasinaHub has no bespoke REST API. The client talks to Supabase directly (PostgREST + Storage + Auth) plus a small number of Edge Functions and RPCs.

## Client entry point

```ts
import { supabase } from "@/integrations/supabase/client";
```

All calls flow through this typed client (`Database` types are auto-generated in `src/integrations/supabase/types.ts`).

## REST tables (via PostgREST)

RLS-scoped. See [DATABASE.md](DATABASE.md) for policies.

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `categories` | anyone | admin | admin | admin |
| `questions` | verified users / admin | admin | admin | admin |
| `voice_responses` | owner / admin / transcriber-of-row | verified user (own) | admin | — |
| `transcriptions` | owner / admin | authenticated (own) | owner while pending; admin | — |
| `transcription_locks` | owner / admin | owner | — | owner |
| `user_progress` | owner (verified) | owner (verified) | owner (verified) | — |
| `user_roles` | owner | admin | admin | admin |
| `profiles` | owner / admin | owner | owner; admin can flip verification | — |
| `feedback_questions` | authenticated (active) | admin | admin | admin |
| `feedback_submissions` / `feedback_answers` | admin | authenticated | — | — |
| `user_activity_logs` | admin | owner | — | — |

## RPCs (Postgres functions)

Called via `supabase.rpc(name, args)`.

| RPC | Args | Returns | Purpose |
|---|---|---|---|
| `has_role` | `_user_id uuid, _role app_role` | `boolean` | Role check used inside RLS |
| `get_question_counts` | — | `{ question_id, unique_user_count }[]` | Retire questions after 3 unique responses |
| `get_question_unique_user_counts` | — | same | Same shape, used by admin views |
| `claim_random_transcription` | `_user_id uuid` | `{ id, audio_file_url, question_id, duration_seconds }` | Atomically claim + lock a voice response |
| `release_transcription_lock` | `_user_id uuid` | `void` | Release the caller's lock |
| `get_admin_chart_data` | — | `json` | Dashboard time-series + distributions |
| `get_transcription_stats` | — | `json` | Aggregate transcription counts |

All admin RPCs are `SECURITY DEFINER` and gate on `has_role(auth.uid(), 'admin')`.

## Storage buckets

| Bucket | Public | Contents |
|---|---|---|
| `voice-recordings` | yes (URL contains random id) | WebM/Opus audio, `<user-id>/<uuid>.webm` |
| `images` | yes | Question illustrations |

```ts
await supabase.storage
  .from("voice-recordings")
  .upload(`${userId}/${crypto.randomUUID()}.webm`, blob, { contentType: "audio/webm" });
```

## Auth

```ts
await supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, dialect, account_type } } });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();
```

A trigger `handle_new_user()` creates the matching `profiles` row and reads signup metadata (`first_name`, `dialect`, `account_type`, …).

## Edge Functions

Deployed under `supabase/functions/`.

### `reset-password`
`POST /functions/v1/reset-password` — body `{ email }` → sends a password-reset email via the configured transport.

### `migrate-drive-audio`
`POST /functions/v1/migrate-drive-audio` — admin-only. Ferries a batch of legacy Google Drive audio URLs into the `voice-recordings` bucket and updates `voice_responses.audio_file_url`.

```bash
curl -X POST "$VITE_SUPABASE_URL/functions/v1/migrate-drive-audio" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"limit":50}'
```

## Realtime

Presence channel `admin-presence` — used by `usePresenceTracking` to show live user counts in the admin panel.

## Errors

All Supabase calls return `{ data, error }`. Surface `error.message` and log the full object via `src/lib/logger.ts`. Common shapes:

- `PGRST116` — no rows returned when `.single()` used; switch to `.maybeSingle()`.
- `42501` — RLS denied; check the policy for the current role.
- `permission denied for table X` — missing `GRANT`. Add one in a new migration.
# Troubleshooting

## App loads to a blank screen

- Open the browser console. Almost always a missing env var.
- Confirm `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Restart `npm run dev` after editing `.env` — Vite only reads it at boot.

## `permission denied for table X`

RLS or GRANT problem. Fix by:

1. Confirm the table has a policy that matches the current role (`authenticated`, `anon`, `admin`).
2. Ensure the migration that created it has `GRANT ... TO authenticated;` (see [DATABASE.md](DATABASE.md)).

## `new row violates row-level security policy`

You're inserting as a role the policy doesn't allow. For user-scoped inserts, set `user_id = auth.uid()` explicitly.

## Signup succeeds but the user has no profile row

The `handle_new_user()` trigger must exist on `auth.users`. Re-run the relevant migration or `supabase db reset` locally.

## `Unsupported provider: provider is not enabled`

You called `signInWithOAuth`. This app is email/password only — remove the OAuth call, or enable the provider in the Supabase Auth settings.

## Microphone permission denied

- iOS Safari: mic access requires HTTPS or `localhost`.
- Chrome: check the site permissions icon in the address bar.
- The recorder shows a permission prompt via `MinimalRecorder`; if it's stuck, hard-reload.

## Recording uploads fail with 504 / gateway timeout

Storage sometimes rate-limits large batches. The dataset export already retries with backoff and lower concurrency; for uploads, retry the single failing file. Persistent 504s → open a support ticket with your Supabase project.

## Admin panel is empty

Your account isn't an admin. See [DATABASE.md → Promoting a user to admin](DATABASE.md#promoting-a-user-to-admin).

## Tests tab shows red for `has_role` = admin

Same as above — insert an `admin` row in `public.user_roles` for your user id.

## Dataset export downloads only a CSV

All audio fetches failed. Check the console: the exporter falls back to a metadata-only CSV when every retry times out. Usually a storage outage or an expired session; sign out + back in and retry.

## Realtime presence stuck at 0

Ensure the `admin-presence` channel is not blocked by a corporate proxy (Websockets on `wss://<project>.supabase.co/realtime/v1/*`).

## `npm run build` fails with `Cannot find module '@/…'`

Vite path alias regression. Ensure `vite.config.ts` still has:

```ts
resolve: { alias: { "@": path.resolve(__dirname, "src") } }
```

and `tsconfig.app.json` has the matching `paths` entry.

## Local Supabase won't start

- Docker isn't running, or ports 54321–54324 are in use.
- `supabase stop --no-backup` then `supabase start`.
- Update the CLI: `npm i -g supabase@latest`.
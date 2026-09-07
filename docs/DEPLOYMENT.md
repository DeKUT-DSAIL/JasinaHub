# Deployment

## Lovable (recommended)

1. Open the project in Lovable.
2. Click **Publish** (top right).
3. Frontend changes go live after clicking **Update** in the publish dialog. Backend changes (migrations, edge functions) deploy automatically.
4. Optional: attach a custom domain via **Project Settings → Domains**.

## Vercel / Netlify / any static host

```bash
npm ci
npm run build         # emits dist/
```

Serve `dist/` as a static site. Because this is a SPA, add a catch-all rewrite so deep links don't 404:

**Vercel** — `vercel.json` (already in the repo):

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

**Netlify** — `public/_redirects`:

```
/*   /index.html   200
```

Set the env vars from `.env.example` in the host's dashboard. They are baked in at build time, so re-deploy after changing them.

## Backend

### Migrations

```bash
supabase link --project-ref <ref>
supabase db push
```

### Edge functions

```bash
supabase functions deploy reset-password
supabase functions deploy migrate-drive-audio
supabase secrets set RESEND_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
```

## Release checklist

- [ ] `npm run build` clean
- [ ] `npm run lint` clean
- [ ] Admin → Tests → **Run all** all green (Smoke, Auth, RLS, RPC, Storage, Data Integrity)
- [ ] `supabase db push` applied (no pending migrations)
- [ ] Edge functions redeployed if changed
- [ ] `.env` values present in host dashboard
- [ ] PWA icons + manifest updated if branding changed
- [ ] SEO metadata in `index.html` still current

## Rollback

- Frontend: redeploy the previous git SHA.
- Migrations: write a **new** migration that reverses the change (never edit an applied migration file).
- Edge functions: `supabase functions deploy <name>` from the previous commit.
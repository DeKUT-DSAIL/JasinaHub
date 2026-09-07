# JasinaHub — Quick Start

Get the app running locally in under 5 minutes.

## 1. Prerequisites

- **Node.js 18+** (or Bun 1.x) and **npm**
- **Git**
- Optional: **Supabase CLI** (`npm i -g supabase`) for local backend
- Optional: **Docker Desktop** (required by the Supabase CLI)

## 2. Clone and install

```bash
git clone <repository-url> jasinahub
cd jasinahub
npm install
```

## 3. Configure environment

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`.
You get these from the Lovable Cloud panel, or from `supabase status` after starting a local stack (see [docs/LOCAL_SUPABASE.md](docs/LOCAL_SUPABASE.md)).

## 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:8080.

## 5. Sign in

- Create an account through **/signup**, or use one of the demo accounts in [docs/DEMO.md](docs/DEMO.md).
- To promote yourself to admin, insert a row into `public.user_roles` with `role = 'admin'` for your user id (see [docs/DATABASE.md](docs/DATABASE.md#promoting-a-user-to-admin)).

## 6. Verify the install

In the app, go to **Admin → Tests → Run all tests**. All Smoke, Auth, RLS, and RPC suites should be green.
See [docs/TESTING.md](docs/TESTING.md) for expected outputs.

## Next

- [Architecture overview](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
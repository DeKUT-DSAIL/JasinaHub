# JasinaHub — Quick Start

Get JasinaHub running locally in under 5 minutes without needing Docker.

---

## 1. Prerequisites

- **Node.js 18+** (or Bun 1.x) and **npm**
- **Git**
- A free [Supabase](https://supabase.com) account

---

## 2. Fork and Clone Your Repository

1. Fork [DeKUT-DSAIL/JasinaHub](https://github.com/DeKUT-DSAIL/JasinaHub) on GitHub.
2. Clone your personal fork and install dependencies:

```bash
git clone https://github.com/<your-username>/JasinaHub.git jasinahub
cd jasinahub
npm install
```

3. (Optional) Add upstream remote to track original updates:
```bash
git remote add upstream https://github.com/DeKUT-DSAIL/JasinaHub.git
```

---

## 3. Set Up Your Database (Supabase Cloud — 1 Minute)

1. Create a free project on [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** (`>_`) in your project dashboard.
3. Open [`supabase/setup_complete.sql`](supabase/setup_complete.sql), copy its contents, paste into the SQL Editor, and click **Run**.
   *(This initializes all 13 tables, security policies, triggers, RPC procedures, storage buckets, and starter categories).*

---

## 4. Configure Environment

```bash
cp .env.example .env
```

In your Supabase project dashboard, navigate to **Project Settings** → **API**, copy your **Project URL** and **anon/public key**, and paste them into `.env`:

```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-public-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

---

## 5. Start the Dev Server

```bash
npm run dev
```

Open your browser at **`http://localhost:8080`**.

---

## 6. Sign In & Promote to Admin

1. Register an account at `http://localhost:8080/signup`.
2. In your Supabase SQL Editor, promote your user to admin:

```sql
UPDATE public.profiles SET verified = true WHERE email = 'your-email@example.com';
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 7. Verify the Install

In the app, navigate to **Admin Panel** → **Tests** tab and click **Run all tests**.
All Smoke, Auth, RLS, Storage, and RPC test suites should pass with green checks.

---

## Documentation Links

- [Complete Architecture & Schema in README.md](README.md#database-architecture--schema)
- [Architecture Details](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Guide](docs/DATABASE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
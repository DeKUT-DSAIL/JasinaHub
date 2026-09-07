# Testing

JasinaHub ships an in-app test harness. It runs entirely in the browser against the live backend session, so it validates real RLS + RPC behavior — not mocks.

## Run the tests

1. Sign in as an admin.
2. Open **Admin → Tests**.
3. Click **Run all tests** (or run a single suite).

Destructive tests are opt-in via the toggle at the top of the tab.

## Suites

| # | Suite | What it covers |
|---|---|---|
| 1 | Smoke · Quick Health Check | App shell mounted, backend reachable, auth session, storage reachable |
| 2 | Security · Authentication & Authorization | Session valid, `has_role`, `user_roles` RLS isolation |
| 3 | Security · Row-Level Security | Cross-user leak checks on every user-scoped table |
| 4 | Integration · Database Functions (RPC) | `get_question_counts`, `get_admin_chart_data`, claim/release round-trip |
| 5 | Integration · Storage | Bucket listing, signed URL retrieval |
| 6 | Data · Integrity | Foreign key sanity, orphan detection |
| 7 | Data · Business Rules | 30 s recording cap, 3-unique-users retirement, 3-edit transcription cap |
| 8 | Functional · End-to-End | Full record → transcribe → accept happy path (destructive) |
| 9 | Regression | Historical bug guards |
| 10 | Resilience | Timeout + retry paths |
| 11 | Accessibility | Landmark + ARIA smoke checks |
| 12 | Compatibility | Browser feature detection (MediaRecorder, IndexedDB, etc.) |
| 13 | Performance | Query latency budgets |

## Adding a test

1. Pick a suite in `src/lib/tests/suites/` (or create one and register it in `src/lib/tests/index.ts`).
2. Push a `TestCase`:

```ts
{
  id: "my-check",
  name: "My check does the thing",
  destructive: false,          // true → gated by the destructive toggle
  run: async () => {
    const { data, error } = await supabase.from("questions").select("id").limit(1);
    if (error) throw error;
    assert(data!.length > 0, "no questions seeded");
    return { details: { rows: data!.length } };
  },
}
```

Assertions use `assert` / `assertEqual` from `src/lib/tests/types.ts`. To *skip* a test at runtime, throw an object with `{ skip: true, message: "..." }`.

## CI

There is no headless test runner today. To automate:

- Run `npm run build` — this catches TypeScript regressions.
- Optionally add Playwright and drive `Admin → Tests → Run all` in a signed-in browser session, asserting on the pass count.

## Deno tests for edge functions

```bash
supabase functions serve
deno test supabase/functions/reset-password/ --allow-net --allow-env
```
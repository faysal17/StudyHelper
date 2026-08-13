# StudyHelper — Project Notes

This file documents the codebase **as it actually stands right now**, mid-remediation. It's not
a description of an idealized target architecture — where the codebase is inconsistent, that's
stated explicitly rather than papered over. For the full audit findings, root-caused bugs, and
the remaining fix plan, see [AUDIT.md](AUDIT.md).

## Tech stack

- **Framework**: Next.js 14.2 (App Router), React 18.3, TypeScript 5.6 (`strict: true`)
- **Styling**: Tailwind CSS 3.4. `clsx` and `tailwind-merge` are dependencies but currently
  **unused** anywhere in the codebase (dead deps — flagged in AUDIT.md, not yet resolved).
- **Backend**: Supabase (Postgres + Auth), accessed client-side via `@supabase/supabase-js`
  using the default localStorage-persisted session (not `@supabase/ssr` / cookie-based auth).
- **File storage**: Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`), reached only through
  two authenticated Next.js route handlers — `app/api/upload` and `app/api/storage/delete`
  (`lib/r2.ts`, `lib/apiAuth.ts`). Never accessed directly from the client.
- **Deploy target**: Vercel (`@vercel/analytics`, `@vercel/speed-insights` are wired in; both
  no-op locally — their scripts 404 outside of an actual Vercel deployment, which is expected).

## Routing, auth, and data-fetching — actual current pattern

- Every route under `app/` is a **client component** (`'use client'`) that fetches its own data
  in a `useEffect` on mount. There are no server components doing data fetching, no
  `loading.tsx` streaming, no route-level data loaders.
- **Auth gating**: `components/AuthGate.tsx`, wrapped around `{children}` in `app/layout.tsx`,
  is the single source of truth for "is this route accessible." It checks the Supabase session
  once on mount (via `getSession()`, not `getUser()` — see below) and redirects to `/login` for
  every route except `/login` itself. This replaced the situation where only 6 of 15 pages had
  any auth check at all (M3, done).
  - **Known leftover duplication**: 5 pages (`/`, `/today`, `/today/routine`,
    `/tools/newspaper-study`, `/tools/synonym-practice`) still also run their own local
    `checkSession`-style effect from before `AuthGate` existed. It's harmless (redundant, not
    wrong) and deliberately left alone — removing it is bundled into the not-yet-started
    redundant-request cleanup (M7/M12), not a separate task.
- **Data-access layer**: `lib/supabase.ts` is the intended single place for all Supabase reads/
  writes (~950+ lines, one exported function per operation). In practice this is **not fully
  consistent** — `lib/banglaVocab.ts`, `lib/newspaper.ts`, `lib/routines.ts`,
  `app/settings/page.tsx`, `app/tools/synonym-practice/page.tsx`, `components/Navbar.tsx`, and
  the classification/synonym `QuizSummary` components all call `supabase.from()` /
  `supabase.auth` directly instead of going through `lib/supabase.ts`. This inconsistency is
  documented, not yet resolved (M12).
- **Getting the current user id**: `getCurrentUserId()` (exported from `lib/supabase.ts`, reused
  by `lib/newspaper.ts` and `lib/banglaVocab.ts`) reads the persisted session via
  `supabase.auth.getSession()`. It used to call `auth.getUser()` (a network round-trip) and
  silently fall back to a hardcoded non-UUID string on failure — this was M5's root-caused bug,
  fixed and merged. If you see any *new* code reading the user id a different way, that's a
  regression of this fix, not an acceptable alternative pattern.
- **Error handling on writes**: also inconsistent in practice. The 8 `user_settings`-writing
  functions named in AUDIT.md section 6, plus `addBanglaWordDB`, now check the Supabase response
  and throw on error, with matching UI error states wired up at their call sites (M5, done).
  Several other write paths — `awardXPAndSync`, `recordSessionStop`, `recordRatedFocusSession`,
  and two internal upserts inside `fetchUserSettings` — now at least `console.error` on failure
  (previously fully silent) but deliberately still don't throw; wiring real UI error-handling
  into those is deferred to M11, since they live inside the Focus Timer's duplicated finish/stop
  logic (`components/FocusTimerBlock.tsx` + `app/focus/page.tsx`) that M11 plans to unify into
  one shared hook anyway. Elsewhere in the codebase (e.g. `lib/banglaVocab.ts`'s
  `updateBanglaWordDB`/`deleteBanglaWordDB`/`clearAllBanglaWordsDB`), writes still fail silently
  with only a `console.error` — this has not been audited function-by-function beyond what
  AUDIT.md's coding-standards section already flagged.

## Component structure — actual current state

- `app/` holds route files; most business logic, data-fetching, and presentation live together
  in the page component itself (not split out). Several pages are large (400–700 lines) as a
  result — `app/focus/page.tsx`, `app/rank/page.tsx`, `app/syllabus/page.tsx` among them.
- `components/` is flat for most shared UI, with feature-specific subfolders for the more
  complex tools: `components/today/`, `components/newspaper/`, `components/synonym/`,
  `components/classification/`. Not every comparably-complex feature follows this — e.g.
  `app/tools/bangla-vocab/page.tsx` (the largest tool page) has no `components/bangla-vocab/`
  subfolder; everything lives in the one page file. This inconsistency is noted in AUDIT.md,
  not yet resolved (M11 covers establishing one target pattern and applying it consistently).
- Known duplicated logic, not yet unified: the `FlipDigit` sub-component and the finish/stop XP+
  rank-diff logic are each implemented twice, once in `app/focus/page.tsx` and once in
  `components/FocusTimerBlock.tsx`. Modal shell markup (`fixed inset-0 ... backdrop-blur-md`) is
  hand-duplicated across ~9 files rather than a shared `ModalShell` component. Both are M11.

## Naming and formatting conventions actually followed

- **Components**: PascalCase files and exports (`TaskCreatorModal.tsx`). **Lib modules**:
  camelCase (`spacedRepetition.ts`). Consistent throughout — no exceptions found.
- **Variables**: camelCase in JS/TS, including for values that came from snake_case DB columns
  (`const userId = ...`) — the snake_case only appears in object literals being sent to/received
  from Supabase (`{ user_id: userId }`). Consistent throughout.
- **Formatting**: Prettier is configured (`.prettierrc.json` — single quotes, semicolons,
  100-char print width, 2-space indent) as of the Phase 3 safety-net work, but **the existing
  codebase has not been retroactively reformatted** — `npm run format` has never been run
  project-wide. Don't assume every existing file matches the Prettier config exactly; new/edited
  code should follow it going forward.
- **TypeScript `any`**: used inconsistently — absent from core `lib/` files (`r2.ts`,
  `pdfMerge.ts`, `spacedRepetition.ts`) but present in ~19 files, concentrated in the
  classification/synonym `Dashboard.tsx` components and `lib/banglaVocab.ts`, despite typed
  interfaces already existing in `lib/types.ts` that could replace them. Not yet cleaned up
  (M14).

## Lint / test / CI — actually configured

- **Lint**: `next lint` (`.eslintrc.json`, extends `next/core-web-vitals`). Currently passes
  clean except for pre-existing warnings (a few `react-hooks/exhaustive-deps`, a few
  `@next/next/no-img-element` since the app uses `<img>` directly rather than `next/image`
  anywhere — see the `clsx`/`next/image` note above).
- **Typecheck**: `npm run typecheck` → `tsc --noEmit`. Clean.
- **CI**: `.github/workflows/ci.yml` runs `next lint` → `tsc --noEmit` → `next build` on every
  PR/push to `main`. It does **not** run the Playwright suite (deliberate — that needs a live
  Supabase/R2 environment and test-account credentials that aren't set up as CI secrets).
- **Tests**: `e2e/smoke.spec.ts` (Playwright), run manually via `npm run test:e2e` against a
  **production build** (`next build && next start` — see `playwright.config.ts`'s comment for
  why not `next dev`). Covers: unauthenticated redirect, login, all core pages loading without
  unexpected errors, and a full subject/topic create-delete flow against the real test account
  (`TEST_USER_EMAIL`/`TEST_USER_PASSWORD` in `.env.local`, gitignored). This is a smoke net, not
  coverage — most features (focus timer, image occlusion, newspaper study, etc.) have no
  automated test at all.

## Remediation status (see AUDIT.md for full detail)

Phase 1 (discovery) and Phase 2 (audit) are complete — `AUDIT.md` has the full findings and the
prioritized milestone plan (M1–M16).

Phase 3 (safety net: lint/format config, CI, Playwright smoke tests) — **done**, merged.

Phase 4 (fix, one milestone at a time):

| Milestone | Status |
|---|---|
| M1 — authenticate R2 storage API routes | **Done**, merged |
| M2 — scope `next/image` remotePatterns off `'**'` | **Done**, merged |
| M3 — consistent auth gate for every route | **Done**, merged |
| M4 — Next.js 14→16 upgrade | **Not started** — deliberately deferred (large breaking-change milestone, sequenced later at the user's request) |
| M5 — fix the fallback-always-executes bug (settings/vocab persistence) + DB migration | **Done**, merged, including the live migration |
| M6 — fix the full-page modal bug | Not started |
| M7 — cut redundant refetches (subtopic status/delete/XP flow) | Not started |
| M8 — split `fetchTasks()`'s always-deep-joined query | Not started |
| M9 — debounce Tasks search | Not started |
| M10 — stop `TaskCreatorModal` refetching data the parent already has | Not started |
| M11 — establish target component pattern on the Focus feature, then apply elsewhere | Not started |
| M12 — consolidate direct Supabase calls into the data-access layer | Not started |
| M13 — resolve `clsx`/`tailwind-merge` (remove or adopt) | Not started |
| M14 — replace `any` usage with existing `lib/types.ts` interfaces | Not started |
| M15 — remove confirmed-dead code | Not started |
| M16 — `app/topics/page.tsx` / `lib/supabase.ts:deleteNote()` (needs user input, not auto-removed) | Not started |

Phase 5 (write this file) — in progress; this is that file, kept up to date as milestones land
rather than written once at the end.

## Working rules for this remediation

These are the process rules being followed for this remediation specifically, not general
project conventions:

- One short-lived branch off `main` per milestone — never work directly on `main`.
- Small commits scoped to one concern each.
- Never combine a structural refactor with a behavior change in the same commit. If a fix needs
  restructuring first, that's a separate step, verified before the behavior change lands.
- After a milestone's change is made, it's verified (typecheck/lint/build/Playwright, plus a
  live/manual check of the actual behavior where practical) *before* reporting it as done.
- Stop and wait for explicit approval before merging a milestone branch to `main`, and before
  starting the next milestone. Merges and DB migrations against the live Supabase project are
  never done without that explicit go-ahead.
- If something in the audit's scope turns out to need touching code/tables beyond what was
  named, that expansion is called out explicitly rather than silently folded in or silently
  skipped.

## Where things are undecided

- Whether `lib/supabase.ts` should stay one large file or split into per-domain modules (e.g.
  `lib/data/tasks.ts`, `lib/data/settings.ts`) is an open question for M12, not yet decided.
- Whether to remove `clsx`/`tailwind-merge` or actually adopt them for the ~25 files mixing
  inline `style` objects with Tailwind classes is an open question for M13, not yet decided.
- No decision has been made yet on `app/topics/page.tsx` (unreachable in-app but a valid direct
  route) or `lib/supabase.ts:deleteNote()` (no call site found) — M16 needs your input on whether
  these are safe to delete or are half-built features to keep/finish.

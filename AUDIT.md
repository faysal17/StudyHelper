# StudyHelper Codebase Audit

Read-only audit per the remediation plan. No files were modified to produce this report except this one.

## Phase 1 — Discovery summary

- **Stack**: Next.js 14.2.35 (App Router), React 18.3, TypeScript 5.6, Tailwind CSS 3.4. Package manager: npm.
- **Backend**: Supabase (Postgres + Auth) is the primary datastore, accessed client-side via `@supabase/supabase-js`. Cloudflare R2 (via AWS S3 SDK) stores scanned note images, reached through two server-side Next.js route handlers (`app/api/upload/route.ts`, `app/api/storage/delete/route.ts`).
- **Routing/data-fetching**: All routes are client components (`'use client'`) that fetch in `useEffect` on mount, calling functions exported from `lib/supabase.ts`. No server components fetch data; no route-level `loading.tsx`/streaming used.
- **Data-access layer**: `lib/supabase.ts` (945 lines) is the intended single data layer, but several features (`lib/banglaVocab.ts`, `lib/newspaper.ts`, `lib/routines.ts`, `app/settings/page.tsx`, `app/tools/synonym-practice/page.tsx`, `components/Navbar.tsx`, `components/classification/QuizSummary.tsx`, `components/synonym/QuizSummary.tsx`) call `supabase.from()`/`supabase.auth` directly, bypassing it.
- **State management**: None (no Context/Redux/Zustand). Every page holds server state in local `useState`, refetching or prop-drilling as needed. Applied consistently, just architecturally minimal.
- **Auth**: Supabase email/password auth (`app/login/page.tsx`). If Supabase env vars are absent, the app falls back to a fake `localStorage`-only "demo" session — see Bug 1 below for how a related fallback misfires even when Supabase *is* configured.
- **Tests/Lint/CI**: No test framework, no ESLint/Prettier config files, no CI workflow found anywhere in the repo. `package.json` has a `lint` script (`next lint`) but no committed config for it.
- **Dependencies**: Mostly current to within a patch/minor version. Next.js itself is 2 majors behind latest (14 → 16); `npm audit` surfaces 3 high-severity advisories tied to the Next 14 line (see Security §1.4).

---

## 1. Security

### 1.1 CRITICAL — Unauthenticated file upload & delete API routes
- **[app/api/upload/route.ts:4-21](app/api/upload/route.ts)** — `POST` handler performs zero authentication or authorization checks. Any request reaching this endpoint (no Supabase session required) receives a valid presigned R2 `PUT` URL and can upload any file, any size, any content-type.
- **[app/api/storage/delete/route.ts:4-20](app/api/storage/delete/route.ts)** — Same problem in reverse: any caller can submit arbitrary `urls[]` and have matching R2 objects deleted, with **no ownership check** — the code never verifies the URL belongs to a note owned by the caller, or that the caller is even logged in.
- Both routes hold R2 credentials server-side (`lib/r2.ts:4-19`) and are gated only on `isR2Configured`, not on the caller's identity. This completely bypasses the otherwise-correct Supabase RLS model (§1.2) — RLS protects Postgres rows, but nothing protects the R2 bucket except these two routes, and they check nothing.
- No rate limiting exists anywhere in the app (confirmed via repo-wide search), which compounds this: an attacker can script unlimited presigned uploads (storage cost/abuse, potential to host arbitrary/malicious content on the public bucket) or mass-delete every object in the bucket.
- **This is the single highest-priority fix in the whole audit.**

### 1.2 RLS is correctly modeled but structurally undermined
- **[supabase_schema.sql:174-217](supabase_schema.sql)** — every table has RLS enabled with `FOR ALL USING (auth.uid() = user_id)`, which is the right pattern.
- However, **[lib/supabase.ts:21](lib/supabase.ts) + [lib/supabase.ts:64-72](lib/supabase.ts)** (`getCurrentUserId()`) silently substitutes the literal string `'user-owner'` for `user_id` whenever `supabase.auth.getUser()` doesn't resolve a user — even though `user_id` columns are `UUID`. This can never satisfy `auth.uid() = user_id`, so every affected read/write is invisibly rejected by RLS rather than failing loudly. Full detail and fix in **Bug 1** below.
- Route-level auth is inconsistent: only `app/page.tsx`, `app/today/page.tsx`, `app/today/routine/page.tsx`, `app/tools/newspaper-study/page.tsx`, `app/tools/synonym-practice/page.tsx`, and `components/Navbar.tsx` check `auth.getSession()`/`getUser()`. `app/tasks`, `app/topics`, `app/syllabus`, `app/focus`, `app/rank`, `app/tools/bangla-vocab`, `app/tools/word-classification`, `app/notes/[noteId]/occlude`, `app/study/[taskId]` render with no session check at all — they rely entirely on RLS to keep data scoped. There is no `middleware.ts`. For a single-user personal app this is lower severity, but it means "logged out" state is inconsistent across routes (some silently show empty data, some don't check at all).

### 1.3 Minor hardening
- **[next.config.mjs:5-10](next.config.mjs)** — `images.remotePatterns` uses `hostname: '**'`, meaning Next's image optimizer will proxy-fetch from *any* URL passed to `next/image`. Should be scoped to the actual R2 public host and Supabase host.
- No secrets found in tracked files or `.env*` git history (correctly gitignored); R2 credentials correctly lack the `NEXT_PUBLIC_` prefix and never reach the client bundle. No `dangerouslySetInnerHTML`, `eval`, or `new Function` usage found anywhere.

### 1.4 Dependency vulnerabilities
`npm audit` (production deps) reports **3 high-severity advisories**, all rooted in the `next@14.2.35` line (bundled `postcss` XSS/path-traversal issues, plus several Next.js CVEs: SSRF in Server Actions/rewrites, cache-confusion, Server Action DoS). Fix requires the breaking `next@16` upgrade — track separately, don't bundle with other fixes (see plan).

---

## 2. Redundant requests per click

- **[lib/supabase.ts:633-646](lib/supabase.ts)** (`updateSubtopicStatus`) — every status-toggle click calls `fetchSubtopics()` (a full deep join across subtopics→topics→subjects, *all* subtopics) just to read the one row's current status, which the caller already has in local state.
- **[app/syllabus/page.tsx:156-181](app/syllabus/page.tsx)** + **[lib/supabase.ts:222-252](lib/supabase.ts)** (`awardXPAndSync`) — one subtopic-status click chains: `updateSubtopicStatus` → internal `fetchSubtopics()` → `awardXPAndSync` → internal `fetchUserSettings()` → DB upsert → then the page calls `fetchUserSettings()` **again** redundantly. Up to 4 reads + 2 writes per click.
- **[lib/supabase.ts:572-577](lib/supabase.ts)** / **[lib/supabase.ts:602-607](lib/supabase.ts)** (`deleteSubject`/`deleteTopic`) — every delete click refetches `fetchTopics()`/`fetchSubtopics()` from scratch to count completed children, even though the calling page already holds this data.
- **[components/TaskCreatorModal.tsx:51-63](components/TaskCreatorModal.tsx)** — refetches subjects+topics+subtopics on every modal open (called from `app/syllabus/page.tsx:508-518` and `app/tasks/page.tsx:265-272`), even though both parent pages already hold this exact data in state.
- **[app/tasks/page.tsx:265-271](app/tasks/page.tsx)** — after creating one task, reloads *all* tasks + subjects instead of appending the created task to local state.
- **[lib/supabase.ts:222-252](lib/supabase.ts)** `awardXPAndSync` is called from 6 sites (lines 580, 608, 638, 640, 653, 934) and each independently re-fetches settings instead of accepting current settings as a parameter.

## 3. Over-fetching on load

- **[lib/supabase.ts:663-683](lib/supabase.ts)** (`fetchTasks`) always deep-joins `topic→subject`, `subtopic`, and `notes→overlays`, regardless of caller need:
  - **[app/tasks/page.tsx:45](app/tasks/page.tsx)** — list view pulls full notes/overlays payload for every task, every load.
  - **[app/today/page.tsx:84](app/today/page.tsx)** — Today view needs only due-date/priority but gets the same full payload.
  - **[app/focus/page.tsx:186](app/focus/page.tsx)** — fetches the full deep-joined list purely to populate a task-picker dropdown.
- **[app/tasks/page.tsx:67-82](app/tasks/page.tsx)** — fetches all tasks + all subjects on mount, then filters client-side on every keystroke of the search box (`onChange` at line 126) with no debounce and no server-side query.
- **[app/syllabus/page.tsx:82-104](app/syllabus/page.tsx)** — page-level load is reasonably scoped, but combined with §2's `TaskCreatorModal` duplication, subject/topic/subtopic data ends up fetched twice per "Study Subtopic" interaction.

## 4. Component structure

- **[app/focus/page.tsx:19-120](app/focus/page.tsx) vs [components/FullscreenFocusModal.tsx:27-128](components/FullscreenFocusModal.tsx)** — `FlipDigit` sub-component copy-pasted verbatim between the two files.
- **[app/focus/page.tsx:324-429](app/focus/page.tsx) vs [components/FocusTimerBlock.tsx:185-295](components/FocusTimerBlock.tsx)** — the finish/stop XP+rank-diff business logic (compute old level/rank/XP, call `recordRatedFocusSession`/`recordSessionStop`, diff old vs new, decide which modal to show) is duplicated near-verbatim — the same feature implemented twice instead of sharing a hook.
- **Modal shell duplication** — the `fixed inset-0 ... backdrop-blur-md flex items-center justify-center` wrapper is hand-copied across `components/ConfirmModal.tsx:35`, `components/FocusRatingModal.tsx:30`, `components/TaskCreatorModal.tsx:146`, `components/XPChangeModal.tsx:35`, `components/today/RoutineBlockFormModal.tsx:83`, and inline in `app/page.tsx:246`, `app/tasks/page.tsx:256`, `app/tools/bangla-vocab/page.tsx:560`, `app/study/[taskId]/page.tsx:84`. No shared `ModalShell` component exists.
- **[app/rank/page.tsx](app/rank/page.tsx)** — god component: data fetch, momentum/XP math, and a ~400-line static `rankRoadmap` data array all live in one file/function.
- **[lib/supabase.ts](lib/supabase.ts)** (945 lines) — module-level version of the same god-file pattern; every domain's data access lives in one file.
- **[app/topics/page.tsx](app/topics/page.tsx) vs [app/syllabus/page.tsx](app/syllabus/page.tsx)** — near-identical subject/topic CRUD handlers against the same `lib/supabase.ts` functions; `syllabus` is a strict superset. (`topics` also appears unreachable — see §5.)
- **[components/TaskCreatorModal.tsx](components/TaskCreatorModal.tsx)** — mixes dropdown data-fetching, submit/validation logic, and full form markup in one 311-line file.
- Prop drilling was checked for (`today` page → `PlacementLayer` → `PlacedTaskCard`; `app/page.tsx` → `NewStudyBlock`/`RevisionBlock`) — **not found**; every prop is consumed at each layer.

## 5. Zombie code

| Item | Confidence |
|---|---|
| **[app/topics/page.tsx](app/topics/page.tsx)** — no `Link`/`router.push` anywhere targets `/topics` (Navbar's `pathname === '/topics'` checks are just active-tab styling, not links) | Certain unreachable via in-app nav; still a live route if hit by direct URL — **flag for human decision**, don't delete blind |
| **[components/DDayBanner.tsx](components/DDayBanner.tsx)** — 5-line file that only re-exports `DDayBlock`; no other reference anywhere | Certain dead |
| **[lib/supabase.ts:517](lib/supabase.ts)** `recordFocusSession()` — thin wrapper around `recordRatedFocusSession(minutes, 4)`, zero call sites | Certain dead |
| **[lib/supabase.ts:803](lib/supabase.ts)** `deleteNote()` — exported, no call site found; no "delete note" UI exists | Likely dead — **uncertain, could be a half-built feature; ask before removing** |
| **[app/focus/page.tsx:7](app/focus/page.tsx)** imports `calculateLevelAndProgress`/`calculateGlobalHunterRank`, unused; same in **[components/FocusTimerBlock.tsx:7](components/FocusTimerBlock.tsx)** | Certain, unused imports |
| `oldMomentum` computed at **[app/focus/page.tsx:333,387](app/focus/page.tsx)** (and equivalently in `FocusTimerBlock.tsx`) but never read | Certain, dead computation |
| **[package.json:12,21](package.json)** — `clsx` and `tailwind-merge` declared as dependencies but **zero usages** found anywhere in the codebase | Certain, unused dependency |

Confirmed **not** dead (checked, ruled out): `app/api/upload`, `app/api/storage/delete` (called from `lib/newspaper.ts`/`lib/supabase.ts`); all 8 exports of `lib/routines.ts`; `app/today/routine/page.tsx` (linked from `app/today/page.tsx:252`). No commented-out code blocks found via pattern search, though that pass wasn't an exhaustive line-by-line read of all ~14k lines.

## 6. The "fallback always executes" bug — root cause found

**Mechanism**: **[lib/supabase.ts:21](lib/supabase.ts)** defines `DEFAULT_USER_ID = 'user-owner'`. **[lib/supabase.ts:64-72](lib/supabase.ts)** (`getCurrentUserId()`) returns this literal string whenever `supabase.auth.getUser()` doesn't resolve a user — even though `isSupabaseConfigured` is true and the schema requires a real `UUID` (`supabase_schema.sql`: every `user_id UUID NOT NULL REFERENCES auth.users(id)`, RLS `USING (auth.uid() = user_id)`). `'user-owner'` can never equal `auth.uid()`, so **any** read/write that falls back to it is rejected by RLS on every call — not intermittently, deterministically.

Compounding it — these paths never check the returned error, so the rejection is invisible:
- **[lib/supabase.ts:255-514](lib/supabase.ts)** — `updateWeekendDaysConfig`, `updateStudyTargetsConfig`, `updateDDayConfig`, `acknowledgeWeeklyRankModal`, `updateDayEndTimeConfig`, `updateQuotesConfig`, `updateShowRankFeaturesConfig`, `updateLastVocabXPDate` all `await supabase.from('user_settings').upsert({...})` with **no `error` check**. Supabase-js doesn't throw on a Postgrest/RLS failure — it returns `{data: null, error}` — so these "saves" can fail with zero indication.
- **[lib/supabase.ts:180-220](lib/supabase.ts)** `fetchUserSettings()` — if `.select().single()` returns no row (which it will, under the mismatch above), it falls into the "create defaults" branch, upserts with the same broken `user_id` (silently fails), and returns the in-memory defaults anyway. The UI looks functional while nothing persists.
- **[lib/banglaVocab.ts:75-112](lib/banglaVocab.ts)** `addBanglaWordDB()` — same bug class, independently: on DB error the `catch` only `console.error`s, then falls through to `return createdWord`, a client-fabricated object (`id: bv-${Date.now()}`) — the caller believes the save succeeded; the word disappears on next reload.
- **[lib/supabase.ts:745-749](lib/supabase.ts)** `updateTask()` — same missing error check.

Ruled out: env var names/prefixes in `lib/supabase.ts:7-19` and the login-page branch (`app/login/page.tsx:23-54`) are correct — not an inverted-boolean or wrong-env-var-name bug. This matches the existing project memory note that missing/misconfigured Supabase state silently no-ops settings persistence — the mechanism traced here is the concrete cause.

**Update — empirically confirmed against the live app during Phase 3 safety-net setup**, while writing the Playwright smoke tests. Both halves of this bug are firing right now, in the real deployed database, on every page load:

1. **`GET /rest/v1/user_settings?...&user_id=eq.user-owner` → 400** `{"code":"22P02","message":"invalid input syntax for type uuid: \"user-owner\""}`. This is `getCurrentUserId()`'s `'user-owner'` fallback actually triggering in a live, logged-in browser session (not just a theoretical risk) — confirming `supabase.auth.getUser()` is resolving with no user on some early calls even though the session is valid, most likely because Supabase's client hasn't finished rehydrating the session from storage yet when the first `fetchUserSettings()` call fires.
2. **`POST /rest/v1/user_settings` → 400** `{"code":"PGRST204","message":"Could not find the 'show_weekly_rank_modal' column of 'user_settings' in the schema cache"}` on **every single settings upsert**, for a second, independent reason: `show_weekly_rank_modal` is referenced in `lib/types.ts`, `lib/supabase.ts` (`DEFAULT_USER_SETTINGS`, every upsert payload), and `app/page.tsx`, but the column was **never added to any of the `supabase_*.sql` files in this repo** — confirmed via a repo-wide search, it exists only in application code. The live database's `user_settings` table (and PostgREST's schema cache) has no such column. This means every one of the 8 settings-save functions listed above has been failing on **every call**, not intermittently — the weekly-rank-modal-dismissal state, and everything bundled into the same upsert payload, has never actually persisted.

**M5 must therefore include a migration** (`ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_weekly_rank_modal BOOLEAN DEFAULT FALSE;`, added to `supabase_schema.sql` and run against the live database) in addition to the error-handling and `getCurrentUserId()` fixes — the error-handling fix alone would just make the same failure visible, not resolve it.

## 7. The full-page modal bug

Most modals are correctly built (portaled or portal-equivalent, `fixed inset-0` with no clipping ancestor) — verified against `app/layout.tsx:26-33`, which carries no `transform`/`filter`/`perspective`/`contain`: `components/ConfirmModal.tsx:34-35`, `components/TaskCreatorModal.tsx:145-146`, `components/today/RoutineBlockFormModal.tsx:82-83`, `components/FullscreenFocusModal.tsx:225-226`, `components/XPChangeModal.tsx:34-35`, `components/HunterEventModal.tsx:54-55`.

The bug is isolated to modals that **don't** follow that pattern:
- **[components/newspaper/NewspaperUploadModal.tsx:109](components/newspaper/NewspaperUploadModal.tsx)** — **confirmed, already git-documented**: rendered inline (no portal) inside `app/tools/newspaper-study/page.tsx:123-131`. Commit `ffd8acb` bumped its z-index from `z-50` to `z-[60]` because it tied with `Navbar.tsx:69`'s `sticky z-50` header. That patched the symptom, not the cause — the same class of stacking bug can recur the next time a nearby `z-` value changes.
- **[components/FocusRatingModal.tsx:30](components/FocusRatingModal.tsx)** and **[components/QuitTauntModal.tsx:26](components/QuitTauntModal.tsx)** — plausible risk: neither portals, unlike sibling modals `XPChangeModal`/`HunterEventModal` rendered from the exact same parents (`components/FocusTimerBlock.tsx:442-454`, `app/focus/page.tsx:630-642`) which do portal. No active breakage found today, but it's an inconsistent pattern one layout change away from clipping.
- **NoteUploader backdrop** — hand-duplicated inline (not portaled, not shared) at **[app/page.tsx:246](app/page.tsx)**, **[app/tasks/page.tsx:256](app/tasks/page.tsx)**, **[app/study/[taskId]/page.tsx:84](app/study/[taskId]/page.tsx)**. Three independent copies that can drift out of sync.

**Recommended direction**: standardize all of these on `createPortal(..., document.body)` to match the rest of the codebase, closing the whole bug class instead of patching z-index values one at a time.

## 8. General coding standards

1. **Data-access pattern** — inconsistent: `lib/banglaVocab.ts:52,140,164,240`, `lib/newspaper.ts`, `lib/routines.ts`, `app/settings/page.tsx:94-96`, `app/tools/synonym-practice/page.tsx:88,104`, `components/Navbar.tsx:35,54`, `components/classification/QuizSummary.tsx:55,60`, `components/synonym/QuizSummary.tsx:53,152` all call `supabase.from()`/`supabase.auth` directly instead of going through `lib/supabase.ts`.
2. **Error handling** — inconsistent: `lib/supabase.ts:736` throws on error; `lib/supabase.ts:745-749` doesn't check it at all; `lib/banglaVocab.ts:58-60,109-111,141-143` catches and swallows (console.error + fallback return); `lib/supabase.ts:823-846` throws descriptive errors (the strictest, best pattern in the file).
3. **`any` usage** — 42 occurrences across 19 files, concentrated in `components/classification/Dashboard.tsx:55,56,61,69,70`, `components/synonym/Dashboard.tsx` (5x), `lib/banglaVocab.ts:35,36,49` — despite typed interfaces already existing in `lib/types.ts` that could replace them.
4. **Naming** — consistent; no issues found (PascalCase components, camelCase lib files, snake_case DB fields carried consistently into JS object literals while local variables use camelCase).
5. **State management** — consistent (no shared store anywhere; uniformly local `useState` + prop-drilling).
6. **Styling** — `clsx`/`tailwind-merge` are declared dependencies with **zero usages** (dead deps, see §5); instead 25+ files mix raw inline `style={{...}}` objects with Tailwind classes on the same elements with no consistent convention, e.g. `app/focus/page.tsx:42,63,81`, `components/today/TaskDueChip.tsx:32`.
7. **File organization** — `app/tools/synonym-practice` and `app/tools/word-classification` colocate complexity into `components/synonym/`/`components/classification/` subfolders; `app/tools/bangla-vocab/page.tsx` (628 lines, the largest tool page) has no equivalent subfolder — everything lives in one file, breaking the pattern its siblings use.

---

## Prioritized Remediation Plan

Ordered per the agreed priority: **security → the two recurring bugs → performance → component structure & standards → zombie code removal.** Each milestone below is scoped to be its own short-lived branch, independently reviewable, mergeable, and revertible. Security items jump the queue as agreed.

### Security (jumps queue)
- **M1 — Authenticate `/api/upload` and `/api/storage/delete`.** Require a valid Supabase session (verify the caller's JWT server-side) before issuing a presigned URL or performing a delete; on delete, verify the target row(s)/URL(s) actually belong to the authenticated user before calling R2. Add basic request validation (content-type allowlist, filename sanitization, a size cap). This is the highest-severity, highest-priority fix in the audit — unauthenticated storage read/write/delete.
- **M2 — Scope `next.config.mjs` image `remotePatterns`** to the actual R2 public host + Supabase host instead of `'**'`.
- **M3 — Add a consistent route guard** (`middleware.ts` or an equivalent root-level check) so unauthenticated users are redirected consistently, replacing the current per-page ad hoc checks.
- **M4 (tracked, larger, separate)** — Next.js 14→16 upgrade to clear the 3 high-severity `npm audit` findings. Breaking change; schedule after Phase 3's safety net exists, as its own milestone with full regression testing.

### The two recurring bugs
- **M5 — Fix the fallback-always-wins bug.** Split per your restructure-then-behavior rule: (a) restructure `getCurrentUserId()` to surface a clear "not authenticated" signal instead of substituting a non-UUID default when Supabase is configured, and add error-checking to the 9 upsert/update call sites currently ignoring the returned error (§6) — verified against smoke tests, no behavior change yet; (b) then fix the actual behavior — decide and implement what should happen when a settings save fails (surface it to the user) rather than silently no-op-ing, and fix `lib/banglaVocab.ts:addBanglaWordDB` to not fabricate a fake-success object on DB error.
- **M6 — Fix the full-page modal bug.** Standardize `NewspaperUploadModal`, `FocusRatingModal`, `QuitTauntModal`, and the 3x duplicated `NoteUploader` backdrop onto `createPortal(..., document.body)`, matching the rest of the codebase; remove the now-unnecessary z-index patch from commit `ffd8acb` once the real fix is in.

### Performance (requests & loading)
- **M7 — Cut redundant refetches** in the subtopic-status/delete/XP flow: pass already-loaded state into `awardXPAndSync`/delete helpers instead of each independently calling `fetchSubtopics()`/`fetchTopics()`/`fetchUserSettings()`; update local state optimistically after mutations instead of full reloads.
- **M8 — Split `fetchTasks()`** into a lightweight list query (no notes/overlays join) for Tasks/Today/Focus views, and keep the deep join only where notes/overlays are actually needed (task detail/study view).
- **M9 — Debounce the Tasks search input** and avoid re-filtering the full unfiltered dataset on every keystroke.
- **M10 — Stop `TaskCreatorModal` from refetching** subjects/topics/subtopics on every open; accept already-loaded data from the parent page as props.

### Component structure & standards
- **M11 — Establish the target component pattern on one module first**, per your instruction: recommend the Focus feature (`app/focus/page.tsx` + `components/FocusTimerBlock.tsx` + `components/FullscreenFocusModal.tsx`) since it has the clearest, best-understood duplication — extract a shared `FlipDigit` component, a shared `useFocusTimer` hook for the finish/stop XP logic, and a shared `ModalShell` component. **Confirm the resulting pattern with you before applying it elsewhere.**
- **M12 — Consolidate direct Supabase calls** scattered across login/settings/Navbar/banglaVocab/newspaper/routines/synonym-practice into the data-access layer, once M11's pattern is confirmed (this is a structural decision — whether to keep one `lib/supabase.ts` or split into per-domain modules — worth a quick discussion before starting).
- **M13 — Resolve `clsx`/`tailwind-merge`**: either remove the unused dependencies or adopt them for the 25+ files mixing inline `style` objects with Tailwind classes (direction TBD with you).
- **M14 — Replace `any` usage** in `Dashboard.tsx` (classification/synonym) and `lib/banglaVocab.ts` with the existing `lib/types.ts` interfaces.

### Zombie code removal (last, most conservative)
- **M15 — Remove confirmed-dead code**: `components/DDayBanner.tsx`, `lib/supabase.ts:recordFocusSession()`, the unused `calculateLevelAndProgress`/`calculateGlobalHunterRank` imports and `oldMomentum` computations in `app/focus/page.tsx`/`FocusTimerBlock.tsx`.
- **M16 (needs your input, not auto-removed)**: `app/topics/page.tsx` (unreachable route — delete, or wire up a link if it's intentional future work?) and `lib/supabase.ts:deleteNote()` (no call site — half-built feature, or safe to remove?).

---

**Awaiting your approval before touching any code.** Once approved, Phase 3 sets up a minimal safety net (lint/format config, a basic CI check, smoke tests for critical flows) before M1 begins.

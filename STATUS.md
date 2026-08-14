# StudyHelper Remediation — Status Reconciliation

Phase A (read-only) output per the resume prompt. This reconciles `AUDIT.md`'s findings and
milestone plan against the actual current repo state — git history, branches, and code — rather
than assuming the plan is still accurate. No files were modified except this one.

## How this was verified

- `git log`, `git branch -a`, `git status`, `git stash list` — full history and working-tree state.
- `AUDIT.md` was authored at commit `5806f16` (the Phase 3 safety-net commit), i.e. **after** all
  the feature work visible in git log before it (Newspaper Study tool, R2 migration, word-
  classification study mode, etc.) — so that work was already accounted for in the audit's
  discovery pass, not interim drift. The only commits after `AUDIT.md` was written are `c4a3746`
  (M1), `aadb8fe` (M2), `0533cd0` (M3), `90974af` (M5), and `a312f99` (CLAUDE.md).
- For each of M1, M2, M3, M5 (the milestones claimed "Done" in `CLAUDE.md`), read the actual
  current source referenced by the audit finding and confirmed the fix matches — not just that
  `CLAUDE.md` asserts it.
- For each milestone still claimed "Not started," spot-checked that the code the finding
  describes is still present and unchanged in shape.

## Git state

- Working tree: clean, no stash. As of this reconciliation, local `main` is **9 commits ahead of
  `origin/main`** (the M6 and M7 milestone work — `docs/update-claude-md` housekeeping,
  `m6-portal-modals`, and `m7-cut-redundant-refetches`, each merged with `--no-ff`) — not yet
  pushed.
- `docs/update-claude-md` branch (the one flagged as a fully-merged stale leftover at the original
  reconciliation) was deleted 2026-08-13 per approval. `m6-portal-modals` and
  `m7-cut-redundant-refetches` still exist locally as merged branches; safe to delete as
  housekeeping whenever convenient.
- No uncommitted changes anywhere.

## Reconciliation of `AUDIT.md`'s plan

`CLAUDE.md` (added in the last commit) already contains an accurate status table. This
reconciliation independently verified it against source rather than trusting it at face value.
Verdict: **`CLAUDE.md`'s claims all check out.**

| # | Milestone | AUDIT.md classification | Verified status | Evidence |
|---|---|---|---|---|
| M1 | Authenticate `/api/upload` + `/api/storage/delete` | Critical, unauthenticated | **Done** | Both routes now call `authenticateRequest()` ([lib/apiAuth.ts](lib/apiAuth.ts)) and 401 on no session. Delete route additionally scopes the deletable set to rows the caller's own RLS-scoped client can see ([app/api/storage/delete/route.ts:25-33](app/api/storage/delete/route.ts)) — closes the "no ownership check" gap, not just the "no auth" gap. Content-type allowlist + 50MB cap present ([lib/r2.ts:24-33](lib/r2.ts)). |
| M2 | Scope `next/image` `remotePatterns` off `'**'` | Minor hardening | **Done** | [next.config.mjs:5-20](next.config.mjs) now derives the R2 host from `NEXT_PUBLIC_R2_PUBLIC_URL` instead of `'**'`. |
| M3 | Consistent route guard | RLS structurally undermined by inconsistent per-page checks | **Done** | [components/AuthGate.tsx](components/AuthGate.tsx) wraps `{children}` in `app/layout.tsx`, gates every route except `/login` on `getSession()`. **Leftover not cleaned up**: 5 pages (`app/page.tsx`, `app/today/page.tsx`, `app/today/routine/page.tsx`, `app/tools/newspaper-study/page.tsx`, `app/tools/synonym-practice/page.tsx`) still run their own pre-existing local session check too — confirmed still present. Harmless (AuthGate already redirects first), but the duplication itself is real and un-tracked as its own milestone (see below). |
| M4 | Next 14→16 upgrade | Deferred, tracked separately | **Not started** | No change. Still 2 majors behind; still the 3 high-severity `npm audit` findings from the original audit. |
| M5 | Fallback-always-executes bug + migration | Root-caused, both halves confirmed live-firing | **Done** | `getCurrentUserId()` ([lib/supabase.ts:71-82](lib/supabase.ts)) now throws instead of substituting `'user-owner'` when Supabase is configured but no session exists; only falls back when Supabase isn't configured at all (demo mode — correct, matches audit's recommended fix). All 8 named `user_settings` upsert functions now check `error` and throw. `addBanglaWordDB` ([lib/banglaVocab.ts:65-95](lib/banglaVocab.ts)) throws on DB error instead of fabricating a fake-success `bv-${Date.now()}` object. Migration applied: `ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_weekly_rank_modal ...` present in [supabase_schema.sql:165](supabase_schema.sql), and per `CLAUDE.md` already run against the live DB. |
| M6 | Full-page modal bug | `NewspaperUploadModal`, `FocusRatingModal`, `QuitTauntModal`, 3x `NoteUploader` backdrop | **Done**, merged 2026-08-13 | All 6 sites now `createPortal(..., document.body)`. Verified live: modal renders as a `<body>` sibling, not nested under the navbar's stacking context, and its rect exactly matches the viewport. See commit `a9a1fea`. |
| M7 | Redundant refetches (subtopic status/delete/XP) | — | **Done**, merged 2026-08-13 | `updateSubtopicStatus`/`deleteSubject`/`deleteTopic`/`deleteSubtopic` now take caller-supplied state instead of re-fetching; also folded in the same fix for the bangla-vocab XP flow (found during M7, not in original audit scope). See "M7 — done" section below and commits `e693474`/`edf0e48`. |
| M8 | Split `fetchTasks()`'s deep join | — | **Done**, merged 2026-08-13 | See "M8 — done" section below. |
| M9 | Debounce Tasks search | — | **Done**, merged 2026-08-13 | See "M9 — done" section below. |
| M10 | `TaskCreatorModal` refetch-on-open | — | **Done**, merged 2026-08-13 | See "M10 — done" section below. |
| M11 | Focus feature target pattern (`FlipDigit`, shared hook, `ModalShell`) | — | **Done**, merged 2026-08-13 | See "M11 — done" section below. |
| M12 | Consolidate direct-Supabase call sites into `lib/supabase.ts` | — | **Done**, merged 2026-08-13 | See "M12 — done" section below. |
| M13 | `clsx`/`tailwind-merge` unused deps | — | **Done**, merged 2026-08-14 | See "M13 — done" section below. |
| M14 | Replace `any` with `lib/types.ts` interfaces | — | **Skipped, by decision** | Scoped out to 23 occurrences (16 named + 7 same-class), then skipped entirely — confirmed pure type-safety gap, no runtime/behavior impact, deferred indefinitely rather than done. |
| M15 | Remove confirmed-dead code | `DDayBanner.tsx`, `recordFocusSession()`, unused imports, `oldMomentum` | **Done**, merged to `main` 2026-08-14 | See "M15 — done" section below. |
| M16 | `app/topics/page.tsx` / `deleteNote()` — needs your input | — | **Done**, merged to `main` 2026-08-14 | See "M16 — done" section below. |

## New issue found during reconciliation (not in `AUDIT.md`, not yet in any milestone)

**`updateTask()` still has the missing-error-check bug** — [lib/supabase.ts:783-787](lib/supabase.ts):

```ts
export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('tasks').update(updates).eq('id', id);
  }
}
```

This was flagged in `AUDIT.md` §6 ("same missing error check") as part of the same bug class
M5 fixed, but it's a `tasks` write, not one of the 8 named `user_settings` functions or
`addBanglaWordDB` — so it was correctly out of M5's stated scope, and it's still broken today.

**Decision (2026-08-13): folded into M11.** M11 already touches the Focus feature, which calls
`updateTask` for manual-complete / spaced-repetition advancement — fix it there rather than as a
separate milestone.

**Correction (2026-08-13, while doing M11):** that premise was wrong. Traced every call site of
`updateTask()` and it's called from exactly one place — `components/ImageOcclusionViewer.tsx:137`
(the image-occlusion spaced-repetition review flow) — not anywhere in the Focus feature
(`app/focus/page.tsx`, `components/FocusTimerBlock.tsx`, `components/FullscreenFocusModal.tsx`
call `recordRatedFocusSession`/`recordSessionStop`, never `updateTask`). Fixed it as its own
commit within the M11 branch anyway, since it was already approved to bundle with M11 and is a
small, isolated, already-correctly-scoped fix — but flagging the location mismatch per the
working rule to call out drift rather than silently let a wrong premise stand.

## Housekeeping note

`docs/update-claude-md` branch was fully merged (identical to `main` tip) — deleted 2026-08-13
per approval.

## Updated, re-prioritized milestone list carried forward

No re-prioritization needed — `AUDIT.md`'s ordering (security → the two recurring bugs →
performance → component structure & standards → zombie code) still holds.
M1/M2/M3/M5/M6/M7/M8/M9/M10/M11/M12/M13/M16/M15 are done, in that order (M14 skipped, M16/M15
taken out of order per your request). Remaining, top-to-bottom from where it left off:

1. **M4** — Next.js 14→16 upgrade — large breaking-change milestone, deliberately deferred;
   the last milestone from `AUDIT.md`'s original plan.

**Investigated and fixed, outside the milestone plan** (2026-08-14, your instruction after M15):
the subject/topic CRUD smoke test failure — root-caused to a real bug in
`app/syllabus/page.tsx`, fixed on `fix-syllabus-create-load-race`. See below for detail.

**M14 — skipped, not done.** Your call: `any` usage is a pure compile-time type-safety gap, not
a live bug — `typecheck`/`lint`/`build` all already pass clean with it in place, and nothing in
the app behaves differently with or without it. Can be picked up later if wanted; no code changed
for this milestone.

## New item found during M16, not yet actioned

`deleteSubject()`/`deleteTopic()` in [lib/supabase.ts](lib/supabase.ts) each take an *optional*
completed-count param specifically because `app/topics/page.tsx` used to call them without it
(see M7's write-up below) — `app/syllabus/page.tsx` always passes it. Now that M16 removed
`app/topics/page.tsx`, nothing calls either function without the count param, so the fallback
"re-fetch the count myself" branch inside each is dead code my own M16 change just created.
Small, low-risk, mechanical (make the param required, delete the fallback branch) — flagging
per the "call out scope expansion" rule rather than silently fixing it. Natural fit for M15
alongside the other confirmed-dead-code cleanup, or happy to do it now if you'd rather.

## Approvals received (2026-08-14)

22. M13 direction: remove `clsx`/`tailwind-merge` rather than adopt them.
23. Skip M14 (`any` cleanup) — confirmed no runtime/behavior impact either way, deferred
    indefinitely rather than done now.
24. Do M16 next (ahead of M15), with both decisions below.
25. `app/topics/page.tsx`: delete it (fully superseded by `/syllabus`).
26. `deleteNote()`: finish the feature — wire it up to a real "Delete Note" button rather than
    deleting the function or leaving it unused.
27. M16 merged to `main`. Proceed to M15, folding in the `deleteSubject`/`deleteTopic`
    dead-fallback-branch item found during M16.

## Approvals received (2026-08-13)

1. Proceed to Phase B, starting with M6, on its own branch.
2. `updateTask()` error-check fix folded into M11.
3. Stale `docs/update-claude-md` branch deleted.
4. M6 verified and merged to `main`.
5. Proceed to M7.
6. M7 verified; bangla-vocab refetch fix (found during M7) folded into M7 rather than a separate
   milestone.
7. M7 (including the bangla-vocab fold-in) merged to `main`.
8. Proceed to M8.
9. M8 split design: 3-tier split (Today/Focus get no notes join; Home/Task Library get a slim
   note-id + overlay-id-only join instead of the audit's assumed "no notes at all"; detail/study/
   occlude views keep the full deep join).
10. Occlude page's fetch-all-tasks-to-find-one-note pattern (found during M8, not in `AUDIT.md`'s
    scope) folded into M8 rather than a separate milestone.
11. M8 verified and merged to `main` (commit `2275edc`).
12. Proceed to M9.
13. M9 verified and merged to `main`.
14. Proceed to M10.
15. M10 verified and merged to `main`.
16. Proceed to M11.
17. M11 verified and merged to `main`.
18. M12 structural question: `lib/supabase.ts` stays one file (not split into `lib/data/*.ts`) —
    matches the current convention everywhere else, no import-path churn.
19. `components/classification/Dashboard.tsx` and `components/synonym/Dashboard.tsx` — found
    during M12, calling `supabase.from()` directly same as their sibling `QuizSummary` components
    but never named in `AUDIT.md`/this file's M12 scope — folded into M12 rather than handled
    separately.
20. Deeper interactive live-check (bangla-vocab CRUD, newspaper upload, routines, the settings
    save-click, synonym/classification quizzes) blocked on retrieving the test account password
    from `.env.local` to type into the browser pane — the permission classifier denied it twice
    (Bash and PowerShell) as credential exposure, correctly, since it would have put the plaintext
    password in the assistant's own context. Rather than route around that, asked you directly:
    you chose to accept typecheck/lint/build-clean + the Playwright smoke suite (9/9 passing,
    covers login/Navbar/6 core pages) as sufficient verification for this milestone, given it's a
    structural-only relocation with no intended behavior change.
21. M12 merged to `main`.

## Syllabus create/initial-load race — fixed (2026-08-14)

Outside the milestone plan — you asked me to investigate the subject/topic CRUD smoke-test
failure flagged in "M15 — done" below. Fixed on `fix-syllabus-create-load-race` (commit
`bcab791`), pending merge to `main`.

**Root cause, confirmed with hard evidence, not just code-reading**: extracted the failed test
run's Playwright trace (`trace.zip`, network events) and found the create-subject `POST
/rest/v1/subjects` and the initial-load's `GET /rest/v1/subtopics` (the slowest of
`loadSyllabusData()`'s three parallel fetches) resolved within 1ms of each other:

| Time | Event |
|---|---|
| `43.220` | Test navigates to `/syllabus` |
| `43.286` | Initial load fires 3 parallel fetches: `subjects`, `topics`, `subtopics` |
| `43.373` | Test fills + clicks "Add Subject" → `POST /rest/v1/subjects` |
| `43.485` | Both the `POST` and the `subtopics` `GET` resolve, ~same instant |

[app/syllabus/page.tsx](app/syllabus/page.tsx)'s three creation forms (subject/topic/subtopic)
were interactive immediately on mount — the page's `loading` flag only gated the tree-display
section below them, not the forms above. `loadSyllabusData()`'s `Promise.all` and
`handleCreateSubject`'s optimistic `setSubjects((prev) => [...prev, created])` both independently
call `setSubjects()`; whichever resolves last wins. In the failed run, the initial load's
`setSubjects(sData)` (queried before the insert committed) resolved after the optimistic update
and silently overwrote it — the create had already succeeded and persisted correctly in the
database the whole time, it just vanished from the UI. Same shape bug for `topics`/`subtopics`
creation, not just `subjects`.

**Why this surfaced now and not in M7-M13's prior "9/9 passing" runs**: the test account has
accumulated roughly a dozen orphaned `Smoke Subject <timestamp>` rows from this session's earlier
stale-server-artifact failures (see "M15 — done" below). More rows means a slower `subtopics`
deep-join fetch, which widens the race window enough to reliably collide with a fast
Playwright-driven create. A cleaner account was likely just lucky before, not immune.

**Fix**: added `|| loading` to all three forms' submit-button `disabled` conditions — same gate
the tree-display section already uses, so creation simply can't happen until the initial load has
settled. Minimal, one file, no other behavior change.

**Verified**: `typecheck`/`lint`/`build` all clean (identical pre-existing warnings, no new ones).
Re-ran the full Playwright smoke suite clean (no leftover server process this time): **9/9
passing**, including the previously-failing CRUD test.

**Not done**: cleanup of the orphaned `Smoke Subject <timestamp>` rows still sitting in the live
test account from earlier failed runs. Out of scope for this fix; flagging again in case you want
it done separately.

## M16 — done (2026-08-14)

Fixed on `m16-topics-page-deletenote` (commits `a83e9c9`, `74b9b82`, `d046fee`), pending merge to
`main`. Three separate commits, per the "never mix a structural refactor with a behavior change"
rule: removal, then a bug fix the new UI depends on, then the new UI itself.

**Investigation, before either decision was made**: traced both items past what `AUDIT.md`
originally established.
- `app/topics/page.tsx` — confirmed its `createSubject`/`createTopic`/`deleteSubject`/
  `deleteTopic` calls are the exact same functions [app/syllabus/page.tsx](app/syllabus/page.tsx)
  already calls from its own inline tree UI — nothing on `/topics` isn't already available on
  `/syllabus`. Combined with `AUDIT.md`'s original "no nav link targets `/topics`" finding
  (still true), this is a superseded duplicate, not a half-built or uniquely-necessary page.
- `lib/supabase.ts:deleteNote()` — read it in full: correctly implemented (deletes the R2 image
  via `deleteNoteImagesFromR2`, then the DB row), not leftover refactor debris. Checked
  [components/NoteUploader.tsx](components/NoteUploader.tsx) and the rest of the note-viewing UI
  for any "delete this note" entry point — none exists; task deletion has its own separate,
  inline note-image-cleanup logic that doesn't call this function. Concluded this is a genuinely
  half-built feature (backend written, UI never added), not dead code.

Presented both findings and the distinction between them to you; you chose **delete** for
`app/topics/page.tsx` and **finish the feature** for `deleteNote()`.

**1. Removed `app/topics/page.tsx`** (commit `a83e9c9`). Also removed the now-dead
`pathname === '/topics'` half of the active-tab check in both the desktop and mobile nav blocks
of [components/Navbar.tsx](components/Navbar.tsx) — left as `pathname === '/syllabus'` only,
since `/topics` no longer resolves to anything a `pathname` could ever equal.

**2. Fixed `deleteNote()`'s missing error check** (commit `74b9b82`). Same bug class as
`AUDIT.md` §6 (the class M5/M11 already fixed elsewhere): the final
`supabase.from('notes').delete()` call never checked its response, so a failed delete was
indistinguishable from a successful one. Not previously flagged because nothing called this
function yet — but wiring it to a real button (next commit) meant a silent failure would have
sent the user back to `/tasks` believing the note was gone when it wasn't. Now throws on error,
matching the `{ error } = await ...; if (error) throw error;` pattern used ~10 times elsewhere in
the file.

Noted but **not fixed**: `deleteTask()` ([lib/supabase.ts:889](lib/supabase.ts)) has the
identical missing-error-check gap, immediately above `deleteNote()` in the same file. Out of
scope here — flagging rather than silently expanding into it.

**3. Wired `deleteNote()` to a "Delete Note" button** (commit `d046fee`), in
[components/ImageOcclusionCreator.tsx](components/ImageOcclusionCreator.tsx)'s header toolbar
(the note/overlay editor at `/notes/[noteId]/occlude`) — the one screen a user is already looking
at a single note on its own. `confirm()` → `deleteNote(noteId)` → `router.push('/tasks')` on
success; a red inline error banner (matching the existing pattern in `NoteUploader.tsx`/the old
`app/topics/page.tsx`) on failure, instead of navigating away as if it worked.

**New item found while doing this, not yet actioned** — see the "New item found during M16"
section above: `deleteSubject()`/`deleteTopic()`'s optional completed-count parameter existed
specifically to support `app/topics/page.tsx`'s call pattern; with that page now gone, the
fallback branch inside each function is newly-dead code. Flagged for M15 rather than folded in.

Verified: `npm run typecheck` clean (after clearing a stale `.next/types` cache that still
referenced the deleted route — expected, not a real error). `npm run lint` clean, identical
pre-existing warning set, `/topics`'s own warnings gone with the file. `npm run build` clean —
route table confirms `/topics` no longer exists as a build output at all. Confirmed live against
the dev server: `GET /topics` now returns a real `404` (server log), not a redirect-to-login or
stale cached page.

**Not done**: an interactive logged-in click-test of the actual "Delete Note" button (create a
note, click delete, confirm it's gone from Supabase/R2). Same blocker as M12's approval #20 —
exercising it requires the test account's password, which I won't type into a form myself under
any circumstance, including with your authorization. If you want this exercised before merging,
either run it yourself against the dev server, or let me know and I'll rely on typecheck/lint/
build-clean plus the code read above as sufficient, same tradeoff M12 made.

## M15 — done (2026-08-14)

Fixed on `m15-remove-dead-code` (commits `8c1d7d3`, `a0aa3c9`, `d382fbd`, `6df3871`), pending merge
to `main`. Four commits, one per item, per "small commits scoped to one concern each."

**1. Removed `components/DDayBanner.tsx`** — grep confirmed zero imports anywhere in the codebase
(only mentioned in `AUDIT.md`/`STATUS.md`'s own descriptions of it).

**2. Removed `lib/supabase.ts:recordFocusSession()`** — grep confirmed zero call sites after
removal too (no compile error, nothing else referenced it).

**3. Removed a third, previously-unflagged dead `oldMomentum` computation**, in
[components/ImageOcclusionViewer.tsx:121](components/ImageOcclusionViewer.tsx) — same pattern
`AUDIT.md` flagged for `app/focus/page.tsx`/`FocusTimerBlock.tsx` (already fixed by M11), found
here while re-checking the item's current scope. Confirmed `oldMomentum` was computed via
`calculateMomentum()` but never read anywhere after; `newMomentum` (the value actually used, at
line 181) is a separate variable, unaffected. Also confirmed the item `AUDIT.md` originally named
— unused `calculateLevelAndProgress`/`calculateGlobalHunterRank` imports in `app/focus/page.tsx`/
`FocusTimerBlock.tsx` — no longer exists at all (both files' import lists were fully replaced by
M11's `useFocusTimer` extraction); no action needed there.

**4. Removed `deleteSubject()`/`deleteTopic()`'s dead fallback branch** (the item found during
M16) — made `completedChildCount` a required param and deleted the "re-fetch the count myself"
branch, now unreachable since `app/topics/page.tsx` (M16) was the only caller that omitted it.

Verified: `npm run typecheck`/`lint`/`build` all clean (identical pre-existing warning set, no new
ones). Ran the Playwright smoke suite twice; the first two attempts (9 and then 8 of 9 failing)
turned out to be a testing-process artifact, not a real regression — worth recording in detail
since it looked alarming at first:

- **Root cause, diagnosed then fixed**: an earlier `npm run test:e2e` run's own `webServer` had
  started a production server that was never cleaned up (orphaned on port 3000, PID confirmed via
  `netstat`). A later `npm run build` I ran manually for typecheck/lint verification regenerated
  `.next` with a new build ID while that stale server was still alive — so its in-memory HTML kept
  referencing JS/CSS chunk paths that no longer existed on disk (confirmed via the browser tool:
  `main-app.js`, `layout.js`, `layout.css` etc. all 404ing). The app's React never hydrated as a
  result, so *every* client-side effect — including `AuthGate`'s redirect check and the login
  form's submit handler — silently never ran, which is why even the login-independent
  "unauthenticated visitor redirected to `/login`" test hung for the full 30s timeout. Killed the
  stale process (`taskkill //PID 16412 //F`) and re-ran cleanly.
- **After the fix**: 8 of 9 pass — login, unauthenticated redirect, and all 6 core-navigation
  pages. Confirms M15's actual code changes introduced no regression in anything those tests
  cover.
- **1 still failing, not caused by M15**: the subject/topic CRUD test fails at the *create*
  step — the new subject never appears in the list after clicking "Add Subject" (the button ends
  up disabled, consistent with the submit completing and the input clearing, but the list not
  reflecting it). This never reaches `deleteSubject()`/`deleteTopic()` (M15's only change in this
  area) — the test fails before deletion is ever attempted. Two live-account artifacts from the
  earlier failed runs are visible in the page snapshot: several orphaned `Smoke Subject
  <timestamp>` rows never got cleaned up (their runs failed before reaching the delete step) — one
  possible contributing factor, not confirmed as the cause. **Not investigated further or fixed**
  — `app/syllabus/page.tsx`'s create-subject flow and `createSubject()` are both untouched by
  M15/M16, so this is either a pre-existing bug or a new one from something outside this session's
  changes; flagging per the "call out rather than silently fold in" rule rather than expanding
  M15's scope to chase it.

**Not done**: cleanup of the orphaned `Smoke Subject <timestamp>` test rows left in the live
account by earlier failed runs. Didn't attempt it — out of scope for M15, and touching live
account data wasn't something this milestone called for.

## M13 — done (2026-08-14)

Fixed on `m13-remove-clsx-tailwind-merge` (commit `0a97fc4`), pending merge to `main`.

Removed `clsx` and `tailwind-merge` from `package.json`'s `dependencies` and ran `npm install` to
sync `package-lock.json` and `node_modules` (2 packages removed). Reconfirmed zero usages
repo-wide (`.ts`/`.tsx`, both plain-string and `import` forms) immediately before removal — same
result as the original audit and this file's earlier reconciliation.

**Decision (2026-08-14, your call)**: remove rather than adopt. The ~25 files mixing inline
`style` objects with Tailwind classes (`AUDIT.md`'s M13 finding) are left as-is — no behavior or
markup change anywhere, this milestone only touches dependency manifests.

Verified: `npm run typecheck` clean. `npm run lint` clean (identical pre-existing warning set —
same `react-hooks/exhaustive-deps`/`no-img-element` warnings, no new ones, no clsx-related
warnings since there were no usages to begin with). `npm run build` clean, route bundle sizes
byte-identical to before this change (expected — these packages were never imported, so removing
them changes nothing at build time). `npm run test:e2e`: 9/9 passing.

## M12 — done (2026-08-13)

Fixed on `m12-consolidate-supabase-calls`, merged to `main`. Physically relocated every
`supabase.from()`/`supabase.auth` call that lived outside `lib/supabase.ts` into new exported
functions there, so `lib/supabase.ts` is now actually the single place the Supabase client is
touched from (per your M12 structural decision, added to the existing file rather than split into
per-domain modules).

**Scope**: the 8 files named in `AUDIT.md`/this file's table (`lib/banglaVocab.ts`,
`lib/newspaper.ts`, `lib/routines.ts`, `app/settings/page.tsx`,
`app/tools/synonym-practice/page.tsx`, `components/Navbar.tsx`,
`components/classification/QuizSummary.tsx`, `components/synonym/QuizSummary.tsx`), plus
`components/classification/Dashboard.tsx` and `components/synonym/Dashboard.tsx` (found during
this milestone, folded in per go-ahead — see approval #19).

**Approach — structural only, no behavior changes**: every new `lib/supabase.ts` function is a
direct, self-contained relocation of the exact `supabase.from()`/`.auth` call it replaces —
same guard conditions, same error-checked-vs-swallowed pattern as the original call site, same
return shape. Nothing was "fixed" or normalized while moving it, including the inconsistencies
`AUDIT.md` §6/§8 already flagged as separate, not-yet-approved cleanup:
- `app/settings/page.tsx`'s week-start-day save (`updateWeekStartDayConfig`, new) still silently
  no-ops if there's no signed-in user, instead of throwing like `getCurrentUserId()` does — this
  was already the page's own behavior before the move (it used `auth.getUser()` directly, not
  `getCurrentUserId()`), not a newly discovered bug, and not touched.
- `lib/routines.ts`'s local user-id lookup (`getCurrentUserIdOrDefault`, new) still falls back to
  the placeholder `'user-owner'` string on no session instead of throwing, distinct from this
  file's `getCurrentUserId()` — same reasoning, preserved as-is, not unified.
- `lib/banglaVocab.ts`'s `updateBanglaWordDB`/`deleteBanglaWordDB`/`clearAllBanglaWordsDB`/
  `fetchBanglaWordsDB`/`importBanglaWordsDB` still swallow DB errors to `console.error` (only
  `addBanglaWordDB` throws, per M5's scope) — unchanged.

**New `lib/supabase.ts` functions added** (grouped by the section comments in the file):
- Bangla vocab: `fetchBanglaVocabRows`, `deleteBanglaVocabRowsByIds`, `insertBanglaVocabRow`,
  `updateBanglaVocabRow`, `deleteBanglaVocabRow`, `insertBanglaVocabRows`,
  `deleteBanglaVocabRowsByUserId`.
- Newspaper: `insertNewspaperPdfRow`, `insertNewspaperPageRows`, `selectNewspaperPdfs`,
  `selectNewspaperPdfById`, `selectNewspaperPagesByPdfId`, `updateNewspaperPageReadStatus`,
  `updateNewspaperPageComment`, `selectNewspaperPdfUrlById`, `deleteNewspaperPdfRow`.
- Routines/placements: `getCurrentUserIdOrDefault`, `selectRoutineBlocks`,
  `insertRoutineBlockRow`, `updateRoutineBlockRow`, `deleteRoutineBlockRow`,
  `selectPlacementsForDate`, `upsertTaskPlacementRow`, `updatePlacementDurationRow`,
  `deletePlacementRow`.
- Settings: `updateWeekStartDayConfig`.
- Navbar/auth: `getCurrentUserEmail`, `signOutUser`, `getCurrentAuthUser` (shared by both
  `QuizSummary` components).
- Synonym practice tool: `fetchSynonymWords`, `fetchCompletedSynonymChunks`,
  `fetchSynonymSrsForWords` (shared by the practice page's session-start prioritization *and*
  `QuizSummary`'s post-quiz SRS update, since both queried the same shape), `fetchAllSynonymSrsRecords`,
  `fetchAllSynonymQuizAttempts`, `insertSynonymQuizAttempt`, `upsertSynonymSrsRecords`,
  `insertIncorrectSynonymAnswers`, `markSynonymChunksCompleted`.
- Word classification tool: `fetchAllClassificationQuizAttempts`, `fetchAllClassificationSrsRecords`,
  `insertClassificationQuizAttempt`, `fetchClassificationSrsForWords`,
  `upsertClassificationSrsRecords`, `markClassificationChunksCompleted`.

**Deliberately left untouched**: `app/tools/synonym-practice/page.tsx`'s own `checkSession` effect
(`supabase.auth.getSession()`) — that's the separate, already-documented M3-leftover-duplication
(one of the "5 pages" noted in `CLAUDE.md`), not part of M12's scope per this file's earlier
reconciliation note distinguishing the two.

**Found during this milestone, not in `AUDIT.md`'s cited line numbers**: `AUDIT.md` §8 cited only
2 line numbers per multi-call-site file (e.g. `app/tools/synonym-practice/page.tsx:88,104`), but
several of the 8 named files had additional direct calls the audit's line references missed
entirely — a third call in `synonym-practice/page.tsx`'s `handleStartSession` (line ~212, same
`user_synonym_srs` shape as `QuizSummary`'s, now sharing `fetchSynonymSrsForWords`), and the full
multi-step SRS read/write sequences inside both `QuizSummary` components weren't reducible to just
their 2 cited lines each. `CLAUDE.md`'s own characterization of these files ("all call
`supabase.from()`/`supabase.auth` directly instead of going through `lib/supabase.ts`") already
covers this at the whole-file level, so fixing every call site in each of the 8 named files was
treated as in-scope, not a further expansion needing separate approval — only the 2 wholly
unnamed Dashboard.tsx files needed that (approval #19).

**Verified**: `npm run typecheck` clean. `npm run lint` clean (identical pre-existing warning set —
same `react-hooks/exhaustive-deps`/`no-img-element` warnings as before this change, no new ones).
`npm run build` clean, route bundle sizes essentially unchanged (this was a pure code-motion
refactor, not a behavior or bundle-shape change). `npm run test:e2e` (Playwright smoke suite
against the production build): 9/9 passing — unauthenticated redirect, login, `/today` `/tasks`
`/syllabus` `/rank` `/settings` `/tools` all loading without unexpected console errors (exercises
the new `getCurrentUserEmail`/`signOutUser` via `Navbar`), and the full subject/topic create-delete
flow. Deeper interactive verification (bangla-vocab CRUD, newspaper upload/read-toggle/comment/
delete, routines create/update/delete, the settings week-start-day save-click, synonym/
classification quiz-and-dashboard flows) was not performed this session — see approval #20 for why,
and your decision to accept the above as sufficient given this milestone changes no behavior, only
where each Supabase call physically lives.

## M11 — done (2026-08-13)

Fixed on `m11-focus-component-pattern`, merged to `main`, as four
separate commits (three structural extractions, then the `updateTask()` behavior fix, per the
"never mix a structural refactor with a behavior change" rule).

**1. `components/FlipDigit.tsx`** — was byte-for-byte identical (confirmed via `diff`) between
`app/focus/page.tsx` and `components/FullscreenFocusModal.tsx` (only a code comment differed).
Moved to its own file; both call sites now import it.

**2. `hooks/useFocusTimer.ts`** — the entire timer engine (state, localStorage persist/restore,
tick loop + 10-minute pause-timeout checker, toggle/reset, finish/stop XP+rank-diff logic, XP/
event-modal orchestration) was duplicated near-verbatim between `app/focus/page.tsx` and
`components/FocusTimerBlock.tsx` — not just the finish/stop functions `AUDIT.md` named, since
those functions share almost all of that state. Extracted the whole thing; each caller now owns
only what's actually caller-specific:
- `app/focus/page.tsx` (the dedicated fullscreen route) — owns `tasks` (its own fetch), quote
  index, ego message; passes `isFullscreen: true` (pinned, this route *is* the fullscreen UI).
- `components/FocusTimerBlock.tsx` (the Home-page compact card) — owns its own `isFullscreen`
  toggle state (used only to restore the `FullscreenFocusModal` inline if a reload finds a
  persisted session that was mid-fullscreen elsewhere; the "open fullscreen" button navigates to
  `/focus` directly, it doesn't flip this flag) and `onSessionComplete`.
- Two spots where the two original copies had quietly drifted, standardized during the merge:
  - the paused-session restore guard was `pausedSeconds !== null` in one copy, `pausedSeconds > 0`
    in the other — kept the stricter `> 0` check.
  - `oldMomentum` was computed but never read in both copies of both `handleFinishRating` and
    `handleStop`; `newMomentum` was also dead in `handleStop` specifically (only used in
    `handleFinishRating`). Dropped both dead variables rather than copy-pasting them into the new
    shared file — this is the same `oldMomentum` dead-code item `AUDIT.md`/`CLAUDE.md` already
    flagged for M15, satisfied here as a side effect (see M15's row above).
- `next.config.mjs` — added `eslint.dirs` including `hooks`. `next lint`'s default dirs
  (`app`/`pages`/`components`/`lib`/`src`) don't cover a top-level `hooks/`; `npm run lint` was
  silently not scanning the new file at all (confirmed: the same exhaustive-deps warnings the new
  hook carries over from the two old files didn't show up under plain `npm run lint`, but did once
  `eslint.dirs` was added) — without this fix the CI lint gate would never see this file.

**3. `components/ModalShell.tsx`** — the portal + mounted-gate + backdrop-overlay boilerplate
(`useState` mounted flag, `useEffect` to flip it, `if (!isOpen || !mounted) return null`,
`createPortal(..., document.body)`) was hand-duplicated across `FocusRatingModal`,
`QuitTauntModal`, `XPChangeModal`, `HunterEventModal`, and `FullscreenFocusModal` — the exact
`ModalShell` gap `CLAUDE.md` already names. Extracted it; each modal now supplies only its own
overlay classes (z-index/blur/background/animation genuinely differ between them) and its card
markup as children. `HunterEventModal`'s and `FullscreenFocusModal`'s body-scroll-lock effect
moved into `ModalShell` behind a `lockScroll` prop (the other three never locked scroll).
`FullscreenFocusModal` keeps an early `if (!isOpen)` branch before its task-list filtering, but
still always renders `ModalShell` underneath (with `isOpen={false}`) rather than skipping it —
skipping it would reset `ModalShell`'s own mounted-state and cause a one-frame flicker each time
the modal reopens, since its parent (`FocusTimerBlock`) re-renders every timer tick regardless.
This extraction only applied the pattern within the Focus feature's own 5 modals, per the audit's
"one module first" instruction — the other ~4 hand-duplicated modal-backdrop sites elsewhere in
the codebase are unchanged, still awaiting the "confirm the pattern before applying it elsewhere"
go-ahead.

**4. `updateTask()` missing error check** — see the correction note above; this turned out to
belong to the image-occlusion review flow, not the Focus feature, but was fixed here anyway as
already agreed. Verified by code inspection (matches the exact `{ error } = await
supabase...; if (error) throw error;` pattern M5 already used successfully 9 times elsewhere) and
that the one call site already has a try/catch that aborts the finish-session flow correctly on a
thrown error — not live-tested end-to-end, since exercising it requires a note with at least one
overlay already created, disproportionate setup for a one-line change.

Verified (extractions 1–3): typecheck clean, lint clean (same pre-existing warning set — the
`exhaustive-deps` warnings for the old `FocusTimerBlock.tsx`/`app/focus/page.tsx` duplication
correctly collapsed into fewer warnings on the new shared `hooks/useFocusTimer.ts` instead of
disappearing), production build clean (`/focus` route's bundle dropped from 7.04 kB to 4.25 kB).
Live-checked against a production build, logged in as the real test account (temporarily flipped
`show_rank_features` on for the account — it was off — and flipped it back off afterward):
- Compact `FocusTimerBlock` on Home: start/tick/stop, `QuitTauntModal` opens with the correct
  rank-specific taunt message.
- Fullscreen `/focus` route: `FlipDigit` renders and ticks correctly, ego-attack message appears
  once active, "Exit Fullscreen" returns to Home.
- Cross-component persistence: started a session on `/focus`, confirmed `fullscreen: true` was
  written to `localStorage`, reloaded on `/` and confirmed `FocusTimerBlock` correctly restored
  the running session *and* reopened `FullscreenFocusModal` inline (the restore-only path,
  distinct from the "open fullscreen" button which navigates to `/focus` instead) — then closed
  it and confirmed `fullscreen: false` was persisted.
- Finish-rating flow: simulated an expired session via `localStorage`, confirmed
  `FocusRatingModal` appears, claiming it awards XP correctly (`55/100` → `85/100`), opens
  `XPChangeModal`, and closing it correctly does *not* chain into `HunterEventModal` when no
  level/rank change occurred.
- Level-up chaining: repeated the same simulated-finish once more to cross the level threshold
  (`85/100` → rolled over to Level 2, `15/282`); confirmed `XPChangeModal` closes into
  `HunterEventModal` showing "Claim Glory & Continue", and it closes cleanly with no other modal
  following.
- No console errors beyond the expected local-dev `@vercel/analytics`/`speed-insights` 404s.

Note: the level-up test above is a real, permanent change to the test account's XP/level in the
live Supabase DB (55 XP/Level 1/E-Rank → 15/282 XP/Level 2) — left as-is rather than reverted,
consistent with how the project's own Playwright e2e suite already mutates this account's data as
a matter of course.

## M10 — done (2026-08-13)

Fixed on `m10-task-creator-modal-refetch`, merged to `main`.

Changes:

- [components/TaskCreatorModal.tsx](components/TaskCreatorModal.tsx) — added optional
  `preloadedSubjects`/`preloadedTopics`/`preloadedSubtopics` props. `loadDropdownData()` now uses
  `preloadedX ?? fetchX()` per field, so it only fetches whichever pieces the caller didn't already
  hand off, instead of unconditionally fetching all three on every open.
- [app/syllabus/page.tsx](app/syllabus/page.tsx) — the "Quick Study" action (per-subtopic ⚡
  button) already holds `subjects`, `topics`, and `subtopics` in page state for its own tree UI, so
  its `TaskCreatorModal` call now passes all three as preloaded — this instance no longer fetches
  anything on open, matching `AUDIT.md`'s exact finding for this call site.
- [app/tasks/page.tsx](app/tasks/page.tsx) — this page's "Add Task" button only holds `subjects`
  locally (not topics/subtopics, since the Tasks page never needed a topic/subtopic tree for its
  own UI), so only `preloadedSubjects` is passed — cuts one of the three fetches.
- **Deliberately left unchanged**: the Home page (`app/page.tsx`) and `components/Navbar.tsx` each
  render their own standalone "Add Task" entry point but don't hold subjects/topics/subtopics in
  state for any other reason — `AUDIT.md`'s finding only named the syllabus and tasks call sites
  as having the data already loaded. Making Home/Navbar preemptively fetch that data just to hand
  it to the modal would add a load-time fetch that doesn't exist today, which cuts against the
  over-fetching concern this same audit raises elsewhere — so their modal instances still fetch
  all three on open, same as before this change.

Verified: typecheck clean, lint clean (same pre-existing warning set, only the line number for
`TaskCreatorModal.tsx`'s `exhaustive-deps` warning shifted), production build clean. Live-checked
against a production build by instrumenting `window.fetch` in the browser to log Supabase REST
calls (the browser tool's network-request log doesn't appear to capture cross-origin `fetch()`
calls, so this was the reliable way to confirm): opening the modal from the Tasks page logged only
`topics`/`subtopics` calls (no `subjects` call); opening it from the Syllabus page's Quick Study
action logged zero calls. Also did a full create-task round trip from the Syllabus entry point
(temporary subtopic → modal opened pre-filled with subject/topic/subtopic → submitted → task
appeared correctly on the Tasks page with the right subject/topic/target) and cleaned up the
temporary task and subtopic afterward, confirming `createTask()` itself is unaffected.

## M9 — done (2026-08-13)

Fixed on `m9-debounce-tasks-search`, merged to `main`.

Changes:

- [app/tasks/page.tsx](app/tasks/page.tsx) — the search filter (`filteredTasks`) previously read
  `searchQuery` directly, so every keystroke re-ran the full `tasks.filter()` pass and re-rendered
  the task grid. Added a separate `debouncedSearchQuery` state, updated from `searchQuery` via a
  `useEffect` + 250ms `setTimeout` (cleared on each keystroke), and pointed the filter at the
  debounced value instead. The input itself (`value={searchQuery}`) still updates on every
  keystroke so typing feels instant — only the filter/re-render is delayed.
- No server-side query was involved to begin with (`fetchTasksWithNoteSummary()` runs once on
  mount; the search only filters the already-fetched in-memory array) — confirmed this by reading
  the full page before making the change, so the fix here is scoped to cutting redundant
  filter/render work per keystroke, per `AUDIT.md`'s actual finding, not adding debounce to a
  network call that doesn't exist.

Verified: typecheck clean, lint clean (no new warnings — only the same pre-existing
`react-hooks/exhaustive-deps`/`no-img-element` warnings elsewhere), production build clean.
Live-checked against a production build (`next build && next start`, logged in as the real test
account): typing a non-matching query correctly shows the empty state, clearing/typing a matching
topic name (`সন্ধি`) correctly re-shows the task, no console errors introduced (only the expected
local-dev 404s from `@vercel/analytics`/`@vercel/speed-insights`, which no-op outside a real
Vercel deployment per `CLAUDE.md`).

## M8 — done (2026-08-13)

Fixed on `m8-split-fetch-tasks` (commits `835900f`, `1eb9bdc`), merged to `main`.

**Plan deviation from `AUDIT.md`/this file's original phrasing**: the audit assumed Tasks/Today/
Focus could all drop the notes/overlays join entirely. Tracing actual usage showed that's only
true for Today and Focus — Task Library (`app/tasks/page.tsx`) and Home (`app/page.tsx`, not
named in the audit at all — it feeds `NewStudyBlock`/`RevisionBlock`/`CalendarBlock`) both read
note-existence and overlay-count to decide which action button to show (Upload Note / Overlays /
Study), so dropping notes there would have broken that UI. Confirmed via grep that none of the
four consuming components ever read anything from a note/overlay beyond `.id` and
`overlays.length` — never geometry (`x_coord`/`y_coord`/etc.) or `image_url`.

Changes:

- [lib/supabase.ts](lib/supabase.ts) `fetchTasks()` now selects no `notes` join at all (was the
  full `notes(*, overlays(*))` deep join on every call, regardless of caller). Used unchanged by
  `app/today/page.tsx` and `app/focus/page.tsx` — confirmed neither reads `.notes` anywhere.
- New `fetchTasksWithNoteSummary()` in the same file adds `notes:notes(id, overlays(id))` — note
  existence + overlay *count* via array length, no overlay geometry or `image_url`. Used by
  `app/page.tsx` and `app/tasks/page.tsx`.
- `fetchTaskById()` (task detail/study view) is unchanged — already correctly scoped to one task
  with the full deep join, since that view actually renders overlay geometry.
- **Folded in per go-ahead**: `app/notes/[noteId]/occlude/page.tsx` was calling `fetchTasks()`
  (fetching every task, deep-joined) and looping client-side to find the one note matching the
  route's `noteId` — found while tracing `fetchTasks()`'s call sites, not in `AUDIT.md`. New
  `fetchNoteById()` in [lib/supabase.ts](lib/supabase.ts) queries the `notes` table directly by id
  (with its `overlays(*)`) and reads `task_id` straight off the row instead of searching for it.

Verified: typecheck/lint/build clean (only pre-existing lint warnings, same set as before this
change). Live-checked against a production build (`next start`, logged in as the real test
account) on all 5 former `fetchTasks()` call sites: Home and Task Library both still show the
correct note/overlay-count badges and action buttons for the one seeded task; the occlude page
resolves the note and its task correctly via the new direct lookup; Today and Focus both load
without errors on the lightweight no-notes query (Focus's redirect to `/` on that account is the
existing, unrelated `show_rank_features` gate — not caused by this change).

## M7 — done (2026-08-13)

Fixed on `m7-cut-redundant-refetches` (commits `e693474`, `e8a1da0`, `edf0e48`), merged to `main`.
Changes:

- `updateSubtopicStatus`, `deleteSubject`, `deleteTopic`, `deleteSubtopic` in
  [lib/supabase.ts](lib/supabase.ts) now take the caller's already-loaded previous-status/
  completed-count instead of re-fetching it internally; `updateSubtopicStatus` returns the
  settings from `awardXPAndSync` so [app/syllabus/page.tsx](app/syllabus/page.tsx)'s toggle
  handler doesn't need a second `fetchUserSettings()` call. `deleteSubject`/`deleteTopic`'s new
  count param is optional (falls back to the old fetch) because `app/topics/page.tsx` also calls
  them without holding subtopics locally — see the commit message for the full reasoning,
  including why `awardXPAndSync`'s own internal settings fetch was deliberately left in place (it
  does real day-rollover reconciliation, not just a redundant read).
- **Folded in per go-ahead**: the same redundant-refetch shape found during M7 in
  [app/tools/bangla-vocab/page.tsx:206-230](app/tools/bangla-vocab/page.tsx) (`fetchUserSettings()`
  → conditional `awardXPAndSync()` internal re-fetch → a third unconditional `fetchUserSettings()`)
  — fixed the same way, by using `awardXPAndSync`'s return value directly and reusing the initial
  fetch as a fallback when no bonus was awarded.

Verified: typecheck/lint/build clean (only pre-existing lint warnings). Live-checked both flows
against a production build — the syllabus subtopic-status/delete/XP cycle, and a bangla-vocab
review-session completion — confirming correct XP award/deduction, correct UI state, no console
errors, and persisted server state matching after a reload.

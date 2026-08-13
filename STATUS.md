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
| M8 | Split `fetchTasks()`'s deep join | — | **Not started** | Unchanged. |
| M9 | Debounce Tasks search | — | **Not started** | Unchanged. |
| M10 | `TaskCreatorModal` refetch-on-open | — | **Not started** | Unchanged. |
| M11 | Focus feature target pattern (`FlipDigit`, shared hook, `ModalShell`) | — | **Not started** | `app/focus/page.tsx` and `components/FocusTimerBlock.tsx` still each have their own `FlipDigit` and duplicated finish/stop XP logic. No `ModalShell` component exists; the 9 hand-duplicated modal-backdrop sites are unchanged. |
| M12 | Consolidate direct-Supabase call sites into `lib/supabase.ts` | — | **Not started** | Same 7 files still call `supabase.from()`/`supabase.auth` directly (confirmed `app/settings/page.tsx:107` still does its own `auth.getUser()` + direct upsert, bypassing `lib/supabase.ts` entirely — this is the M12 issue, distinct from the M3 leftover-duplication note above). |
| M13 | `clsx`/`tailwind-merge` unused deps | — | **Not started** | Still declared in `package.json`; zero usages confirmed via repo-wide search of `.ts`/`.tsx`. |
| M14 | Replace `any` with `lib/types.ts` interfaces | — | **Not started** | Not re-audited in depth (out of scope for a spot-check); no reason to believe it changed. |
| M15 | Remove confirmed-dead code | `DDayBanner.tsx`, `recordFocusSession()`, unused imports, `oldMomentum` | **Not started** | `components/DDayBanner.tsx` still exists; `recordFocusSession()` ([lib/supabase.ts:555](lib/supabase.ts)) still exported, unchanged. |
| M16 | `app/topics/page.tsx` / `deleteNote()` — needs your input | — | **Not started, still needs your input** | `deleteNote()` ([lib/supabase.ts:841](lib/supabase.ts)) still present, no call site found. `app/topics/page.tsx` unchanged. |

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

## Housekeeping note

`docs/update-claude-md` branch was fully merged (identical to `main` tip) — deleted 2026-08-13
per approval.

## Updated, re-prioritized milestone list carried forward

No re-prioritization needed — `AUDIT.md`'s ordering (security → the two recurring bugs →
performance → component structure & standards → zombie code) still holds. M1/M2/M3/M5/M6/M7 are
done, in that order. Remaining, top-to-bottom from where it left off:

1. **M8** — Split `fetchTasks()`'s always-deep-joined query. *(next up)*
2. **M9** — Debounce Tasks search.
3. **M10** — Stop `TaskCreatorModal` refetching data the parent already has.
4. **M11** — Establish target component pattern on the Focus feature (`FlipDigit`,
   `useFocusTimer` hook, `ModalShell`) — confirm the resulting pattern with you before applying
   elsewhere. Also fixes `updateTask()`'s missing error check (see above) since M11 touches its
   call sites anyway.
5. **M12** — Consolidate direct-Supabase call sites into the data-access layer (open question:
   keep `lib/supabase.ts` as one file or split per-domain — needs your input before starting).
6. **M13** — Resolve `clsx`/`tailwind-merge` (remove or adopt — needs your input).
7. **M14** — Replace `any` usage with `lib/types.ts` interfaces.
8. **M15** — Remove confirmed-dead code (`DDayBanner.tsx`, `recordFocusSession()`, unused
   imports/`oldMomentum`).
9. **M16** — `app/topics/page.tsx` and `deleteNote()` — needs your input, not auto-removed.
10. **M4** — Next.js 14→16 upgrade — large breaking-change milestone, deliberately deferred;
    sequence wherever you'd like relative to the above (unchanged from `AUDIT.md`'s note that
    it's tracked separately).

## Approvals received (2026-08-13)

1. Proceed to Phase B, starting with M6, on its own branch.
2. `updateTask()` error-check fix folded into M11.
3. Stale `docs/update-claude-md` branch deleted.
4. M6 verified and merged to `main`.
5. Proceed to M7.
6. M7 verified; bangla-vocab refetch fix (found during M7) folded into M7 rather than a separate
   milestone.
7. M7 (including the bangla-vocab fold-in) merged to `main`.

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

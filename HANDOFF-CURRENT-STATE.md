# Montaji — current handoff

> Canonical continuation note for future chats. Read this before making changes.

## Repository / branch
- Repository: `to1le39rus-cyber/Montaji`
- Active working branch: `refactor/step3-business-model`
- Base / production branch: `Astera-smart`
- PR: #21 — `Step 3: formalize unlimited montage planning`
- PR #21 remains draft and must not be merged or deployed to production without explicit approval.

## Product contract
- Firestore is the source of truth.
- Shared operational data: `appData/shared`.
- Notes are separate: `appData/notes`.
- No localStorage/sessionStorage as a working database.
- Cancellation is archived/history-preserving; rescheduling must preserve history.
- Measurement is a separate business event and may link to a montage.
- Finance is separate from montage count: actual income, debt, expenses, additional income.

## Critical business rule
- `3/3` is NOT a daily capacity limit.
- Three windows (`10:00–12:00`, `14:00–16:00`, `3-й слот / резерв`) are planning presets only.
- Planning/average load is about 3 montages/day.
- 4, 5, 6+ montages on one day are valid.
- Never block a job because `count >= 3`.
- Never label a day “fully loaded” merely because the third planning window is occupied.
- Keep these metrics separate: actual montage count, average/planning load, free planning windows, actual income, additional income.

## Architecture target
`index.html → app.js / canonical modules → Firebase Auth + Firestore`

`boot.js` must stay a thin entrypoint. No source rewriting, Blob imports, CDN snapshots, or permanent runtime patching.

## Work already committed on branch
- Canonical contract/docs established: `PROJECT-CONTRACT.md`, `DOCUMENTATION_CONFLICTS.md`, `ARCHITECTURE-INVENTORY.md`, `BUSINESS-SEMANTICS.md`, `SECURITY-MIGRATION.md`.
- `QA-MATRIX.md` expanded with 4 and 6+ montage cases, roles, two-phone smoke sequence.
- `boot.js` reduced to a thin import entrypoint.
- `modules/planning.js` added for pure planning semantics.
- `modules/planning-view.js` added as pure view-model groundwork.
- `tests/planning.test.mjs`, `tests/business-semantics.test.mjs`, `tests/planning-view.test.mjs` added/updated.
- `package.json` test script includes planning-view tests.
- Latest known commit before this handoff: `d1999e0b85b29934afc17aba2d510eef6d9dc2e7` (legacy workflow removal).

## Important cleanup just completed
Removed `.github/workflows/_notes-isolation.yml` from this branch.
That workflow was a one-shot GitHub Actions mutator with `contents: write` that rewrote `app.js`/tests and pushed to `Astera-smart`. It is incompatible with the canonical release model and must not be recreated.

## Current blockers / unfinished work
1. `app.js` still contains legacy `3/3` UI semantics (`${count}/3`, `c>=3`, “день полностью загружен”) and must be migrated to the canonical planning model.
2. `modules/planning.js` and `planning-view.js` are not fully integrated into the canonical UI/runtime.
3. CSS has multiple generations/layers (`styles.css`, `ux-upgrades.css`, `montaji-design-v2.css`, plus legacy polish files). Consolidate carefully; do not blindly delete without dependency checks.
4. `secure-app/` is legacy preview/loader code, not canonical production runtime.
5. Firebase Rules still have temporary hardcoded operator-email compatibility for shared data. Do NOT remove/change it or migrate user roles until UID/user profile/access verification is completed.
6. PWA manifest needs proper 192/512/maskable icons and install/update smoke testing later.
7. CI/static tests are not proof of browser/E2E behavior. Need real preview/browser QA before production.
8. Production pipeline target is `Astera-smart → validation → Firebase Hosting + Firestore Rules`. Do not treat stale Vercel links as fresh previews.

## Safety gates
- Do not change production data.
- Do not migrate Firebase users/roles/data without explicit approval.
- Do not deploy to production without explicit approval.
- Preview/sandbox first, then QA, then ask before production.
- Do not use runtime hacks to bypass source-editing limitations.
- Do not claim tests, deployments, or previews passed unless verified from GitHub/tool output.

## Next execution order
1. Verify branch/PR state and CI status.
2. Inspect `app.js` dependency points around planning/count/calendar/today/day-sheet/saveJob.
3. Finish Step 3 business semantics in canonical source without boot/runtime patches.
4. Run/verify tests and document exact status.
5. Only then move to Step 4 UX integration.
6. After UX, consolidate CSS and perform browser/mobile QA.
7. Security migration is a separate gated step.
8. Production only after final audit + explicit approval.

# Montaji — current handoff

> Canonical continuation note for future chats. Read this before making changes.

## Repository / branch
- Repository: `to1le39rus-cyber/Montaji`
- Active working branch: `refactor/step3-business-model`
- Base / production branch: `Astera-smart`
- PR: #21 — `Step 3: canonical unlimited montage planning`
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

## Work committed
- Canonical contract/docs: `PROJECT-CONTRACT.md`, `DOCUMENTATION_CONFLICTS.md`, `ARCHITECTURE-INVENTORY.md`, `BUSINESS-SEMANTICS.md`, `SECURITY-MIGRATION.md`.
- `QA-MATRIX.md` includes 4 and 6+ montage cases, roles, and two-phone smoke sequence.
- `boot.js` is a thin import entrypoint.
- `modules/planning.js` contains pure planning semantics.
- `modules/planning-view.js` contains the pure planning view-model.
- `tests/planning.test.mjs`, `tests/business-semantics.test.mjs`, `tests/planning-view.test.mjs` cover planning semantics.
- `app.js` now imports `planningViewModel` and uses it in Today, Calendar and Day Sheet.
- Legacy `3/3` presentation semantics were removed from those runtime surfaces: no `c>=3`, no “день полностью загружен”, and Today no longer renders `count/3`.
- `tests/final-architecture.test.mjs` now guards the canonical planning integration and legacy-semantic regression.
- `.github/workflows/_notes-isolation.yml` was removed and must not be recreated.

## Latest commits
- `b6ef57ea6a48185a43f8b078cd9ce6210ddfb44d` — `refactor: migrate planning UI to canonical model`
- `09056d85cc014b37eef7535251ea38732b3ec68f` — `test: lock canonical planning runtime semantics`

## Current status
Step 3 is **implemented in the canonical runtime for the main planning surfaces**, but it is not yet release-approved. Tests must still be executed/verified from CI or a real checkout. Browser/mobile E2E is still pending.

## Remaining Step 3 verification
1. Verify `npm test` in CI/checkout.
2. Inspect PR diff for unintended changes.
3. Confirm 3 / 4 / 6+ jobs render correctly in Today, Calendar and Day Sheet.
4. Confirm slot presets remain useful but never block a fourth+ montage.
5. Only after this verification mark Step 3 complete and proceed to Step 4 UX/roles.

## Current blockers / unfinished work
1. CSS has multiple generations/layers (`styles.css`, `ux-upgrades.css`, `montaji-design-v2.css`, plus legacy polish files). Consolidate carefully; do not blindly delete without dependency checks.
2. `secure-app/` is legacy preview/loader code, not canonical production runtime.
3. Firebase Rules still have temporary hardcoded operator-email compatibility for shared data. Do NOT remove/change it or migrate user roles until UID/user profile/access verification is completed.
4. PWA manifest needs proper 192/512/maskable icons and install/update smoke testing later.
5. CI/static tests are not proof of browser/E2E behavior. Need real preview/browser QA before production.
6. Production pipeline target is `Astera-smart → validation → Firebase Hosting + Firestore Rules`. Do not treat stale Vercel links as fresh previews.

## Safety gates
- Do not change production data.
- Do not migrate Firebase users/roles/data without explicit approval.
- Do not deploy to production without explicit approval.
- Preview/sandbox first, then QA, then ask before production.
- Do not use runtime hacks to bypass source-editing limitations.
- Do not claim tests, deployments, or previews passed unless verified from GitHub/tool output.

## Next execution order
1. Verify PR head and CI status.
2. Verify Step 3 regression cases.
3. Move to Step 4 UX: Today, Calendar, Day Sheet, quick add, roles.
4. Then consolidate CSS/design system.
5. Then browser/mobile QA.
6. Security migration is a separate gated step.
7. Production only after final audit + explicit approval.

# Montaji AA — Project Checkpoint

Updated: 2026-09-17

## Current branch / PR
- Working branch: `team/uxui-cleanup`
- PR: #26 — Team: UX/UI architecture cleanup
- Base: `design/today-v2`
- Current work is intentionally kept on the cleanup branch until acceptance QA is complete.

## Business semantics — do not regress
- Actual installations are unlimited per day.
- `10:00–12:00`, `14:00–16:00`, and `3-й слот / резерв` are planning presets, not a hard daily capacity.
- Actual montage count, average load, and free planning windows are separate metrics.
- Cancelled and completed jobs do not count toward current load.
- Financial totals are independent from installation count; income, extra income, debts and expenses are separate concepts.
- Never describe `3+` installations as a full-day capacity limit. Example wording: `5 монтажей · выше средней · 0 стандартных окон`.

## Architecture checkpoint
- `boot.js` is the canonical thin entrypoint and explicitly imports `modules/ux-style.js`, `app.js`, and `profile-ui.js`.
- `modules/planning-view.js` is a pure view-model module with no DOM/runtime UI import.
- Job-detail presentation is static CSS in `modules/ux-style.css`; interaction is in `modules/ux-style.js`.
- The job edit capture is scoped so edit actions inside other sheets continue to use the existing editor flow.
- Comment presentation on Today cards is treated as a distinct note component rather than plain body text.
- Legacy runtime patch files remain removed.
- Firestore remains the source of truth; no localStorage/sessionStorage fallback.

## QA state
- Vercel preview had previously reached READY for the cleanup branch.
- The iPhone screenshot exposed a real visual issue: the job comment looked like unstructured body text. This has now been addressed in `modules/ux-style.css`.
- GitHub Actions previously failed before exposing execution steps (`steps: []`), so CI must be rechecked after the latest commits. Do not call the branch green until a successful run is observed.
- Required acceptance gate: automated tests, Firebase smoke, iPhone/mobile interaction QA, and whole-screen visual QA before merge.

## Next session command
Continue Montaji AA from this checkpoint. First verify latest branch/PR head and CI/deployment state, then inspect the mobile Preview. Do not merge on visual assumptions; use the real Preview as the acceptance surface.

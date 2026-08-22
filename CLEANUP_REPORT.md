# Монтажи AA — Cleanup Report

Date: 2026-08-22
Branch: `Astera-smart`
Live QA: `https://montaji.vercel.app`

## Completed

- Removed legacy Notes HTML from `index.html`.
- Removed obsolete `auth-guard.js` bootstrap.
- Removed dead `notes-fix.js`.
- Removed dead `sync-recovery.js`.
- Rebuilt `notes.js` as the single Work Inbox feature module.
- Kept Notes source of truth at `appData/notes`.
- Notes reads use `onSnapshot`.
- Notes writes use Firestore `runTransaction` to avoid blind array overwrite.
- Added task / reminder / note types.
- Added priority, assignee, due date/time, search and filters.
- Added execute/undo, edit, archive/restore and explicit permanent delete.
- Added explicit save-error state so failed writes are not presented as successful.
- Added dedicated `notes.css` and loaded it from the feature module.
- Removed the old Vercel CDN snapshot routing that referenced `production-repair-20260820`.
- Reworked the Vercel entry adapter so it always reads current `Astera-smart` files and no longer loads the old `boot.js` runtime patcher or duplicate Notes module.
- Updated regression tests to assert the new Notes architecture instead of the deleted legacy Notes DOM.
- Extended `npm test` to syntax-check `notes.js`.
- Created a pre-cleanup snapshot and a rollback branch before cleanup.

## Intentionally retained

`boot.js` remains in the repository as a compatibility layer for the existing Firebase Hosting workflow. The Vercel production adapter no longer executes it. Removing it completely requires first folding its remaining auth/capacity/shared-load fixes into canonical `app.js` and then validating Firebase Hosting; that is deliberately not being done destructively in this pass.

## Data safety

No Firestore documents were deleted, migrated, renamed or rewritten by this cleanup. `appData/shared` was not touched. `appData/notes` remains the same production document and existing legacy note records are normalized backward-compatibly by `notes.js`.

## Deployment

Vercel production is connected to GitHub `to1le39rus-cyber/Montaji`, branch `Astera-smart`. The latest observed production deployment is READY and its source commit is on `Astera-smart`.

## Remaining verification

- `npm test` must be confirmed green by the CI run for the latest commit.
- Live Safari CRUD/realtime QA still needs a real user session and two-device test.
- Full removal of `boot.js` is a separate safe refactor after folding its remaining behavior into `app.js`.

# CANONICAL UI MAP

## Shell / global
- `src/core/canonical-shell.js`: app shell, navigation, modals, job/client/store flows.
- `src/styles/base.css`: canonical global foundation.

## Screens
- Today: `src/screens/today.js` + `src/styles/today.css`
- Schedule: `src/screens/schedule.js` + `src/styles/schedule.css`
- Money: `src/screens/money.js` + `src/styles/money.css`
- Clients: `src/screens/clients.js` + `src/styles/clients.css`
- Notes / More / Stores: `src/screens/notes.js`, `src/screens/more.js` + `src/styles/notes-more.css`

## Reusable interaction surfaces
- Job card: `src/components/job-card.js`
- Job editor: `src/components/job-form.js`
- Store editor: `src/components/store-form.js`
- Shared modal/sheet behavior: `src/core/canonical-shell.js`
- Component styling: `src/styles/job-components.css`

## User journeys that must survive redesign
- Today/Schedule → Job → Edit
- Clients → Client → History → Job → Edit
- Money → Montage → Store → Job → Edit
- Money → Additional income → Job → Edit
- More → Stores → Add/Edit/Delete
- New Job → Save
- Job → Complete / Paid-Unpaid / Reschedule / Cancel

## Design implementation rule
Prefer semantic component classes/tokens and refactor existing canonical CSS. Do not append a new override layer whose purpose is to fight old canonical rules.

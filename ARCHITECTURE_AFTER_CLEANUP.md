# Монтажи AA — Architecture After Cleanup

## Canonical production

User-facing production: `https://montaji.vercel.app`

Git source: `to1le39rus-cyber/Montaji`
Branch: `Astera-smart`

Vercel currently uses a thin `secure-app/index.html` deployment adapter. That adapter fetches current files from the same `Astera-smart` branch and no longer references the obsolete CDN snapshot or executes `boot.js`.

## Runtime flow

```text
montaji.vercel.app
  ↓
secure-app/index.html (thin Vercel adapter)
  ↓
current Astera-smart index.html + CSS
  ↓
app.js + notes.js
  ↓
Firebase Auth / Firestore
```

The adapter only performs deployment-specific configuration injection and the remaining compatibility transforms that have not yet been folded into `app.js`.

## Notes flow

```text
UI
 ↓
notes.js
 ↓
Firebase Auth session from montaji-aa-production
 ↓
Firestore appData/notes
 ↓
onSnapshot → render
```

Writes use a Firestore transaction:

```text
read current notes
 ↓
normalize existing records
 ↓
apply one operation
 ↓
transactional write
```

No localStorage/sessionStorage is used as a Notes database.

## Notes model

Existing records remain compatible. New records support:

- `type`: task / reminder / note
- `title`
- `text`
- `dueDate`
- `dueTime`
- `priority`
- `assignee`
- `completed`
- `archived`

## Notes UI

The old Notes DOM is removed from the app shell.

There is one visible Notes feature: **Рабочий Inbox / Входящие**.

Actions:

- create
- edit
- complete / undo
- archive / restore
- permanent delete with confirmation
- search
- all / today / overdue / important / done / archive filters

## Data boundaries

`appData/shared` remains owned by the main application. Notes cleanup does not migrate or rewrite it.

`appData/notes` remains the Notes source of truth.

## Transitional item

`boot.js` still exists only for Firebase Hosting compatibility. It is not executed by the Vercel adapter. A future refactor can fold its remaining auth/capacity/shared-load behavior into `app.js`, then delete `boot.js` after Firebase Hosting QA.

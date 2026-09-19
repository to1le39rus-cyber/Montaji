# HANDOFF — CANONICAL BASELINE BEFORE DESIGN

Updated: 2026-09-20
Branch: `Astera-smart`
Production: `https://montaji.vercel.app`
Canonical production entry: `/canonical-app.html`
Canonical DEV entry: `/canonical-dev.html`

## 1. Current phase

The functional canonical baseline is built. The next project phase is **unified premium mobile-first UI/UX design**.

Do not restart architecture and do not revive the legacy patch stack. Design must be implemented on the canonical modules listed below.

## 2. Architecture

Canonical data flow:

`Firestore → Repository → Domain/Service → Screen → Component`

Firestore remains the production source of truth. IndexedDB/local cache is only a fast-start/offline snapshot and is isolated by Firebase Auth UID.

Canonical production writes use Firestore transactions. Job and Store editors submit dirty fields only, so unrelated concurrent changes are preserved.

GitHub Pages/DEV uses `canonical-dev.html` + `src/data/dev-repository.js`. It must never import or write production Firebase. DEV mutations are in-memory and disappear on reload.

## 3. Domain entities

### Job
Core module: `src/domain/jobs.js`
Commands: `src/domain/job-commands.js`
Service: `src/domain/job-service.js`
Repository: `src/data/job-repository.js`
Editor: `src/components/job-form.js`

Types:
- Монтаж
- Замер
- Рекламация
- Доставка
- Сервис
- Доп. доход

**Authoritative closed status set:**
- Запланировано
- Выполнен
- Перенесен
- Отменен

Do not introduce alternative lifecycle statuses without an explicit product decision.

Completed non-cancelled jobs produce income. Debt exists only for completed non-cancelled unpaid jobs.

### Store
Domain: `src/domain/stores.js`
Service: `src/domain/store-service.js`
Repository: `src/data/store-repository.js`
Editor: `src/components/store-form.js`

Fields: `id, name, address, phone, contact`.
Jobs currently preserve the human-readable `source`/store name snapshot. Deleting a Store must not rewrite historical jobs.

### Client
Projection from jobs, not a separate Firestore entity.
Module: `src/domain/clients.js`.
Client identity currently uses normalized phone first, otherwise normalized client name.

### Expense
Normalized in `src/domain/normalize.js`.
Used by Money. Cancelled expenses do not reduce net income.

### Notes
Separate notes repository: `src/data/notes-repository.js`.
Canonical Notes screen currently renders existing notes; feature expansion is not part of the pre-design baseline.

### Measurement
Measurement helpers: `src/domain/measurements.js`.
The architecture supports measurement fields/conversion, although the authoritative backup contained no measurement records.

## 4. Canonical screens and navigation

Shell: `src/core/canonical-shell.js`

Current bottom navigation:
1. Today — `src/screens/today.js`
2. Schedule — `src/screens/schedule.js`
3. Money — `src/screens/money.js`
4. Clients — `src/screens/clients.js`
5. Notes — `src/screens/notes.js`
6. More — `src/screens/more.js`

Before final visual design, navigation may be visually reorganized as one coherent mobile system, but functionality must remain reachable.

## 5. Functional baseline already implemented

### Today
Date summary, montage count, completed income, job cards, quick complete/paid actions, open/edit job.

### Schedule
Date selector, scheduled jobs, montage/completed counters, job actions. Slot presets are workload/scheduling presets, **not a hard daily capacity limit**.

### Money
Period controls: today / 7 days / month / custom range.
Income, expenses, net, debt.
All-time income/net summary.
Income by type.
Montage drilldown → stores → jobs, including store search and tap-to-expand/collapse.
Additional income drilldown → job detail/edit.
Expense category filter and compact/show-all list.
This interaction has been user-tested and accepted; preserve its behavior during visual redesign.

### Clients
Client list → client detail → job history → job detail → editor.
Income/debt aggregates are derived from job domain semantics.

### More / Settings
Stores directory with add/edit/delete.
Local cache clear action affects local cache only and must never delete Firestore.
Sign out/export hooks live here.

### Job lifecycle/editor
Create/edit with dirty-field patching.
Complete, paid/unpaid, reschedule, cancel.
Job detail resolves the latest entity from current realtime state before editing.

### Realtime/cache
Firestore realtime metadata distinguishes pending writes, cached snapshot and server-confirmed state.
Local cache is per-auth-user and never the database/source of truth.

## 6. Environments

### Production
Vercel project `montaji`, branch `Astera-smart`.
Production Firebase project: `montaj-39`.
Do not modify production Firestore data for tests.

### DEV
`canonical-dev.html` is Firebase-free and uses local uploaded JSON + in-memory repositories.
Real backup/PII must never be committed to the public repository.

## 7. Legacy

Root legacy runtime (`index.html`, `app.js`, `boot.js`, old CSS/UI files) exists for compatibility/history. It is **not** the architecture to extend.

Do not solve canonical design by adding another global patch stylesheet over legacy CSS. New design belongs in the canonical style/component system. Remove/refactor superseded canonical rules instead of stacking fixes.

## 8. Tests

`npm test` is the regression contract. It covers architecture/domain normalization, Today, jobs/repository/service, Money, Schedule, Clients, Notes, cache and Stores.

GitHub workflow: `.github/workflows/validate.yml`.
Pages workflow: `.github/workflows/pages-dev.yml`.

## 9. Design phase contract

Goal: a distinctive premium mobile-first field-service/productivity app with a strong “wow” impression while remaining fast and obvious in daily use.

Design the whole system, not isolated pretty screens:
- typography and hierarchy
- spacing/grid
- surfaces/elevation
- status language
- buttons/controls/forms
- job cards
- financial data
- modals/sheets
- bottom navigation
- empty/loading/offline states
- safe-area/mobile behavior

Functional semantics above are frozen unless a real UX problem requires an explicit product decision.

## 10. Continuation instruction for a new chat

Read this document, `DOMAIN-CONTRACT.md`, `UX-CONTRACT.md`, and the canonical modules before changing code.

Continue from **DESIGN PHASE**, not from architecture discovery.

First design task: inventory the canonical UI surfaces and establish one design system; then apply it screen-by-screen without changing accepted business behavior.

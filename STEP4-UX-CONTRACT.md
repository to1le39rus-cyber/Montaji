# Step 4 — UX Contract

## Purpose

Step 4 turns the business contract into a clear mobile workflow. The interface must make the core chain obvious:

**График → Выезд → Выполнение → Деньги → История**

The UX must not invent business restrictions that do not exist in the data model.

## 1. Today

The Today screen answers three questions immediately:

1. What work is planned for today?
2. What is the actual montage count today?
3. What money requires attention today?

The primary workload metric is the actual number of active montages for the date. It is **not** displayed as `X/3` and must not use a three-slot progress bar as a capacity indicator.

Three planning windows remain useful presets, but they are not capacity limits. A day may contain 4, 5, 6 or more montages.

If the count is above the planning average, the UI may communicate this neutrally as additional workload, never as an error or prohibition.

## 2. Job card hierarchy

A compact job card shows only decision-critical information:

- client / short title;
- date and planning window or time;
- job type;
- amount when relevant;
- current status;
- one clear open/details action.

Operational actions belong inside the Day Sheet / details surface rather than competing with the primary card hierarchy.

## 3. Day Sheet

Opening a job/day provides the full operational context:

- client and phone;
- address;
- route actions;
- type and status;
- amount and payment state;
- comments;
- measurement relationship when applicable;
- completion / payment actions;
- archive/cancel action where permitted.

Every state-changing action follows:

**tap → pending → success/error feedback → refreshed state**

## 4. Calendar

Calendar is a planning and occupancy view, not a capacity gate.

A date with 3, 4, 5 or 6+ active montages remains selectable and addable.

The calendar may distinguish:

- no planned work;
- planned work;
- multiple/above-average workload;
- measurements;

but must never imply that the third montage closes the date.

## 5. Add flow

Adding a montage must remain possible on a date regardless of the number of existing montages.

The planning slot selector is optional planning metadata. If all three preset windows are already occupied, the form must not reject the job solely for that reason. The user can use the reserve/free-time option or another explicit time.

A slot conflict is a scheduling conflict, not a daily-capacity conflict.

## 6. Money

Finance is independent from montage count.

The UX keeps separate:

- actual income;
- unpaid completed work / debt;
- expenses;
- additional income;
- planning/workload metrics.

A high montage count must never automatically change or cap financial values.

## 7. Roles — target UX

### Installer

Sees:
- own day;
- own jobs;
- own operational actions;
- own money relevant to their work.

### Manager

Sees:
- all jobs;
- workload by day;
- planning windows / free windows;
- distribution;
- money and operational overview.

### Store

Sees:
- own requests;
- availability windows suitable for booking;
- own clients/requests.

Store users should not need internal operational details to choose an available planning window.

## 8. Mobile requirements

The interface remains mobile-first:

- safe-area aware;
- `100svh` where viewport height is used;
- touch targets large enough for field use;
- keyboard-safe forms;
- bottom navigation remains usable;
- modal sheets can scroll independently;
- no action depends on hover or long press.

## 9. Explicit non-goals

Step 4 must not:

- introduce a hidden 3/day limit;
- block creation after three planning windows;
- merge income with workload;
- replace Firestore as source of truth with local storage;
- introduce long-press-only actions;
- change production Firebase Rules or migrate users;
- rewrite the runtime through `boot.js` patches.

## 10. Implementation gate

Before Step 4 can be called complete, QA must verify:

- 3, 4 and 6+ montages render correctly;
- a fourth montage can be created without a capacity error;
- calendar remains addable above three;
- cards are concise and details remain accessible;
- state-changing actions provide feedback;
- two-device realtime behavior remains intact;
- mobile Safari/PWA interaction is usable;
- finance remains independent from workload count.

The complete `app.js` must be reviewed before wiring these contracts into the canonical runtime.

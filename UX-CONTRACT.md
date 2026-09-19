# UX-CONTRACT.md

## Purpose

Fix canonical UX behavior before visual polishing. Functional behavior comes first; visual styling is applied later through shared components.

## Global modal rule

The canonical app uses one shared modal infrastructure:
- `canonical-modal` — common overlay/container;
- `canonical-modal-panel` — common panel;
- screen-specific classes are variants, not separate modal systems.

When visual design starts, define radius, overlay, spacing, typography, close/back controls, animation, buttons, scroll and mobile behavior once, then apply them to every modal variant.

## Modal and navigation inventory

### New job
Entry: `+ Новая заявка`.
Behavior: shared modal + canonical job form; save creates; cancel closes.
Variant: Job form.

### Existing job
Entry: job card from Today/Schedule, or client history.
Behavior: Job detail first; explicit `Редактировать` opens the same canonical job form. Lifecycle actions stay separate from editing.
Variants: Job detail, Job form.

### Reschedule
Entry: `Перенести` from job actions.
Behavior: shared modal with date; save reschedules; cancel/close returns to context.
Variant: small action/form modal.

### Client
Entry: tap client card.
Behavior: client detail modal with identity, phone, financial summary and history; close returns to client list.
Variant: Client detail.

### Client history -> job
Intended path: Client detail -> Job detail -> Edit job.
Required navigation behavior: Back from Job detail should return to the Client detail context, not unexpectedly jump to the client list. This is a navigation-stack rule, not a separate visual style.

### Notes
Note rows already expose an opening hook, but the canonical shell does not currently wire a note detail modal. Decide the note workflow before visual polish; if details/actions are needed, reuse the shared modal.

### More / settings
Current actions: clear local cache, export, sign out. They are direct actions and do not currently need detail modals. Any future confirmation dialog must reuse the shared modal infrastructure.

## Screen interaction map

- Today: job card -> Job detail -> Edit.
- Schedule: job card -> Job detail -> Edit.
- Money: period controls/breakdowns; no current detail modal.
- Clients: client -> Client detail -> history -> Job detail -> Edit.
- Notes: note row has an opening hook, currently unwired.
- More: direct settings/actions.

## Design system rule

Do not design each modal independently. Create one shared modal specification for:
1. overlay;
2. panel;
3. header;
4. close/back controls;
5. content spacing;
6. action area;
7. buttons;
8. mobile viewport behavior;
9. scroll behavior;
10. open/close animation;
11. accessibility/focus.

Then define content variants only: job detail, job form, reschedule, client detail, future note detail, future confirmations.

## Pre-design UX checklist

- [ ] Client -> Job detail -> Edit works.
- [ ] Job detail Back returns to the correct previous context.
- [ ] Today and Schedule use identical job-detail behavior.
- [ ] New job and Edit use the same form.
- [ ] Reschedule reuses shared modal.
- [ ] Notes workflow is decided.
- [ ] Future confirmations reuse shared modal.
- [ ] One visual modal system is applied to all variants.

Current appearance is not final design.

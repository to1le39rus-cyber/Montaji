# Montaji / Astra — implementation contract

Base: fb28482a4ed3524ebf6686f4a9ba148309d3d431. DEV only, no production release authorized.

## Product structure
Five tabs: Сегодня / Календарь / Деньги / Клиенты / Ещё. Each tab keeps its own route, filters and scroll position. Today always uses Europe/Kaliningrad business date, never calendar selection. Calendar opens a day agenda; overlapping jobs all remain visible. Money uses completedDate with historical fallback to date, and labels accrued vs collected explicitly. Global outstanding balances remain available outside period selection. Client histories include cancellations and use existing identity projection, without destructive merging.

Row → detail route → explicit Edit full-screen route. Browser Back returns to the exact preceding route and scroll. Creation starts with a compact action sheet (job, expense, extra income, note). Secondary job actions live in a bottom sheet. Destructive actions use one dialog with consequences and explicit confirmation. No nested sheets. Forms do not auto-submit from selection or lose typed values on snapshots. A remote change produces an inline notice; changed-field conflict presents server values and allows a deliberate retry against that reviewed version. A deleted record cannot be recreated by editing.

## Paths and return contracts
| Entry | View/action | Feedback/result | Return |
|---|---|---|---|
| Today/Calendar/client | Job detail → edit | Save pending; inline error/conflict; success toast | Same detail; parent scroll retained |
| Create action | Job / extra income form | Required client/date, precise money; pending lock | New detail, originating list preserved |
| Job detail | Complete / payment | Explicit action, actual business date; no invented partial payments | Same refreshed detail |
| Job detail | Reschedule | Date editor; review before save | Detail and both affected dates refresh |
| Job detail | Cancel | Consequence confirmation; archive retained | Same archived detail, restore available |
| Measurement detail | Convert to montage | New job form; atomic source linkage; credit meaning explicit | Montage detail, link to source |
| Money | Period / debt / expenses | Labelled selectors and totals, cancelled expenses omitted | Same filter and scroll |
| Money | Expense detail → edit/cancel | Transactional dirty patch, confirmation on cancellation | Same list |
| Clients | Search → detail → full history | Chronological jobs including cancelled; call, create | Search preserved |
| More/Today | Notes → detail → edit/done/archive | All CRUD, archive restoration, due date/priority | Same list filter |
| More | Stores → detail → edit/archive | Duplicate validation, pending state, rename snapshot policy | Directory immediately from subscription |
| Job form | Store selector | Active stores only, historic snapshot option stays valid | Form preserves all fields |
| Settings | Export | Synthetic or authenticated state only; JSON includes notes | Remain in settings |
| DEV settings | Reset sandbox | Destructive confirmation, only synthetic IndexedDB | Fresh fixtures, Today |

## Overlays
- Create sheet: triggered by top-right plus; four labelled icon rows; close by backdrop/Escape/close; focus trap; returns focus to trigger; page locked while open; sheet scroll only if height insufficient.
- Job actions sheet: contextual status, reschedule, cancel; closes before opening a route/dialog; no keyboard needed.
- Confirm dialog: exact target and effect; cancel first, destructive primary; no accidental backdrop commit; Escape cancels; focus retained; no data mutation until primary tap.
- Conflict panel: inline in form (not modal); field names + server values; user reviews before retry; draft stays; remote unrelated fields are not copied into submission.
- Toast: nonblocking status live region, 4 seconds; no sole error delivery. Errors stay inline until resolved.

## Design system
Warm mineral background #F5F4EF; white surface; ink #1C251F; secondary #566258; forest accent #365747; muted accent #E7EDDF; border #DDE2D9; success #286548; warning #875A16; danger #AD3434. Never communicate state by colour alone.
Native system font, 12/14/16/18/24/32/40 px; text body 16, labels 14, monetary hero 40 with tabular numbers. Weights 400/500/600/700. Spacing 4/8/12/16/20/24/32/40. Radius 10 controls, 16 surfaces, 24 sheets. Borders 1px; no decorative gradients, glass or deep shadows.
One line SVG icon family, 24×24, stroke 1.7, round caps. Semantic icons: sun / calendar / wallet / users / grid; plus, chevron, arrow-left, check, phone, pin, edit, archive, note, store, alert, refresh, close, download. No emoji product icons.
Button min height 48; icon touch 44; inputs 16px to avoid Safari zoom. Default/pressed/disabled/loading/error states. Focus ring 3px; reduced motion honoured. Motion 160ms colour/opacity only; no artificial delayed loading.

## Layout and mobile
390×844 reference viewport. Content horizontal inset 20; reading width 720 on desktop; desktop remains same product. Safe-area top/bottom, bottom nav 68 + safe-area; no fixed bottom save button under software keyboard. Forms have sticky top back/title, native document scroll, submit in flow. VisualViewport updates available height; nav hidden on editing route. No swipe-only actions, no long-press dependency. Background scrolling locked only for open dialog. Scroll restored per history key. Offline allows reading existing state; writes fail clearly with draft preserved; no hidden offline queue.

## States
Loading skeleton; initial connection error with retry; list empty with primary creation; no search results with clear action; offline/reconnecting banner; cached/stale display distinct from server current; saving disabled duplicate-submit guard; success toast; access denial inline; conflict and deleted-while-editing; safe destructive dialog; keyboard input; archived records; unknown legacy status preserved; renamed/deleted store historical snapshot; zero money; long labels and accessibility zoom.

## Internal design review before implementation
KEEP: compact task-led Today, obvious monetary typography, detail-first navigation, native form controls, five destinations.
REJECTED: floating button over final card; nested job/edit modal stack; auto-changing historical store labels; default paid on new work; simulated optimistic success before persistence.
Accepted contract: render gallery in this directory. Real screens share these tokens and spacing, with native Safari controls where platform behaviour is stronger. Synthetic reference date and values may differ from live demo fixtures. Physical iPhone keyboard and safe-area behaviour remain owner QA gates.

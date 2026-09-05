# Master redesign progress

## Phase 01 — foundation

- Dedicated branch: `design/master-redesign`
- Existing `Astera-smart` remains untouched.
- Added `master-redesign.css` as the new mobile visual-system layer.
- Production wrapper now references the new design layer from this branch.

## Non-negotiables

The redesign layer does not alter Firebase paths, data schema, business calculations, or application event bindings. The existing stable application remains the source of behavior.

## Next gate

Preview deployment + iPhone regression before any production promotion.

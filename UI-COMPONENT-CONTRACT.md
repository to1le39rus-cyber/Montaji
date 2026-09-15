# Montaji UI Component Contract

## Single source of truth
All shared UI primitives are defined in `modules/design-system.css` and tokenized in `modules/design-tokens.js`.

## Canonical primitives
- Fields: one 48px control height, one radius, one focus ring, one border treatment.
- Primary / secondary / danger buttons: fixed hierarchy, radius, height, typography and press feedback.
- Status pills: shared shape and typography; only semantic color may vary.
- Action chips: shared compact control geometry.
- Modal / bottom sheet: shared surface, radius and backdrop.
- Spacing and motion use the shared token scale.

## Rules
1. Feature screens may compose primitives but must not redefine their geometry.
2. New shared UI belongs in the design system, not in a screen-specific CSS file.
3. No `!important` is permitted in the canonical primitive layer.
4. Business logic never depends on CSS classes or DOM text.
5. Visual polish is allowed at component level, but duplicated controls are not.
6. A new primitive requires updating this contract and the token source.

## QA
Every new screen must be checked on iPhone-sized viewport for:
- field consistency;
- button consistency;
- status/chip consistency;
- tap target size;
- focus/active feedback;
- reduced-motion behavior.

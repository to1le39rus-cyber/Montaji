# Montaji Design System

The app follows a **single visual language**: premium, mobile-first, operational and calm.

## Architecture
`design-tokens.js` → `design-system.css` → screen/component CSS.

The token and primitive layers are canonical. Screen styles compose them; they do not redefine fields, buttons, pills, chips, sheets or motion foundations.

## Visual principle
- Background: warm off-white.
- Surfaces: clean white cards.
- Accent: restrained olive.
- Text: near-black with quiet secondary text.
- Radius: consistent, soft, compact.
- Controls: 48px standard height for reliable mobile taps.
- Motion: short press feedback; restrained transitions; reduced-motion support.

## Product principle
Today is the operational home. Calendar, Money, Clients and More should feel like the same product, not five mini-apps.

## Forbidden drift
- one-off field geometry;
- random button radii/heights;
- feature-specific focus styles;
- duplicate modal/sheet shells;
- business rules encoded in visual classes;
- runtime CSS injection or source rewriting.

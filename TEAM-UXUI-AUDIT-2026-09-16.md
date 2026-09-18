# Team UX/UI audit — 2026-09-16

## Scope
Montaji AA mobile product, current `design/today-v2` implementation.

## Findings
1. `app.js` already renders the montage comment in `.job-details .note-line`.
2. `modules/job-card-enhancer.js` independently injected a second comment block at runtime. This caused the duplicated comment visible in the iPhone preview.
3. `modules/planning-view.js` imported runtime-only UI layers (`ux-polish.js`, `job-card-enhancer.js`) into a module whose stated responsibility is a pure planning view-model.
4. `modules/ux-polish.js` injected CSS at runtime, including `!important`, which conflicts with the project's canonical design-system rule.
5. The canonical UI layer is currently `montaji-design-v3.css`; the remaining screen/component work must move toward static, explicit CSS rather than mutation-driven styling.

## First cleanup pass
- Removed the duplicate `job-card-enhancer` import.
- Removed the obsolete `job-card-enhancer.js` module.
- Removed the `ux-polish.js` import and deleted that runtime CSS module.
- Kept the business planning view-model pure.
- Created a static `modules/ux-style.css` as the target home for the job-detail presentation rules.

## Acceptance gate before Preview
- No duplicate content or component injection.
- No runtime CSS injection.
- No `!important` in feature UI layers unless explicitly justified at the system boundary.
- One canonical visual layer per primitive.
- Today reviewed as a complete screen, not component-by-component.
- `npm test` passes on the final head.
- Firebase smoke and mobile QA pass.
- Production/Firebase Rules/data unchanged.

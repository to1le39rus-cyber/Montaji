# Astra self-audit · owner review gate

Reviewed against base `fb28482a4ed3524ebf6686f4a9ba148309d3d431`.

## Architecture and data
- One canonical UI and one repository/domain path serve synthetic DEV and the exact production hostname. Preview hosts default to synthetic data. Firestore is loaded dynamically only on `montaji.vercel.app`.
- Shared/notes v5 documents and all unknown legacy fields remain compatible. No production migration, data write, Rules deployment, Vercel change or baseline merge was performed.
- Field-intent edits compare the form base inside the transaction. Unrelated remote fields merge; same-field edits report a conflict; deleted entities are not resurrected. Stable create IDs and operation IDs make response-loss retries idempotent.
- Screens consume subscription state only. A transaction acknowledgement never appends or replaces local entities. Open forms keep their draft when a remote snapshot arrives.
- Store jobs use `storeId` plus `storeNameSnapshot`; old `source`/`store` values remain readable. Rename/archive does not rewrite history. Duplicate active names use normalized case and whitespace.
- Synthetic DEV uses its own clearly labelled IndexedDB database and BroadcastChannel. Production uses Firestore directly and does not read synthetic storage. Persistent production cache was intentionally removed until a user-scoped encrypted/cleared policy is approved.

## Product and UI
- Detail-first routes, five primary tabs, business date in Europe/Kaliningrad, native scrolling, safe areas, 48px controls, 16px fields, reduced-motion support, visible focus and semantic dialogs.
- Completed-date money semantics, global debt, cancelled client history, expense cancellation, note archive, measurement conversion, all-or-nothing payment, archived store selection rules and unknown legacy statuses are preserved.
- All user strings entering HTML templates pass through escaping; icon markup is a fixed internal map. No user content is placed in executable attributes or URLs except escaped `tel:` values.

## Automated evidence
- 57 tests pass, including concurrent disjoint edits, same-field conflict, deletion while editing, snapshot/ack ordering, repeat create, store duplicates/rename/archive, atomic measurement conversion, legacy normalization and business timezone.
- JavaScript syntax and production legacy checks pass. Git diff whitespace check passes.

## Gates still required
- GitHub-hosted Actions jobs currently fail before a runner starts (`runner_id: 0`, no steps). Therefore Pages cannot yet be switched from the old unsafe preview source through CI. Owner must enable GitHub Actions for this repository or allow `astra-dev` to run. After that, the committed workflow tests and selects `astra-dev` as Pages source.
- Physical iPhone Safari QA is required for software keyboard, Dynamic Island/safe area, Add to Home Screen and long content at accessibility zoom.
- Production Firestore Rules remain the baseline rules. Before release, review and deploy schema validation, verified-account/role authorization and deny-by-default coverage separately. This is deliberately outside this branch’s automatic actions.
- Production authentication and Firestore transport are wired but have not been exercised against production because that would expose real data and create release risk. Owner review follows a successful synthetic Pages pass; production verification follows explicit production approval.

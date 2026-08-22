# PRE-CLEANUP SNAPSHOT

Date: 2026-08-22
Branch: Astera-smart
Commit before cleanup: `79fde3ba69c2fa384ad7c3a28e2d55be5261fde8`
Live QA host: https://montaji.vercel.app
Firebase project: `montaj-39`

## Safety

No Firestore data migration or destructive operation is part of this cleanup. `appData/shared` and `appData/notes` remain the production source of truth.

## Cleanup intent

- remove dead Notes/support files;
- remove legacy Notes DOM;
- make Work Inbox the sole visible Notes UI;
- remove the old Vercel snapshot indirection;
- reduce runtime patching where safely possible;
- keep financial/job/measure data structures unchanged.

This file records the pre-cleanup code commit for rollback/reference.

# Montaji iPhone V2 Sandbox

This branch is a safe clone/preview of `Astera-smart` for UX modernization before production migration.

Goals:
- Today-first mobile workflow;
- important alert cards are actionable and open the affected records;
- every alert explains what happened, why, and when the next visit is;
- reminders for upcoming work and unresolved items;
- large iPhone touch targets and safe-area handling;
- object/work mode with route, call, status and payment actions;
- fast new visit flow;
- preserve Firestore as source of truth and never touch production data;
- preserve all existing business invariants.

Do not connect this sandbox to a new database or mutate production data. UX changes should be promoted only after Safari testing and regression QA.

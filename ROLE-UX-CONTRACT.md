# Step 5 — Role UX Contract

## Purpose

Introduce role-aware UX without changing Firebase Rules or migrating existing users.

The role model is a presentation/behavior contract for the next implementation stage. It is **not** a security boundary.

## Canonical roles

- `manager` — Менеджер
- `installer` — Монтажник
- `store` — Магазин

A role is usable only when the user profile is known and `active == true`.

## Manager

Primary workflow:

**График → Выезды → Распределение → Деньги → История**

Can see:

- all jobs;
- workload by day;
- three planning windows and free windows;
- additional montages;
- distribution/assignment information;
- financial and operational overview;
- internal operational details.

## Installer

Primary workflow:

**Мой день → Выезд → Выполнение → Мои деньги**

Can see:

- own jobs;
- own day;
- own operational actions;
- money relevant to own completed work.

Must not receive the manager's all-jobs or financial overview merely because the UI is hiding it.

## Store

Primary workflow:

**Мои заявки → Доступные окна → Клиент**

Can see:

- own requests/clients;
- booking-suitable availability windows;
- enough information to select a window.

Should not need internal team details, internal finance, or other stores' requests.

## Unknown / inactive profile

An unknown or inactive role must not silently fall back to a privileged role.

The UI may show a neutral access/profile state while the security layer determines actual data access.

## Store scoping

`storeId` is required when store-specific data needs to be scoped to a store. The role model must not infer a store from display names or email addresses.

## Security boundary

The UI can hide navigation and actions, but Firestore Rules remain the authoritative security boundary.

This step must not:

- modify `firestore.rules`;
- migrate `users/{uid}`;
- create users automatically;
- modify production data;
- deploy production.

## Implementation sequence

1. Keep the canonical role model pure and testable.
2. Inventory real Auth UIDs and existing `users/{uid}` profiles in an administrative/test context.
3. Confirm `role`, `active`, and `storeId` where applicable.
4. Add role-aware UI filtering only after the profile shape is confirmed.
5. Add Rules tests in a non-production environment.
6. Only then prepare a separate production Rules change for explicit approval.

# MONTRA partner backend contract

This contract separates partner-store access from the legacy appData/shared document.

## Collections

### storeMemberships/{storeId}_{uid}
- storeId
- uid
- role: admin | manager
- active: boolean
- createdAt / updatedAt

Membership documents are the authorization boundary for partner users. Partner users never read appData/shared.

### storeRequests/{requestId}
One request keeps its identity for its whole lifecycle.

Required ownership:
- organizationId
- salonId
- managerId

Request context:
- kind: measure | installation
- client / phone / address
- managerComment
- schedulingMode: preferred | client_call
- desiredDate / windowId
- scheduledDate / scheduledTime

Lifecycle:
- installer_review
- store_action
- scheduled
- measured
- completed

Measurement result is stored on the measurement request. Creating an installation creates a linked installation request; it does not mutate or erase the measurement.

Link fields:
- sourceMeasurementId on installation
- installationRequestId on measurement

### events/{eventId}
Append-only business events are the source for in-app notifications and, later, Web Push delivery.

Examples:
- measurement_requested
- installation_requested
- measurement_scheduled
- measurement_completed
- installation_scheduled
- installation_rescheduled
- installation_completed

Push is a delivery channel, not the source of truth.

## Security invariants
- operators can work across partner requests;
- partner users can only read requests belonging to stores for which an active membership exists;
- a manager creating a request must use their own auth uid as managerId;
- store users never receive access to appData/shared;
- requests and events are not hard-deleted;
- production Rules are not deployed until emulator/real-account tests pass and the owner explicitly approves the migration.

## Rollout
1. Domain + repository + Rules contract in feature branch.
2. Test with isolated Firebase data and test accounts.
3. Connect partner portal and installer inbox to realtime repository.
4. Verify measurement -> installation lifecycle from two accounts.
5. Add event writer and push subscriptions.
6. Only after explicit approval, deploy Rules/backend changes and promote application code.

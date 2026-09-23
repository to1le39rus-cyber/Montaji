# MONTRA Stores — Foundation Contract

Status: planning/build branch only. Production is not modified by this document.

## Goal

Extend MONTRA from an installer workspace into a controlled interaction system between installer and partner stores. A store should be able to create a request that arrives in the installer's MONTRA workspace without receiving access to the installer's private jobs, finances, notes, clients, or other stores.

## First usable flow

1. Installer creates/invites a store.
2. Store gets its own isolated workspace.
3. Store creates a request.
4. Request contains:
   - customer name;
   - customer phone;
   - address;
   - requested/preferred date;
   - opening width;
   - opening height;
   - opening side / door handing;
   - photos (optional);
   - comment.
5. Installer receives the request in MONTRA and can accept it into the working schedule.
6. Store can see the state of its own request, but cannot see installer-private fields.

## Request lifecycle

Initial contract:
- new — submitted by store;
- accepted — installer accepted it;
- scheduled — date/time confirmed;
- completed — work completed;
- cancelled — cancelled with preserved history.

Do not overload the existing job status strings. Store request status and installer job status are separate concepts linked by IDs.

## Data boundary

The current shared Firestore document must NOT be exposed to stores.

Target entities:
- stores/{storeId}
- storeMembers/{membershipId} or equivalent membership model
- storeRequests/{requestId}
- installer job keeps nullable storeId + immutable storeNameSnapshot + nullable storeRequestId

A store request may later support multiple openings. For v1 keep one opening in the form, but model it as an array-compatible structure so the UI can grow without rewriting the request identity.

Suggested request shape:

{
  id,
  storeId,
  storeNameSnapshot,
  createdBy,
  createdAt,
  customer: { name, phone },
  address,
  preferredDate,
  openings: [{
    width,
    height,
    handing,
    photos: []
  }],
  comment,
  status,
  linkedJobId,
  updatedAt
}

## Security invariants

- Store member reads/writes only requests belonging to their store.
- Store member never reads installer finances, notes, unrelated clients/jobs, or other stores.
- Installer/admin can read and manage connected stores and requests.
- Linking a request to a job is server/rules validated and idempotent.
- Historical storeNameSnapshot is not rewritten when a store is renamed.
- Store deletion is archive/disable, not destructive deletion of history.

## Existing data compatibility

Do not auto-bind historical jobs to stores by matching display names. Existing jobs remain valid with their string store/source fields. Stable storeId is added only to new/explicitly linked records until a separate reviewed migration exists.

Legacy statuses and current MONTRA production behavior must remain untouched while Stores is developed.

## Delivery plan

Phase A — foundation:
- stable store identity;
- request domain model;
- isolated Firestore collections/rules;
- fixture/dev data;
- tests for cross-store isolation.

Phase B — store workspace:
- store login/invite;
- create request;
- own requests list/detail;
- request status.

Phase C — installer inbox:
- incoming requests;
- accept/reject/schedule;
- convert/link request to MONTRA job;
- preserve source and request history.

Phase D — richer measurements:
- multiple openings;
- more photos/files;
- measurement-specific fields;
- notifications and audit trail.

## Acceptance gate before production

No production data migration and no production Rules change until:
- isolated preview/backend is tested;
- cross-store access tests pass;
- existing MONTRA job CRUD and financial calculations are regression-tested;
- request → job linking is idempotent;
- owner explicitly approves promotion.

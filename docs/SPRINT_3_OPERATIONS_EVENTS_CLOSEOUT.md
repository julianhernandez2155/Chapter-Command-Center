# Sprint 3 Closeout: Operations And Events

## Status

Sprint 3 is complete.

The Events area now reads and writes live hosted Supabase `events` records. The event list and detail page no longer use `MOCK_EVENTS`, event creation is available to the personas allowed by Supabase RLS, and event edit/archive behavior is wired for President, Secretary, and event creators where RLS permits it.

## Completed

- Added typed Supabase event helpers in `src/lib/events.ts`.
- Replaced mock event list data in `src/pages/Events.tsx`.
- Replaced mock event detail data in `src/pages/EventDetails.tsx`.
- Added live event list filtering for upcoming, past, and archived events.
- Added live event detail view with event metadata and read-only attendance counts from `event_attendees`.
- Added event creation flow.
- Added event edit flow.
- Added event archive and restore flow.
- Added event capabilities to the code-level permission registry:
  - `events.create`
  - `events.edit`
  - `events.archive`
- Aligned UI permissions with observed Supabase RLS:
  - President: create, edit, archive.
  - Secretary: create, edit, archive.
  - Recruitment Chairman: create, edit/archive own created event.
  - Scholarship Chairman: create, edit/archive own created event.
  - Treasurer: read-only for Events.
  - General Member: read-only for Events.

## Verification

Last verified:

- `npm run lint` passed.
- `npm run build` passed.
- Hosted Supabase smoke test passed:
  - President could create, edit, archive, and cleanup-delete a temporary event.
  - Secretary could create, edit, archive, and cleanup-delete a temporary event.
  - Recruitment Chairman could create, edit, archive, and cleanup-delete a temporary event.
  - Scholarship Chairman could create, edit, archive, and cleanup-delete a temporary event.
  - Treasurer could read events but event insert was blocked by RLS.
  - General Member could read events but event insert was blocked by RLS.
- Browser verification passed at `http://localhost:5173/events`:
  - Treasurer does not see `Create Event`.
  - Recruitment Chairman sees `Create Event`.
  - Secretary sees live past events and event detail actions.
  - General Member sees Events without admin actions.

## Known Deferrals

These are intentionally not complete in Sprint 3:

- Attendance writes remain out of scope.
- Check-in open/close remains read-only in the event detail UI.
- QR portal behavior remains out of scope.
- CSV attendance import remains out of scope.
- Excusal submission/review remains out of scope.
- Event type/category expansion is deferred; the hosted database currently accepts `chapter_meeting` / `social` and `mandatory` / `optional`.

## Sprint 4 Entry Point

Sprint 4 should build attendance and excusals on top of the now-live Events layer:

- Check-in open/close workflow.
- Attendance ledger writes to `event_attendees`.
- CSV attendance import using existing matching logic.
- Member excusal submission.
- Officer excusal review.

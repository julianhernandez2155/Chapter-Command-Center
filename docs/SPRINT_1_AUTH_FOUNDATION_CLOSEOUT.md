# Sprint 1 Closeout: Auth Foundation

## Status

Sprint 1 is complete.

The Vite React SPA is connected to hosted Supabase, real Supabase Auth sessions are active, seeded developer personas are linked to `public.members.auth_user_id`, and top-level route access is guarded by the authenticated member's active positions.

## Completed

- Added Supabase browser client.
- Added `AuthProvider` and `useAuth`.
- Added hosted Supabase session loading with `supabase.auth.onAuthStateChange`.
- Added member profile lookup from `public.members`.
- Added role lookup through the `user_positions` RPC.
- Added protected route wrapper.
- Added development persona switcher.
- Seeded and linked developer Auth users:
  - President
  - Secretary
  - Treasurer
  - Sergeant-at-Arms
  - Recruitment Chairman
  - Scholarship Chairman
  - General Member
- Added role-filtered sidebar visibility.
- Added `.env.example` and ignored local env files.
- Initialized git and pushed public GitHub repo.
- Recorded the authorization model in `docs/AUTHORIZATION_MODEL.md`.

## Verification

Last verified:

- `npm run lint` passed.
- `npm run build` passed.
- Hosted Supabase auth smoke test passed.
- General member could only see their own member row.
- Secretary could see the roster and resolved the `secretary` role.
- Vite dev server was running at `http://localhost:5173/`.

## Known Deferrals

These are intentionally not complete in Sprint 1:

- Dashboard and positions still read mock data.
- Events still read mock data.
- Chairman Reports still use `localStorage`.
- Admin Reports still read `localStorage`.
- Attendance import is still frontend-only.
- Permissions are currently role/position based; Sprint 2 should introduce a small code-level permission registry before a database-backed permission editor.

## Sprint 2 Entry Point

Sprint 2 should wire the live roster and positions layer first. That gives every later workflow a reliable source for:

- current member identity
- active positions
- officer/chairman/member visibility
- permission checks
- future workflow ownership


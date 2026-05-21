# Chapter Command Center — Pre-16 Hardening + V2 Alignment Plan

Purpose: improve the existing Features #1-#15 MVP before starting Features #16-#29.

End state: the app remains a working local Next.js/Supabase CLI web app, but has production-grade authorization direction, stronger RLS alignment, cleaner role-specific navigation, and a UI/UX pass that implements the Stitch v2 screens as the primary design contract.

This is not the plan for Features #16-#29. This is the checkpoint that makes the foundation strong enough to build them safely.

---

## Source Inputs

Read these first in the new Codex session:

- `.planning/FEATURE-BUILD-ORDER.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/MVP-PRODUCTION-READINESS-AUDIT.md`
- `.planning/GOAL-PROGRESS.md`
- `README.md`
- `CLAUDE.md`
- `UI Prototypes/v1-stitch-mockup/garnet_gold_ritual/DESIGN.md`
- `v2-stitch-mockups/garnet_gold_ritual/DESIGN.md`
- all relevant screens/code under `v2-stitch-mockups/`
- Google AI Studio prototype at `/Users/Julian/Downloads/chapter-command-center`

Current implementation source of truth:

- Next.js app: `src/app/`
- server actions: `src/app/actions.ts`
- auth/session helpers: `auth.ts`, `src/lib/session.ts`
- Supabase server client: `src/lib/supabase/server.ts`
- migrations: `supabase/migrations/`
- seed data: `supabase/seed.sql`
- tests: `tests/`

Design reference hierarchy:

1. Current Next/Supabase app is the functional source of truth.
2. Stitch v2 mockups are the visual/layout implementation contract.
3. Google AI Studio prototype is the interaction-pattern reference.
4. Codex may diverge from Stitch v2 only when needed for real implementation quality: data integrity, auth/RLS, accessibility, responsive behavior, performance, or consistency with the existing Next/Supabase architecture.
5. Every meaningful visual/layout deviation from Stitch v2 should be documented in `.planning/GOAL-PROGRESS.md` with the reason.
6. Do not port fake auth, mock data, placeholder routes, remote placeholder images, or unused Gemini code from the Google prototype.

Practical UI rule:

- Recreate the Stitch v2 screens in the real app as closely as possible.
- Prefer Stitch v2 page composition, spacing, hierarchy, copy structure, and interaction states over the current MVP UI.
- Use the existing app's real server actions, permissions, RLS strategy, and Supabase persistence underneath those screens.
- Do not copy prototype code blindly if a native implementation is cleaner or safer.

---

## Non-Negotiable Constraints

- Keep Next.js 16 App Router, TypeScript, Tailwind, shadcn/ui, Geist unless there is a deliberate documented design-system decision.
- Keep local Supabase CLI/Docker as the primary dev database path.
- Do not require hosted Supabase, Vercel, Google OAuth production credentials, or Gemini credentials for local completion.
- Preserve the dev auth fallback for local work, but ensure it is disabled when `ENABLE_DEV_AUTH=false`.
- Never use `git add .`; stage specific files only.
- Do not start Features #16-#29 during this pass.
- Do not remove working MVP behavior unless replacing it with verified equivalent behavior.
- Keep Flare integration manual-only.
- Treat anonymous form answers correctly: completion tracks identity; anonymous answer content does not expose member attribution.
- Service-role access must be consciously restricted and documented. Do not let service-role queries become the default mental model for feature work.

---

## Strategic Decision

Choose the production authorization strategy before building more features.

Recommended decision: **real RLS path**.

Rationale:

- The original spec explicitly requires RLS and permission verification.
- Supabase hosted + Vercel is the planned production path.
- Features #16-#29 will add more sensitive data: reports, budgets, compliance, academics, event approvals.
- Building those on top of service-role-by-default access will make future hardening more expensive.

Acceptable local pattern after this plan:

- User/member-scoped reads and ordinary member/officer mutations use a Supabase client that can exercise RLS where practical.
- Service-role client remains available only for narrow trusted server operations that are explicitly app-authorized first.
- Every service-role use should be easy to identify and justified.

---

## Phase 0 — Baseline Inventory And Safety Check

Goal: confirm current behavior before changing foundation code.

Tasks:

1. Check git state.
2. Confirm recent commits are present:
   - MVP build commit
   - onboarding error fix
   - authorization hardening commit
   - e2e secret fix
   - production-readiness audit doc
3. Run or confirm local services:
   - `supabase start`
   - `supabase db reset`
   - `npm install`
   - `npm run dev -- --port 3000`
4. Run baseline checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
5. Run the existing Playwright suite if Supabase service role env is available.
6. Update `.planning/GOAL-PROGRESS.md` with baseline results.

Acceptance criteria:

- Current app starts locally.
- Existing tests/build pass or failures are documented before edits.
- No untracked prototype folders are accidentally staged.

Commit:

- No commit unless documentation is updated.

---

## Phase 1 — Auth, RLS, And Permission Hardening

Goal: resolve the Claude audit blockers before expanding the app.

### 1.1 Wire `members.auth_user_id`

Tasks:

- Inspect Auth.js session shape and user id availability.
- Ensure onboarding records the authenticated user id into `members.auth_user_id`.
- Ensure dev auth creates stable local user identity suitable for local RLS tests.
- Backfill seed/demo members with predictable `auth_user_id` values where needed.
- Keep `google_email` lookup for backwards compatibility, but do not make it the only identity bridge.

Acceptance criteria:

- New onboarded users have `members.auth_user_id` populated.
- Existing seeded users work with dev auth.
- `jlhernan@g.syr.edu` flow does not get stuck on onboarding.

### 1.2 Rewrite `current_member_id()`

Tasks:

- Update SQL helper to derive the current member from `auth.uid()`:
  - `select id from members where auth_user_id = auth.uid()`
- Keep a test-only fallback only if required by the local RLS SQL harness, and name/document it as test-only.
- Update dependent helpers:
  - `user_positions()`
  - `has_position()`
  - `is_officer()`
- Update migrations and reset seed flow.

Acceptance criteria:

- RLS policies resolve the member from Supabase auth identity, not from `members.id = jwt.sub`.
- Test harness behavior is explicit and cannot be mistaken for production behavior.

### 1.3 Introduce Clear Supabase Client Boundaries

Tasks:

- Keep `getSupabaseAdmin()` only for trusted server-side operations that need elevated access.
- Add a user-scoped Supabase server client path for RLS-sensitive queries where feasible.
- Create naming that makes privilege obvious, for example:
  - `getSupabaseAdmin()`
  - `getSupabaseUserClient()` or equivalent
- Audit every `getSupabaseAdmin()` use in:
  - server pages
  - server actions
  - API routes
  - tests
- For service-role actions, ensure app-layer checks run before the privileged query.

Acceptance criteria:

- Sensitive service-role usage is reduced or justified.
- Admin pages still have `requirePositions()` / `requireOfficer()` gates.
- General member access to `/admin/*` is blocked.

### 1.4 Expand Permission And RLS Tests

Tasks:

- Add unit tests for new/changed helpers:
  - `requirePositions`
  - `requireOfficer`
  - permission role mapping
- Expand `tests/rls/rls.sql` with denied and allowed cases:
  - general member cannot read other member dues
  - general member cannot read admin roster views
  - chairman cannot see another chairman's draft form section
  - chairman can see own accepted/published section responses
  - anonymous answers are not attributable in chairman/member-facing reads
  - general member cannot insert `tier_snapshots`
  - tier snapshots cannot be updated
  - member cannot review own excusal
  - treasurer cannot update events
  - member cannot read ineligible overrides
  - SAA academic access remains scoped/gated as designed
- Add Playwright negative path:
  - sign in as general member
  - visit `/admin/dues`, `/admin/forms`, `/admin/members`, `/admin/tiers`
  - verify redirect to `/dashboard?error=forbidden` or equivalent blocked state

Acceptance criteria:

- Unit tests pass.
- RLS SQL tests pass against local Supabase.
- E2E proves a general member cannot access officer-only surfaces.

Commit:

- `fix: Harden auth and RLS foundation`

---

## Phase 2 — Data Model Updates For V2 UX

Goal: add the missing data fields that v2 onboarding and officer workflows need without jumping into Features #16-#29.

Tasks:

1. Compare current schema against v2 Stitch onboarding and Google prototype member model.
2. Add or verify fields for:
   - preferred name
   - personal email if needed
   - phone
   - graduation year
   - major
   - dorm/housing location
   - room
   - t-shirt size
   - instagram
   - snapchat
   - linkedin
   - venmo
   - parent outreach consent
3. Normalize emergency contacts into a separate table if not already present:
   - member id
   - contact name
   - relationship
   - phone
   - email if needed
   - primary flag
4. Add event fields needed by v2 event command views:
   - expected count
   - officer notes
   - allow excusals
   - QR/check-in state metadata
5. Add import-review persistence only if needed:
   - import batch
   - row match status
   - confidence
   - reviewed by
6. Add indexes recommended by the audit if useful now:
   - `event_attendees(member_id)`
   - `event_attendees(event_id, status)`
   - `excusals(member_id, status)`
   - `dues_payments(member_id, semester)`
7. Update seed data to cover the expanded fields.
8. Update type definitions and tests.

Acceptance criteria:

- Supabase reset applies cleanly.
- Seed data loads realistic demo values.
- Existing UI keeps working after schema changes.
- No fake Google prototype data is copied as production seed unless intentionally adapted.

Commit:

- `feat: Prepare schema for v2 UX alignment`

---

## Phase 3 — Design System And App Shell Alignment

Goal: make the app feel like one product before adding more modules.

Inputs:

- Stitch v2 garnet/gold ritual design.
- Google prototype `SideNavBar.tsx`, `TopAppBar.tsx`, `index.css`.
- Current app shell in `src/components/app-shell.tsx`.

Tasks:

1. Centralize design tokens:
   - garnet
   - gold
   - dark surfaces
   - border/outline colors
   - muted text
   - success/warning/danger states
2. Remove duplicated inline hex where practical.
3. Build a role-aware navigation shell:
   - general member sees member dashboard, events, excusals, dues/form status
   - President sees full officer command access
   - Secretary sees roster, events, attendance import, forms, tiers, ineligible list
   - Treasurer sees dues and relevant roster/payment views
   - SAA sees excusals, ineligible/accountability surfaces
   - Chairman sees form intake, own submissions, own responses, events as appropriate
4. Borrow nav grouping from Google prototype:
   - Command
   - Attendance
   - Events
   - Members
   - Forms & Requests
   - Admin Protocol
5. Do not show dead routes or placeholder nav items.
6. Add a restrained top bar:
   - page title
   - role/position context
   - optional search placeholder only if functional
7. Check mobile behavior:
   - no horizontal overflow
   - nav usable on phone
   - member workflows prioritized on mobile
8. Add visible blocked/forbidden feedback on `/dashboard?error=forbidden`.

Acceptance criteria:

- Navigation is role-aware and does not expose pages users cannot access.
- Current routes remain reachable for authorized roles.
- No placeholder pages are introduced.
- App shell and navigation match the relevant Stitch v2 screens as closely as practical.
- Any deviation from Stitch v2 is documented with a reason.

Commit:

- `feat: Align app shell with v2 command navigation`

---

## Phase 4 — Onboarding V2

Goal: replace the basic onboarding experience with the richer Stitch v2 / Google prototype flow while preserving real persistence and validation.

Inputs:

- Stitch v2 onboarding screens:
  - `onboarding_step_1_personal_profile_refined`
  - `onboarding_step_2_logistics_socials_refined`
  - `onboarding_step_3_contacts`
  - `onboarding_step_4_review_certify`
- Google prototype `Onboarding.tsx`.

Tasks:

1. Implement multi-step onboarding:
   - personal profile
   - logistics/socials
   - emergency contacts
   - review/certify
2. Validate:
   - `@g.syr.edu` email
   - SUID format
   - required profile fields
   - phone format where practical
   - emergency contact minimums
3. Persist all fields to Supabase.
4. Surface duplicate and database errors inline.
5. Ensure onboarding sets `auth_user_id`.
6. Test dev auth and local user creation.

Acceptance criteria:

- New user can complete onboarding from a clean DB.
- Existing user is redirected away from onboarding.
- Failed inserts show actionable errors.
- Rows persist in `members` and emergency contacts.

Commit:

- `feat: Upgrade onboarding to v2 profile flow`

---

## Phase 5 — Event And Attendance UX Alignment

Goal: upgrade the operational event/check-in/import surfaces without changing the underlying MVP semantics.

Inputs:

- Stitch v2:
  - `events_list_polished`
  - `event_detail_hub_polished`
  - `event_detail_check_in_open`
  - `create_event_form`
  - `event_management_dashboard`
  - `qr_scanner_interface`
  - `check_in_success`
  - `check_in_outcomes_mobile`
  - `import_attendance_upload`
  - `import_attendance_review_matches`
  - `manual_override_all_members`
- Google prototype:
  - `Events.tsx`
  - `EventDetails.tsx`
  - `CheckIn.tsx`
  - `ImportAttendance.tsx`

Tasks:

1. Redesign `/events` list:
   - upcoming/past filters
   - mandatory badges
   - attendance progress
   - officer create action only when authorized
2. Redesign `/events/[id]` as event command hub:
   - summary metrics
   - attendance tab
   - event details tab
   - officer notes tab if authorized
   - QR/check-in status panel
   - recent attendance activity if data exists
3. Improve QR/check-in member flow:
   - success
   - already checked in
   - late
   - closed
   - unauthorized/not onboarded
4. Improve manual override UI:
   - searchable member list
   - on-time/late/excused override where appropriate
   - reason/note if required
5. Replace basic CSV import UX with staged flow:
   - upload/paste
   - parse
   - review matches
   - confirm import
   - show skipped/deduped rows
6. Keep existing dedupe and fuzzy matching logic covered by tests.

Acceptance criteria:

- Browser test event creation.
- Browser test QR check-in as member.
- Browser test manual check-in as officer.
- Browser test CSV import with high/medium/low confidence rows.
- DB rows in `events` and `event_attendees` match browser actions.

Commit:

- `feat: Upgrade event and attendance workflows`

---

## Phase 6 — Forms, Dues, Excusals, And Tier UX Alignment

Goal: bring the most important officer/member workflows up to the v2 product standard.

### 6.1 Forms

Inputs:

- Stitch v2:
  - `secretary_form_management_hub`
  - `form_builder_week_9`
  - `chairman_section_submission_intake`
  - `chairman_section_submission_status_refined`
  - `chairman_response_view_cleaned_layout`
- Google prototype:
  - `SecretaryHub.tsx`
  - `FormBuilder.tsx`
  - `FormIntake.tsx`
  - `FormResponses.tsx`
  - `FormStatus.tsx`

Tasks:

- Redesign chairman intake.
- Redesign Secretary form hub.
- Improve form builder layout.
- Improve member form completion UI.
- Improve chairman response view.
- Preserve anonymity rules.
- Add tests for anonymous and non-anonymous response rendering.

Acceptance criteria:

- Chairman sees only own sections/responses.
- Secretary sees incoming sections and completion status.
- Anonymous answers never show names in chairman view.
- Completion still tracks identity for tier credit.

### 6.2 Dues

Inputs:

- Stitch v2 `dues_payment_tracking`
- Google prototype `DuesTracking.tsx`

Tasks:

- Redesign Treasurer dues ledger.
- Add clearer paid/partial/unpaid states.
- Improve log payment modal/drawer.
- Ensure Treasurer-only write access.
- Keep member self-view for own dues.

Acceptance criteria:

- Treasurer can log payment.
- General member cannot access ledger.
- Member dashboard updates dues status.

### 6.3 Excusals

Inputs:

- Stitch v2:
  - `member_excusals_dashboard`
  - `submit_excusal_form`
  - `ivp_excusal_review_queue`
- Google prototype:
  - `MemberExcusals.tsx`
  - `ExcusalReview.tsx`

Tasks:

- Redesign member excusal dashboard.
- Redesign submit excusal flow.
- Redesign officer review queue.
- Require denial reason where appropriate.
- Keep SAA/President/Secretary access rules.

Acceptance criteria:

- Member can submit excusal.
- SAA can approve/deny.
- General member cannot review.
- Tier/ineligible logic reflects approved excusals.

### 6.4 Tiers And Ineligible List

Tasks:

- Improve member tier dashboard readability.
- Improve officer tier calculation surface.
- Improve Flare-ready ineligible list generation view.
- Preserve append-only tier snapshots.
- Add missing tests for tier snapshot append-only behavior and dues/tier effects.

Acceptance criteria:

- Officer can run tier calculation.
- Snapshot rows append, not update.
- Ineligible list content is copy-ready for Flare.

Commit:

- `feat: Upgrade accountability workflow UX`

---

## Phase 7 — Validation Loop

Goal: prove the hardened and redesigned MVP is safe to build on.

Required checks:

1. Clean local setup:
   - remove/recreate local DB via `supabase db reset`
   - confirm seed data loads
2. Static checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
3. RLS:
   - run expanded `tests/rls/rls.sql`
   - record allowed/denied cases in `.planning/GOAL-PROGRESS.md`
4. Browser workflows by role:
   - general member
   - President
   - Secretary
   - Treasurer
   - SAA
   - Chairman
5. Browser workflows:
   - sign in through dev fallback
   - onboarding
   - position assignment
   - member registry edit
   - event creation
   - QR check-in
   - manual check-in
   - CSV import
   - excusal request/review
   - dues logging
   - form intake/assembly/completion/responses
   - tier calculation
   - ineligible list generation
   - member dashboard
   - officer dashboard
6. Confirm database persistence after browser actions.
7. Capture screenshots or notes for failed flows; fix and rerun.
8. Update documentation:
   - README local setup
   - README production deployment notes
   - `.planning/GOAL-PROGRESS.md`
   - `.planning/MVP-PRODUCTION-READINESS-AUDIT.md` or follow-up audit note

Acceptance criteria:

- Fresh local developer path works.
- No intentionally unfinished placeholder pages for #1-#15.
- RLS/permissions behavior is explicit and tested.
- UI is aligned enough with v2 to avoid redesign churn during #16-#29.
- Features #16-#29 can begin with confidence.

Final commit:

- `docs: Record pre-16 hardening validation`

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| RLS migration breaks local dev auth | High | Preserve dev auth fallback and seed stable test identities. |
| User-scoped Supabase client conflicts with Auth.js sessions | High | Keep service role for narrow actions while progressively adding RLS-aware paths; test each conversion. |
| UI rewrite causes workflow regressions | High | Keep route semantics and server actions stable; browser-test each role. |
| Stitch v2 and Google prototype disagree | Medium | Stitch v2 wins visually; Google wins only for interaction ideas. |
| Theatrical copy reduces usability | Medium | Keep ritual flavor in headings/statuses, but use clear operational labels for repeated tasks. |
| Too much redesign before #16 | Medium | Limit work to existing #1-#15 surfaces plus foundation gaps. |
| Anonymous answer privacy regression | High | Add dedicated tests and inspect rendered chairman views. |
| General member sees officer nav or data | High | Role-aware nav plus direct URL negative e2e tests. |

---

## Copy-Ready `/goal` Prompt For New Codex Chat

```text
/goal Complete a pre-Features 16-29 hardening and v2 alignment pass for /Users/Julian/workspace/personal/code/chapter-command-center. Do not implement Features 16-29 yet. The end state is a safer, cleaner, production-directed version of the existing Features #1-#15 MVP that is ready to build on.

Read first:
- .planning/PRE-16-HARDENING-V2-ALIGNMENT-PLAN.md
- .planning/FEATURE-BUILD-ORDER.md
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/MVP-PRODUCTION-READINESS-AUDIT.md
- .planning/GOAL-PROGRESS.md
- README.md
- CLAUDE.md
- UI Prototypes/v1-stitch-mockup/garnet_gold_ritual/DESIGN.md
- v2-stitch-mockups/garnet_gold_ritual/DESIGN.md
- all relevant screens/code under v2-stitch-mockups/
- Google AI Studio prototype at /Users/Julian/Downloads/chapter-command-center

Context:
- Current app is a working Next.js 16 App Router + Supabase CLI local MVP for features #1-#15.
- Stitch v2 mockups are the visual/layout implementation contract.
- Google AI Studio prototype is interaction-pattern reference only.
- Claude audit found the local MVP conditionally passes, but production is not ready because runtime app queries use service-role and bypass RLS; current_member_id() maps JWT sub incorrectly; auth_user_id is not populated.

Primary goals:
1. Harden auth/RLS/permissions before feature expansion.
2. Add missing tests for negative authorization and RLS behavior.
3. Implement existing #1-#15 UX against the Stitch v2 screens as the primary design contract, using the best Google AI Studio interaction patterns where they improve the workflow.
4. Preserve working local Supabase/dev-auth flow.
5. Leave the app ready for Features #16-#29.

Hard constraints:
- Do not require hosted Supabase, Vercel, real Google OAuth, or Gemini credentials for local completion.
- Keep local Supabase CLI/Docker path working with supabase start and supabase db reset.
- Keep dev auth fallback usable locally, disabled when ENABLE_DEV_AUTH=false.
- Do not port Google prototype fake auth, mock data, placeholder routes, remote placeholder images, or unused Gemini dependency.
- Recreate Stitch v2 screens as closely as practical, but document any divergence required for auth/RLS, data integrity, accessibility, responsive behavior, performance, or cleaner Next/Supabase implementation.
- Do not build Features #16-#29.
- Never use git add .; stage specific files only.
- Commit after each meaningful phase.

Phase sequence:
1. Baseline current repo, local Supabase, tests, build, and GOAL-PROGRESS.
2. Wire members.auth_user_id, rewrite current_member_id() around auth.uid(), and clarify service-role vs user/RLS client boundaries.
3. Expand unit, RLS SQL, and Playwright negative tests for admin access, chairman scoping, anonymous answers, append-only snapshots, dues/tier effects, and denied cases.
4. Add schema/seed gaps needed for v2 onboarding and existing workflow polish: logistics/socials, emergency contacts, event metadata, import review support if needed, audit-recommended indexes.
5. Centralize design tokens and rebuild role-aware app shell/navigation using Stitch v2 visual direction and Google prototype nav taxonomy.
6. Upgrade existing #1-#15 UX only:
   - multi-step onboarding
   - events list/detail command hub
   - QR check-in outcomes
   - manual check-in
   - CSV import review
   - member and officer excusals
   - dues tracking
   - chairman form intake
   - Secretary form hub/form builder
   - form responses with anonymity guarantees
   - tier calculation and ineligible list surfaces
   - member dashboard and officer dashboard
7. Run final clean validation from local setup:
   - npm install
   - supabase start
   - supabase db reset
   - seed loads
   - app starts locally
   - npm run typecheck
   - npm run lint
   - npm test
   - expanded RLS SQL checks
   - Playwright/browser workflows for general member, President, Secretary, Treasurer, SAA, and Chairman
   - npm run build
8. Update README, production deployment notes, .planning/GOAL-PROGRESS.md, and a follow-up audit note.

Done means:
- A fresh developer can run the local app through README.
- General members cannot reach officer/admin data by direct URL or nav.
- RLS strategy is no longer ambiguous and is verified locally.
- Service-role usage is narrow and app-authorized.
- auth_user_id is populated and RLS member resolution is compatible with hosted Supabase auth.
- Existing #1-#15 workflows remain functional and look aligned with v2 designs.
- Browser workflows create/update real Supabase rows.
- There are no placeholder pages for features #1-#15.
- The repo is committed in meaningful phase commits using specific files only.
```

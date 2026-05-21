# Roadmap: Chapter Command Center

## Overview

Seven phases deliver a complete chapter operations platform, starting with the foundational auth and member registry (Phase 1), moving through the core accountability loop that replaces the broken spreadsheet (Phase 2, MVP complete), then building out the governance and reporting infrastructure (Phases 3-4), academic compliance (Phase 5), communications automation (Phase 6), and compliance calendar (Phase 7). Phases 1-2 are the MVP. Phases 3-7 are planned future work.

## Milestones

- 🚧 **MVP** — Phases 1-2 (in progress)
- 📋 **v1.1 Governance Layer** — Phases 3-4 (planned)
- 📋 **v1.2 Academic + Comms** — Phases 5-6 (planned)
- 📋 **v1.3 Compliance Calendar** — Phase 7 (planned)

## Phases

- [ ] **Phase 1: Foundation** - Auth, member registry, position system, and access control
- [ ] **Phase 2: Core Accountability Loop** - Attendance, excusals, ineligible list, tier calculation, dues, form compliance
- [ ] **Phase 3: Meeting & Reporting Infrastructure** - Chairman reports, exec agenda builder, lock-in dashboard, pre-semester sync
- [ ] **Phase 4: Event Pipeline** - Event proposals, pre-event checklist, post-event summary gate, budget draws
- [ ] **Phase 5: Academic Compliance** - GPA intake, academic status tiers, study hours with geofencing
- [ ] **Phase 6: Secretary Comms Generator** - Mid-week update, post-chapter update, ineligible list post, post-exec update
- [ ] **Phase 7: Compliance Calendar** - International, university, and IFC deadline tracking with officer assignments

---

## Phase Details

### Phase 1: Foundation
**Goal**: Any authorized SU member can sign in, be found in the roster, and access only what their chapter position permits.
**Depends on**: Nothing (first phase). Note: SU ITS Entra ID app registration is a pre-development blocker (1-2 week turnaround). Build auth with mock provider until credentials arrive.
**Requirements**: 1.1 Authentication, 1.2 Member Registry, 1.3 Position System, 1.4 Access Control (RLS)
**Success Criteria** (what must be TRUE):
  1. A member with a valid `@syr.edu` account can sign in via SU SSO and is recognized by the system
  2. The Secretary can bulk-import the current PIKE_tracking.xlsx member list via CSV, review fuzzy-matched names, and commit a clean canonical roster with SUID as primary key
  3. The Secretary can assign any member to one or more chapter positions; removing a position immediately revokes that member's elevated access (no JWT lag)
  4. A general member can only see their own profile data; a Secretary sees all member data; a Scholarship Chairman sees academic data but not dues data
  5. The position system can have positions added or removed without any schema migration
**Plans**: TBD

### Phase 2: Core Accountability Loop
**Goal**: The Secretary can run the complete Monday 9pm Ineligible List workflow from attendance data to formatted Flare post in under 30 minutes, with tier assignments calculated automatically.
**Depends on**: Phase 1
**Requirements**: 2.1 Attendance Tracking, 2.2 Excusal System, 2.3 Ineligible List, 2.4 Engagement Tier Calculation, 2.5 Dues Tracking, 2.6 Form Compliance Tracking

**TDD requirement**: Tier calculation logic, attendance percentage computation, ineligible list generation rules, and form compliance enforcement must have tests written before implementation.

**Success Criteria** (what must be TRUE):
  1. An officer can create an event, display a time-windowed QR code, and watch members appear on a live dashboard as they scan in from their phones
  2. The Secretary can upload a Flare QR export CSV and resolve name-match confidence levels before committing attendance records
  3. A member can submit an excusal request; an officer can approve or deny it; the decision is immediately reflected in that member's Ineligible List status
  4. The tier calculator produces a Gold/Garnet/White assignment for every active member based on configurable thresholds, handles missing data by redistributing weights (never outputs a misleading result), and stores an append-only snapshot with full dimension breakdown
  5. The Secretary can generate the Monday Ineligible List with one action, review the draft, and copy formatted Flare post content ready to paste
  6. The Treasurer can log a dues payment for any member; unpaid dues status flows into tier calculation as a binary disqualifier
  7. A mandatory form can be created with a deadline; non-completion by that deadline adds the member to the Ineligible List automatically
**Plans**: TBD

### Phase 3: Meeting & Reporting Infrastructure
**Goal**: The weekly governance cycle — from chairman report submission through exec meeting to lock-in session — has a structured digital workflow that replaces verbal-only coordination.
**Depends on**: Phase 2
**Requirements**: 3.1 Chairman Reports, 3.2 Exec Meeting Agenda Builder, 3.3 Lock-In Session Dashboard, 3.4 Pre-Semester Synchronization
**Success Criteria** (what must be TRUE):
  1. A chairman can submit a 9-field report before Thursday; their supervising VP sees late or missing flags in real time
  2. The Secretary can generate a formatted exec meeting agenda automatically compiled from that week's chairman reports, grouped by cabinet
  3. The Lock-In Session view shows tier distribution, member tier changes since last lock-in, and SMART goal status per chairman
  4. The President can complete the Pre-Semester Synchronization checklist and certify it, which unlocks the first reporting cycle and initializes tier config for the semester
**Plans**: TBD

### Phase 4: Event Pipeline
**Goal**: Every event from proposal through post-event summary has a tracked, enforced lifecycle — no summary means no next event.
**Depends on**: Phase 3
**Requirements**: 4.1 Event Proposal and Approval, 4.2 Pre-Event Compliance Checklist, 4.3 Post-Event Summary Gate, 4.4 Budget Draw Workflow
**Success Criteria** (what must be TRUE):
  1. A chairman can submit an event proposal; H&S Officer and President can independently approve or veto; either veto blocks the event from proceeding
  2. The pre-event checklist is auto-generated from EOP requirements for the event tier; the event cannot be marked "cleared" until all required items are completed
  3. A chairman who has not submitted a post-event summary within 72 hours is blocked from submitting a new event proposal or budget draw request
  4. The Treasurer can process a budget draw request; draws above $5,000 require presidential co-approval before the Treasurer can disburse
**Plans**: TBD

### Phase 5: Academic Compliance
**Goal**: The Scholarship Chairman has a complete view of member academic standing with role-gated access, and members on academic support are assigned study hours they can check into via geofenced mobile check-in.
**Depends on**: Phase 4
**Requirements**: 5.1 GPA Data, 5.2 Academic Status Tiers, 5.3 Study Hours and Geofenced Check-In
**Success Criteria** (what must be TRUE):
  1. The Scholarship Chairman can deploy a self-report GPA form at semester start; when official data arrives, uploading it automatically supersedes self-reported values via a generated column
  2. Academic School Captains can view GPA data for members in their college only; they cannot see other colleges' data or dues/attendance data
  3. A member assigned to Academic Support can open a study hours check-in page on their phone, check in from an approved location, and check out; the session duration is logged and suspicious GPS accuracy values are flagged for Scholarship Chairman review
  4. A member's academic status tier (good standing / support / probation / membership review) is visible to appropriate officers and updates when GPA data changes
**Plans**: TBD

### Phase 6: Secretary Comms Generator
**Goal**: The Secretary can generate all four weekly Flare communications from live system data in under 5 minutes each, formatted and ready to copy-paste — no manual data assembly.
**Depends on**: Phase 5
**Requirements**: 6.1 Mid-Week Update Builder, 6.2 Post-Chapter Update Generator, 6.3 Monday Ineligible List Post, 6.4 Post-Exec Update
**Success Criteria** (what must be TRUE):
  1. The Wednesday mid-week update is generated from upcoming events, deadlines, and chairman submissions — formatted with correct headers, mandatory item markers, and scannable structure
  2. The Sunday post-chapter update is generated from meeting attendance and decisions, including the current ineligible list and Monday form deadlines
  3. The Monday ineligible list post is generated from finalized attendance and form compliance data, formatted exactly to Flare's Communications Protocol spec, ready at 9:00 PM
  4. The Thursday post-exec update is generated conditionally — only when exec meeting decisions are flagged as chapter-wide
**Plans**: TBD

### Phase 7: Compliance Calendar
**Goal**: Every international, university, and IFC deadline has a responsible officer assigned; officers receive automated reminders and can mark items complete without developer involvement.
**Depends on**: Phase 6
**Requirements**: 7.1 Compliance Calendar (full section)
**Success Criteria** (what must be TRUE):
  1. The President and Secretary can view all compliance deadlines for the semester in a single dashboard, with responsible officer assignments visible per deadline
  2. Officers receive in-app reminders at 14-day, 7-day, 3-day, and day-of intervals for deadlines assigned to them
  3. An officer can mark a compliance item complete; Secretary or President can override any completion status
  4. Pre-populated recurring deadlines (CuseActivities registration, roster submission, hazing compliance, lock-in sessions, pre-semester sync) appear automatically at semester initialization
**Plans**: TBD

---

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Core Accountability Loop | 0/TBD | Not started | - |
| 3. Meeting & Reporting Infrastructure | 0/TBD | Not started | - |
| 4. Event Pipeline | 0/TBD | Not started | - |
| 5. Academic Compliance | 0/TBD | Not started | - |
| 6. Secretary Comms Generator | 0/TBD | Not started | - |
| 7. Compliance Calendar | 0/TBD | Not started | - |

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| 1.1 Authentication (SU SSO) | Phase 1 | Pending |
| 1.2 Member Registry | Phase 1 | Pending |
| 1.3 Position System | Phase 1 | Pending |
| 1.4 Access Control (RLS) | Phase 1 | Pending |
| 2.1 Attendance Tracking | Phase 2 | Pending |
| 2.2 Excusal System | Phase 2 | Pending |
| 2.3 Ineligible List | Phase 2 | Pending |
| 2.4 Engagement Tier Calculation | Phase 2 | Pending |
| 2.5 Dues Tracking | Phase 2 | Pending |
| 2.6 Form Compliance Tracking | Phase 2 | Pending |
| 3.1 Chairman Reports | Phase 3 | Pending |
| 3.2 Exec Meeting Agenda Builder | Phase 3 | Pending |
| 3.3 Lock-In Session Dashboard | Phase 3 | Pending |
| 3.4 Pre-Semester Synchronization | Phase 3 | Pending |
| 4.1 Event Proposal and Approval | Phase 4 | Pending |
| 4.2 Pre-Event Compliance Checklist | Phase 4 | Pending |
| 4.3 Post-Event Summary Gate | Phase 4 | Pending |
| 4.4 Budget Draw Workflow | Phase 4 | Pending |
| 5.1 GPA Data | Phase 5 | Pending |
| 5.2 Academic Status Tiers | Phase 5 | Pending |
| 5.3 Study Hours + Geofencing | Phase 5 | Pending |
| 6.1 Mid-Week Update Builder | Phase 6 | Pending |
| 6.2 Post-Chapter Update Generator | Phase 6 | Pending |
| 6.3 Monday Ineligible List Post | Phase 6 | Pending |
| 6.4 Post-Exec Update | Phase 6 | Pending |
| 7.1 Compliance Calendar | Phase 7 | Pending |

**Coverage: 26/26 requirements mapped. No orphans.**

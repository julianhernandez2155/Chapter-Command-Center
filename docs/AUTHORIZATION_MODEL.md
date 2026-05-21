# Authorization Model

## Decision

Build Chapter Command Center around capabilities, not around the President role.

The President should remain a high-access verification persona, but workflows should not be designed only as the President and then manually restricted later. Each workflow should be built and tested against the real positions that own or participate in that workflow.

## Core Model

- **Member** is the base authenticated identity.
- **Position** is the chapter office or role assigned to a member.
- **Permission** is a specific capability, such as `events.create`, `dues.record_payment`, or `reports.review_all`.
- **Role/position permissions** are bundles of permissions attached to positions.
- **President** can have broad administrative access, but should not be the only design lens.

## Why

Chapter roles change over time. New chairmen or temporary committees may need narrow access, such as creating events without seeing dues or GPA records. A permissions model supports that without hardcoding every future position into the app.

## Build Approach

1. Build each workflow with the smallest real set of positions involved.
2. Give President broad oversight access for verification and escalation.
3. Keep route guards and navigation based on permissions/capabilities, not just position slugs.
4. Keep Supabase RLS as the final security boundary.
5. Add an admin permissions selector after the first live workflows prove the permission set.

## Near-Term Personas

Use these personas during Sprint 1 and Sprint 2:

- President
- Secretary
- Treasurer
- Generic Chairman
- Scholarship Chairman
- General Member

## Sprint Implication

Sprint 2 should wire roster and positions first, then introduce a simple permission registry in code. A full database-backed permission selector can wait until after the first end-to-end workflows are live.


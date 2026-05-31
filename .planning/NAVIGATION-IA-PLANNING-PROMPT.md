# Navigation IA Planning Prompt

```text
/goal Plan the best overall navigation and page organization for Chapter Command Center. Do not execute code changes yet.

Context:
Sprint 4 Attendance is implemented, but navigation has grown organically. The issue is not only the left sidebar. We need to evaluate the full navigation system across the app:
- Left sidebar
- Top app bar
- In-page links/buttons
- EventDetails entry points
- Member dashboards
- Officer dashboards/consoles
- Direct routes
- Mobile navigation behavior
- Empty/denied states
- Role-based visibility and RLS-backed access

Primary goal:
Create the best information architecture for:
1. Members: simple, clean, action-first navigation.
2. Officers: role-aware workspaces based on what each role actually needs to control, review, or only view.

Read first:
- AGENTS.md or project instructions if present
- DESIGN.md
- .planning/ACTIVE-SPRINT-PLAN.md
- .planning/ATTENDANCE-PRD.md
- .planning/SPRINT-4-ATTENDANCE-SLICE-TRACKER.md
- src/App.tsx
- src/components/SideNavBar.tsx
- src/components/TopAppBar.tsx
- src/lib/permissions.ts
- Relevant pages under src/pages/

Task:
Audit the current route, sidebar, topbar, dashboard, and in-page navigation structure. Produce a planning document only. Do not edit files.

Evaluate:
- Which workflows deserve top-level navigation.
- Which workflows should live inside dashboards, consoles, or detail pages.
- Which pages should be accessed only through contextual links, like EventDetails.
- Which current routes are user-facing destinations vs implementation/detail routes.
- Whether members and officers need different navigation modes or grouped workspaces.
- How officer navigation should map to actual RLS/RPC permission boundaries.
- Where duplicate paths or competing entry points exist.
- Where navigation is too noisy, too hidden, or inconsistent.
- How mobile users should reach high-frequency actions.
- How denied states should guide users without exposing private data.

Role scope:
Plan navigation for:
- Standard member
- President
- Secretary
- SAA
- Treasurer / Assistant Treasurer
- Community Service Chairman
- Philanthropy Chairman
- Social Chairman
- Recruitment Chairman
- Other chairmen using form/report workflows

Deliverable:
Create a concise plan with these sections:

1. Current Navigation Inventory
   - Routes
   - Sidebar items
   - Topbar behavior
   - Dashboard links
   - In-page navigation patterns
   - EventDetails/contextual entry points
   - Permission gates

2. Navigation Problems
   - Clutter
   - Duplicated entry points
   - Missing entry points
   - Role confusion
   - Mobile issues
   - Pages that should be nested or contextual

3. Member Navigation Recommendation
   - Primary member navigation
   - Secondary/contextual navigation
   - Member dashboard structure
   - What members should never see
   - High-frequency member actions

4. Officer Navigation Recommendation
   - Officer workspace structure
   - Role-by-role access matrix
   - Control vs review vs read-only boundaries
   - Which workflows belong in officer dashboards vs standalone pages

5. Proposed App Information Architecture
   - Recommended route tree
   - Recommended sidebar groups
   - Recommended dashboard/consoles
   - Contextual links from EventDetails and related pages
   - Mobile navigation behavior
   - Empty/denied state behavior

6. Implementation Plan
   - Smallest safe sequence of code changes
   - Files likely touched
   - No schema changes unless absolutely necessary
   - Backward-compatible route redirects if needed
   - How to avoid breaking existing workflows

7. Verification Plan
   - Persona checks
   - RLS/RPC denial checks
   - Browser navigation checks
   - Mobile no-overflow checks

Rules:
- Do not execute implementation.
- Do not redesign the visual system.
- Do not focus only on the sidebar.
- Keep existing pages where possible; reorganize access and entry points.
- Use the simplest viable IA, not a new navigation framework.
- Be direct about tradeoffs.
- End with a recommended implementation order and checkpoint commit suggestion.
```

# Design System: Chapter Command Center

## 1. Overview & Creative North Star: "The Modern Legacy"

This design system is built to transform a standard administrative tool into a prestigious, high-end editorial experience. Our Creative North Star is **"The Modern Legacy"**: a digital environment that feels as authoritative as a leather-bound ledger but as fluid as a modern flagship application.

We move beyond "Standard Material" by rejecting the cluttered "Dashboard" look. There are no boxes to check or grids to fill; instead, we treat data as a narrative. We break the template through **intentional asymmetry**, where large-scale typography acts as the primary anchor, and whitespace is treated as a premium asset rather than "empty" space. This system prioritizes a "Content-First" philosophy, where the fraternity's data is presented with the dignity of a high-end magazine.

---

## 2. Colors & Surface Architecture

The color palette is rooted in a deep, nocturnal foundation, punctuated by the high-status tones of Crimson and Gold.

### The "No-Line" Rule

**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined exclusively through background shifts.

- To separate a header from a body, use a transition from `surface` to `surface_container_low`.
- Use vertical white space (Spacing Scale `8` or `10`) to create a cognitive break between data sets.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers. We use Material 3 Tonal Tiers to create depth:

- **Base Layer:** `surface` (#131313) — The canvas.
- **Content Zones:** `surface_container_low` (#1C1B1B) — Large sections of information.
- **Interactive Elements:** `surface_container_high` (#2A2A2A) — Hover states or temporary focus areas.
- **Sunken Elements:** `surface_container_lowest` (#0E0E0E) — Used for "well" styles, such as search inputs or code snippets, to provide a sense of security and containment.

### Signature Accents

- **Primary Accent (`primary` / `primary_container`):** Deep Crimson. Use this strictly for "Final Action" buttons or active navigation states. It is a "loud" color meant for a "quiet" interface.
- **Secondary Accent (`secondary`):** Muted Gold. Reserved for status and achievement. It represents the "Legacy" aspect of the fraternity.

---

## 3. Typography: The Editorial Anchor

Typography is the primary structural element of this system. We use **Inter** with generous tracking and line height to ensure the interface feels "breathable."

- **Display (Large/Medium):** Use for Chapter Names or Hero Statistics. These should be "Confident," almost oversized, to anchor the page. For example, `display-lg` at 3.5rem.
- **Headlines:** Use for section titles. Forgo dividers; the size and weight of `headline-md` are sufficient to signal a new topic.
- **Body:** `body-lg` (1rem) is our standard. We favor `line-height: 1.6` to ensure readability in long lists of members or minutes.
- **Labels:** Use `label-md` in All Caps with `letter-spacing: 0.1rem` for secondary metadata to create a "technical" or "archival" feel.

---

## 4. Elevation & Depth: Tonal Layering

We do not use traditional drop shadows to indicate importance. Instead, we use **Tonal Layering**.

- **The Layering Principle:** Depth is achieved by "stacking." A card is not a box with a shadow; it is a `surface_container_low` shape sitting on a `surface` background.
- **Ambient Shadows:** Only for floating elements, like a Hover Rail or Modal. Use a highly diffused shadow: `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4)`. The shadow must feel like an atmospheric glow, not a hard edge.
- **The "Ghost Border" Fallback:** If a UI element, like an input, risks disappearing, use the `outline_variant` at **15% opacity**. This provides a "suggestion" of a boundary without cluttering the visual field.

---

## 5. Components

### Buttons

- **Primary:** `primary_container` background with `on_primary_container` text. Roundedness: `full`. No borders.
- **Secondary:** `surface_container_high` background. This should feel like it belongs to the surface.
- **Tertiary:** Text-only, using `primary` color. Reserved for "Cancel" or "Back" actions.

### Status Badges (Pills)

Badges are the only "high-color" elements allowed in the content flow.

- **Active/Good Standing:** Soft Gold (`secondary_container`).
- **Probation/Action Required:** Garnet (`primary_container`).
- **Neutral/Inactive:** White/Grey (`surface_bright`).
- **Ineligible:** Muted Red (`error_container`).
- **Styling:** Shape `full`, Typography `label-sm` Bold.

### Navigation

- **Desktop Left Rail:** Minimalist. Only icons in their "Resting" state. On hover, the rail expands using a `surface_container_high` background to reveal labels. This preserves whitespace during deep work.
- **Top App Bar:** Transparent background. Use `title-lg` for the Chapter Name. Ensure the Avatar is the only circular element to draw the eye for profile/settings.

### Input Fields

- **The "Sunken" Field:** Background: `surface_container_lowest`. No bottom line. No border. Use `md` (1.5rem) roundedness. This makes the field feel like a physical "slot" for data.

### Lists & Cards

- **The Anti-Card Rule:** Avoid heavy card containers. Group related information using vertical spacing (`spacing-8`).
- If grouping is required, use a subtle background shift to `surface_container_low`. Never use a divider line between list items; use padding (`spacing-4`) to create the distinction.

---

## 6. Do's and Don'ts

### Do:

- **Use "Aggressive" Whitespace:** If you think there is enough space between sections, double it.
- **Align to Typography:** Use the baseline of your text to align other elements, creating a clean "invisible" grid.
- **Prioritize Content:** Let the member's name or the chapter's status be the largest thing on the screen.

### Don't:

- **Don't use 1px Dividers:** They are "visual noise." Use color shifts or space.
- **Don't use Icon+Label Sidebars:** Keep it icon-only until the user asks for more (hover).
- **Don't use Card Grids:** They feel like "templates." Use a vertical, editorial flow that leads the eye from top to bottom.
- **Don't use High-Contrast Borders:** If a border is visible at first glance, it is too dark. Use `outline_variant` at low opacity.

---

## 7. Spacing & Rhythm

This system relies on a strict **8-point-ish** spacing scale to maintain a rhythmic, musical quality to the layout.

- **Section Padding:** `spacing-16` (5.5rem).
- **Component Internal Padding:** `spacing-3` (1rem).
- **Group Separation:** `spacing-6` (2rem).

By adhering to these rules, the Chapter Command Center will feel less like a "database" and more like a curated, high-status command hub for the modern fraternity leader.

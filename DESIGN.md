# Laras Pulse — design system

This app uses a dark **“Laras Pulse”** UI: navy base, electric cyan accents, glass surfaces, and **Space Grotesk** + **Manrope**. Tokens and utilities live in **`app/globals.css`**; semantic badge classes for pipelines are in **`lib/constants.ts`**.

---

## Foundations

### Color roles (`@theme` in `globals.css`)

| Role | Hex | Usage |
|------|-----|--------|
| Background | `#07122a` | Page base (`bg-background`) |
| On surface | `#d9e2ff` | Primary text (`text-on-surface`) |
| On surface variant | `#bac9cc` | Secondary text |
| Surface tint / cyan accent | `#00daf3` | Focus rings, highlights (`surface-tint`) |
| Primary | `#c3f5ff` | Accent text, icons |
| Primary container | `#00e5ff` | Strong cyan fills (buttons, gradients) |
| Outline / outline variant | `#849396` / `#3b494c` | Borders |

Surfaces step from **`surface-container-lowest`** → **`surface-container-highest`** for cards, panels, and elevated regions.

### Typography

- **Body**: Manrope (`font-sans`, `--font-manrope`).
- **Headings & display**: Space Grotesk (`h1`–`h3`, `.font-display`, `--font-space-grotesk`).
- **Labels**: `.laras-label-caps` — small uppercase with tracking.

Fonts are loaded in **`app/layout.tsx`**.

### Radii

Defined in `@theme`: `radius-sm` … `radius-xl` (mapped to Tailwind `rounded-*` scale).

### Shell

- Fixed **radial gradients** behind content (cyan / blue glow).
- **Sidebar** + main column (`ml-64`). New pages should keep content in **`laras-page`** for consistent max width and padding.

---

## CSS utilities (`@layer components`)

Prefer these over one-off white backgrounds or legacy indigo tokens.

| Class | Purpose |
|-------|---------|
| `.laras-glass` / `.laras-glass-strong` | Frosted panels with cyan edge |
| `.laras-card` | Card shell (glass gradient + blur + border) |
| `.laras-page` | Max width + responsive padding |
| `.laras-divider` | Subtle horizontal rules |
| `.laras-btn-primary` | Gradient cyan CTA |
| `.laras-btn-secondary` | Outlined / muted button |
| `.laras-input` | Standard text input |
| `.laras-field` / `.laras-field-lg` | Rounded-xl fields with cyan focus ring |
| `.laras-row-hover` | Table / list row hover |
| `.laras-link` | Inline link style |
| `.laras-icon-box` | Small icon container with primary ring |
| `.laras-scan-hover` | Optional sweep highlight on hover |
| `.laras-dropzone` | CV / file upload dashed zone |
| `.laras-month-display` | Month/date pill (dark glass, no flat white) |
| `.laras-chip-off` / `.laras-chip-on` | Toggle chips on dark UI |

### Form controls

`select`, `option`, `input`, and `textarea` use **`color-scheme: dark`** in base styles so native controls match the theme where the OS/browser allows.

---

## Tailwind usage

- Use semantic tokens: **`bg-background`**, **`text-on-surface`**, **`border-outline-variant`**, **`ring-surface-tint`**, **`bg-surface-container-*`**, **`text-primary`**, etc.
- Avoid **`bg-white`** on primary surfaces unless you have a deliberate light inset (even then prefer **`surface-container-*`** + borders).
- Primary actions: **`laras-btn-primary`** or gradient patterns consistent with `.laras-btn-primary`.

---

## Domain badges (`lib/constants.ts`)

Pipeline UI maps values to **`bg-* / text-* / ring-*`** Tailwind classes so badges stay readable on dark glass:

- **`APPLICATION_STATUSES`** — application lifecycle pills.
- **`PHASE_STATUSES`** — interview phase pills.
- **`SKILL_LEVELS`** — skill level chips.

When adding a new status, add **`bg`**, **`text`**, and optional **`ring`** classes that work on **`surface-container`** backgrounds (muted fills + light text + soft ring).

---

## Files to touch when evolving the theme

| File | Responsibility |
|------|----------------|
| `app/globals.css` | `@theme` tokens, `.laras-*` utilities, base heading/body rules |
| `app/layout.tsx` | Fonts, metadata title, global background gradients |
| `lib/constants.ts` | Status/source badge classes |

---

## Next.js in this repo

This project may use Next.js APIs that differ from older docs. Before changing routing, server components, or `next/*` imports, check **`node_modules/next/dist/docs/`** for the version you are on.

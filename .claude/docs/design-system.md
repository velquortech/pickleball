# UI & Design System

## UI rules — shadcn only

- **Never** install or use another component library, and never hand-roll a primitive (button, input, dialog, select, table, …) when a shadcn component exists.
- Add missing components with `npx shadcn@latest add <component>` — components land in `components/ui/` as owned source; extend them there (e.g. new `cva` variants) instead of wrapping with ad-hoc divs.
- This install uses **Base UI primitives** (not Radix): components take a `render` prop instead of `asChild`, `Select.onValueChange` passes `string | null`, `Accordion` uses `multiple={false}`, and `DropdownMenuLabel` must sit inside a `DropdownMenuGroup`. Link-buttons (`<Button render={<Link/>}>`) render as `<a role="button">`.
- Style with theme tokens (`bg-background`, `text-muted-foreground`, `border-border`, …), not ad-hoc hex values or raw palette classes for foundational surfaces.
- Use `AlertDialog` (not `Dialog`) for destructive confirmations. Use the `cn()` helper from `lib/utils.ts` for conditional classes.
- Fonts: `@theme inline` in `app/globals.css` must use **literal** font family names — `var(--font-*)` references break at Tailwind v4 parse time.

## Design system — "Vibrant Athleticism" (dark-first)

- Deep navy canvas (`#081425`), **neon lime** primary (`#caf300`), action orange
  for hot/occupied states, electric blue for informational/cleaning states.
  Court status colors are theme tokens: `bg-status-available`,
  `bg-status-occupied`, `bg-status-cleaning` (+ `stripes-cleaning` utility for
  maintenance surfaces, `glow-primary` for neon glows).
- Typography: **Montserrat** (`font-heading`, 700–900, headlines often uppercase
  + `tracking-tight`), **Inter** (`font-sans`, body), **JetBrains Mono**
  (`font-mono`) for labels/kickers, court numbers, timestamps, queue positions,
  and reference codes. Form labels are mono label-caps via `components/ui/label.tsx`.
- Cards are glassmorphic by default (`components/ui/card.tsx`: `bg-card/60` +
  `backdrop-blur-xl` + top-light stroke). Buttons are bold uppercase Montserrat;
  `default` = lime with glow, `outline` = 2px lime border (see `button.tsx`).
- Status ring pattern on court cards: pulsing lime dot = available, solid lime =
  filling up (a `forming` roster short a player — badge shows `3/4`), solid
  orange = occupied, blue = cleaning/maintenance.
- The site ships dark-only: `:root` IS the navy theme and `.dark` mirrors it.
- Smooth scrolling: `scroll-smooth` on `<html>` + `data-scroll-behavior="smooth"`
  (Next 16 keeps route transitions instant); reduced-motion falls back to auto.
- Placeholder imagery lives in `public/images/` (branded SVG illustrations) —
  its README maps files to sections for swapping in real photography.

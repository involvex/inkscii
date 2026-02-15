# CLAUDE.md — Rune Site

## Commands

- `npm run dev` — dev server with Turbopack
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm start` — start production server
- No test framework is configured

## Architecture

- Next.js 15 App Router site (single page) showcasing the `rune-ascii` npm package
- Part of a monorepo (`rune/`) — site references local `rune-ascii` package via `file:../packages/runeAscii`
- Root layout (`app/layout.tsx`) + single client-side page (`app/page.tsx`) with all components inline
- Animation JSON files served statically from `public/animations/`
- CDN override via `setRuneCdn("/animations")` to use local files instead of jsDelivr
- Styling: Tailwind CSS 4 + CSS variables in `globals.css` (dark monospace theme) + inline styles
- Key custom hook: `useFitFontSize` — responsive font sizing via ResizeObserver for ASCII art containers
- UI primitives from Radix UI, icons from lucide-react, animations from motion library

## Key Patterns

- All page components are defined inline in `app/page.tsx` (Navbar, DetailToggle, AnimationCard)
- Monospace font (Geist Mono) is critical — the entire site depends on it for ASCII rendering
- Three detail levels for animations: small (50 cols), medium (90 cols), large (160 cols)

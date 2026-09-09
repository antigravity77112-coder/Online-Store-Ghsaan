---
name: gisaah-frontend
description: >-
  GISAah perfume e-commerce frontend context and skill routing for the Vite +
  React storefront in Front-End/. Use when editing the web app, storefront UI,
  admin dashboard, Tailwind styles, SWR data fetching, or React components in
  this monorepo. Routes agent to the correct react-frontend-skills from
  .agents/skills/ and documents stack-specific constraints.
---

# GISAah Frontend — Agent Context

## Monorepo layout

| Path | Stack | Skills apply? |
|------|-------|---------------|
| `Front-End/` | Vite 6, React 18, React Router 7, SWR, Tailwind 3, Framer Motion | **Yes — primary target** |
| `Mobile/` | Expo / React Native | **No** — use mobile patterns, not this skill pack |
| `backend/` | Node, Prisma, Express | **No** |

## Installed skill pack

18 skills are installed under `.agents/skills/` (from `react-frontend-skills-main`).

Read the relevant `SKILL.md` before large changes. Use progressive disclosure: open only the `references/` or `rules/` files needed for the task.

## Stack mapping — what applies to GISAah

### Use these skills (high relevance)

| Skill | Use for |
|-------|---------|
| `react` | Components, hooks, effects, memoization, state (skip RSC/Server Actions sections) |
| `tailwind` | Utility classes, responsive layout, theming (v3 syntax — see caveats) |
| `ui-design` | Typography, spacing, accessibility, RTL-friendly UX |
| `web-design-guidelines` | Interface quality checks |
| `vercel-react-best-practices` | Performance, rerenders, bundle size, SWR dedup rule |
| `vercel-composition-patterns` | Component composition, compound components |
| `feature-arch` | `src/pages`, `src/components`, `src/context`, `src/hooks` organization |
| `zod` | Validation when adding schemas (admin forms, API payloads) |
| `react-hook-form` | Only if introducing RHF; current forms are mostly controlled state |
| `vitest` / `playwright` / `msw` / `tdd` | When adding or extending tests |

### Use with caution (version / framework mismatch)

| Skill | Caveat |
|-------|--------|
| `tailwind` | Pack targets Tailwind **v4**; GISAah uses **v3.4** (`tailwind.config`, `@apply`, `theme.extend`) |
| `react` | Pack targets React **19**; GISAah uses **React 18.3** — skip React Compiler, `use()`, Actions, RSC |
| `typescript` | Front-End is **JavaScript (JSX)** — apply type-safety ideas, not TS-only syntax |
| `tanstack-query` | GISAah uses **SWR** (`useProducts`, `api.js`) — apply caching concepts, not TanStack APIs |
| `shadcn` | GISAah uses custom components + Lucide, not shadcn/ui |
| `nuqs` | Next.js URL state — GISAah uses **React Router** `useSearchParams` / route params |
| `nextjs` | **Do not apply** — not a Next.js app |

## GISAah Front-End conventions

- **Arabic-first**, RTL (`dir="rtl"`), i18next (`src/locales/`)
- **Brand**: gold palette (`gold-*`, luxury tokens), Cairo on mobile only; web uses existing Tailwind theme
- **Data**: `src/services/api.js` + SWR hooks in `src/hooks/`; cookie auth with refresh retry
- **State**: React Context (`AuthContext`, `CartContext`, `FavoritesContext`, `SiteConfigContext`, `ThemeContext`)
- **Routing**: `react-router-dom` in `src/App.jsx` with lazy-loaded pages
- **Admin**: `src/pages/admin/*` — compact list UIs, match existing admin tab patterns
- **Do not** hardcode products, categories, scents, or brands — always API-driven
- **Do not** break Brand system when working on Scents (separate domain)

## Before editing Front-End

1. Read the file(s) you will change and one similar existing component.
2. Pick 1–2 skills from the table above matching the task.
3. Open that skill's `SKILL.md`, then only the specific reference file for the pattern.
4. Keep diffs minimal; match naming, spacing, and import style.

## Sync / update skills

From repo root:

```bash
npx skills add ./react-frontend-skills-main -a cursor -s "*" -y
```

## MCP (optional)

`.cursor/mcp.json` exposes `react-frontend-skills` for `search_skills` / `get_reference` without loading full skill trees into context.

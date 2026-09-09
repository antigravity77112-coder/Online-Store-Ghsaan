# GISAah — Agent Instructions

## Project overview

GISAAh is a premium fragrance e-commerce platform:

- **Front-End/** — Vite + React 18 storefront (web)
- **Mobile/** — Expo React Native app
- **backend/** — Node.js + Prisma API

## React Frontend Skills

This repo includes the [PyModel React Frontend Skills](https://github.com/PyModel/react-frontend-skills) pack.

| Location | Purpose |
|----------|---------|
| `react-frontend-skills-main/` | Upstream skill source (update & re-sync from here) |
| `.agents/skills/` | Installed skills (18 packs) — active for Cursor |
| `.cursor/skills/gisaah-frontend/` | **Start here** — GISAah stack mapping & constraints |

### Quick start for agents

1. Read `.cursor/skills/gisaah-frontend/SKILL.md` for stack-specific routing.
2. For Front-End work, open the relevant skill under `.agents/skills/<name>/SKILL.md`.
3. Do **not** apply Next.js, nuqs, or React 19-only patterns to this codebase unless upgrading the stack.

### Re-install skills after updating the pack

```bash
npx skills add ./react-frontend-skills-main -a cursor -s "*" -y
```

### Front-End stack (actual)

- React 18.3 + Vite 6 + React Router 7
- SWR for server state (not TanStack Query)
- Tailwind CSS 3.4 (not v4)
- JavaScript JSX (not TypeScript)
- Framer Motion, Lucide, i18next

### Mobile stack

Separate codebase under `Mobile/`. React frontend skills target the web app only unless explicitly adapted.

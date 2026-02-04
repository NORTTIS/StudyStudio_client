# Component Creation Guide

**applyTo:** "src/components/**/*"
**triggerContext:** "When creating new files, scaffolding components, or refactoring UI structures."

## Behavior Directive
ONLY apply the following rules when the user explicitly asks to generate, create, or significantly refactor a React component. For general logic questions, follow standard TypeScript best practices.

## Project Context
- **Framework:** Next.js 16 (App Router) + React 19, Strict TypeScript.
- **Styling:** TailwindCSS v4 (via `@tailwindcss/postcss`), no traditional `tailwind.config.js`.
- **State Management:** TanStack Query v5 (Server State), Zustand (minimal Client State).
- **Forms & Validation:** React Hook Form + Zod.
- **Environment Variables:** `@t3-oss/env-nextjs` with schema defined in `env.ts`.
- **Path Aliases:** `@/*` (as defined in `tsconfig.json`).
- **Linter:** ESLint Flat Config (`eslint.config.mjs`) using Antfu's config + Next + Tailwind (`no-console: warn`).
- **Package Manager:** pnpm (Always use `pnpm` commands).

## Component Creation Rules
- **Naming:** Files must be PascalCase with `.tsx` extension (e.g., `Button.tsx`, `InputField.tsx`).
- **Responsibility:** One file = One main component. Split if multiple responsibilities.
- **Locations:**
  - Reusable UI: `src/components/common/`.
  - Feature-based: `src/components/features/{feature}/` (use `index.tsx` for grouped files).
  - Global Layouts: `src/components/layout/`.
  - Context Providers: `src/components/providers/`.

## Server vs. Client Components
- **Default:** Always prefer Server Components (do not add `"use client"` by default).
- **Client Components:** Only use when interactivity, hooks (`useState`, `useEffect`), or browser APIs are required.
- **Optimization:** Do not convert an entire tree to Client if only static data is needed.

## Component Structure (Recommended)
- **Import Order:** React → External Libraries → API/Types → Internal Components → Utils/Constants → Local Types → Styles/Assets.
- **Props:** Clear `interface Props` definition; avoid `any`. Export types/interfaces if reused.
- **Logic:** Constants outside the component body; handlers/hooks close to usage; clean JSX.

## Data Typing & OpenAPI
- **Strict Typing:** All props must be typed; use JSDoc for complex logic descriptions.
- **OpenAPI Integration:** Prefer using generated types: `import type { components } from '@/api/types'`.
- **No Duplication:** Do not manually redefine types already existing in the OpenAPI schema.

## Styling (Tailwind v4)
- **Utilities Only:** Use utility classes; avoid inline `style` props.
- **Merge Logic:** Use `twMerge` for conditional classes: `twMerge(base, condition && extra)`.
- **Mobile-first:** Implement breakpoints accordingly (e.g., `px-[15px] md:px-[30px] lg:px-[60px]`).
- **Figma Color Palette:**
  - Primary: `#4C6AA8`, Text Main: `#261E33`, Text Secondary: `#6F6B99`, Error: `#E26060`, Border: `#8A8A8A`, Background: `#F8F8F8`.

## State & Data Fetching
- **Client-side:** Use TanStack Query (`useQuery`, `useMutation`) with clear `loading`/`error` states.
- **Server-side:** Direct `fetch` in Server Components for security and SSR benefits.
- **Forms:** Use `Controller` + Internal Input components with `zodResolver`.
- **Global State:** Minimal use of Context/Zustand (e.g., for Auth); avoid unnecessary global states.

## Accessibility (a11y)
- **Library:** Prefer **React Aria Components** for complex UI like dialogs, modals, and buttons.
- **Semantics:** Use HTML5 semantic tags (`header`, `main`, `footer`, `nav`).
- **ARIA:** Include proper attributes: `aria-label`, `aria-modal`, `role="dialog"`, etc.

## Checklist for AI Generation
1. [ ] File named PascalCase in the correct directory.
2. [ ] Fully typed Props (No `any`).
3. [ ] `"use client"` added only if absolutely necessary.
4. [ ] Used `twMerge` with the project color palette.
5. [ ] Handled `loading` and `error` states gracefully.
6. [ ] Semantic HTML + ARIA attributes included.
7. [ ] No `console.log` (use `warn`/`error` if debug info is critical).
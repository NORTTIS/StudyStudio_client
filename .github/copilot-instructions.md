# MyStudio - AI Coding Agent Instructions

## Architecture

This is a **Next.js 16 App Router** project using **React 19** with TypeScript, TailwindCSS v4, and modern state management.

### Tech Stack
- **Next.js 16** (App Router) - React framework
- **React 19** with TypeScript - UI library
- **TailwindCSS v4** - Styling (uses new `@tailwindcss/postcss` plugin)
- **pnpm** - Package manager (always use `pnpm` commands, never npm/yarn)
- **@t3-oss/env-nextjs** - Type-safe environment variables with Zod validation
- **TanStack Query v5** - Server state management
- **Zustand** - Client state management
- **React Hook Form + Zod** - Form handling and validation

### Key Files
- `env.ts` - Environment variable schema (server/client split with Zod validation)
- `eslint.config.mjs` - ESLint using @antfu/eslint-config with Next.js and Tailwind plugins
- `tsconfig.json` - Path alias `@/*` maps to project root

## Development Workflows

### Commands
```bash
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm lint       # Run ESLint (no fix flag configured)
```

### Environment Variables
All env vars are defined in `env.ts` using T3 Env pattern:
- **Server-only vars**: Add to `server` object in `env.ts`
- **Client vars**: MUST prefix with `NEXT_PUBLIC_` and add to `client` object
- **Always** declare in both schema AND `runtimeEnv` object
- Import with: `import { env } from '@/env'`

Example:
```typescript
// Adding new env var
server: {
  NEW_API_KEY: z.string().min(1),
},
runtimeEnv: {
  NEW_API_KEY: process.env.NEW_API_KEY,
}
```

## Code Conventions

### ESLint Configuration
Using **@antfu/eslint-config** (opinionated, no semicolons) with:
- React + TypeScript enabled
- Next.js rules (recommended + core-web-vitals)
- Tailwind plugin with `classnames-order: warn` (auto-sorts classes)
- `no-console: warn` - avoid console statements
- React prop-types disabled (using TypeScript)

### Styling with TailwindCSS v4
- Using **new TailwindCSS v4 syntax** via `@tailwindcss/postcss`
- Responsive-first: `sm:` prefix for mobile-up breakpoints
- Dark mode classes: `dark:` prefix (class-based strategy)
- Tailwind ESLint plugin enforces class order automatically

### TypeScript Patterns
- Path alias: Import from project root using `@/` (e.g., `@/app/components`)
- Strict mode enabled in tsconfig
- Use `type` for object shapes, `interface` for extensible contracts
- Next.js types: Import from `next` (e.g., `import type { Metadata } from "next"`)

### App Router Structure
- All routes in `app/` directory
- `layout.tsx` - Root layout with font loading (Geist Sans + Mono)
- Server Components by default (add `'use client'` only when needed)
- Metadata exports for SEO (see `app/layout.tsx`)

## State Management Strategy
- **Server state**: TanStack Query (for API data, caching)
- **Client state**: Zustand (for UI state, user preferences)
- **Forms**: React Hook Form + Zod resolvers

## Common Patterns

### Font Loading
Fonts are loaded in root layout using `next/font/google`:
```typescript
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
// Applied as CSS variables in <body> className
```

### Image Optimization
Use Next.js `Image` component with `priority` for LCP images:
```typescript
<Image src="/logo.svg" alt="Logo" width={100} height={20} priority />
```

## Critical Notes
- **Always use pnpm** for package management
- Environment variables require both schema definition AND runtime mapping in `env.ts`
- TailwindCSS v4 uses new PostCSS plugin (not traditional config file)
- ESLint uses flat config format (`.mjs`), not legacy `.eslintrc`

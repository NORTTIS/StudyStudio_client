# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyStudio is a **Next.js 16 App Router** project with **React 19** - a collaborative workspace/team management application with Studio (workspace) and Group management features, including analytics and task management.

## Tech Stack

- **Next.js 16** - App Router framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **TailwindCSS v4** - Styling with `@tailwindcss/postcss` plugin
- **pnpm** - Package manager (always use pnpm, never npm/yarn)
- **Zustand** - Client state management
- **TanStack Query** - Server state management
- **React Hook Form + Zod** - Form validation
- **Biome** - Linting and formatting
- **ECharts / Recharts** - Charts and analytics visualization

## Common Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build (includes API types generation)
pnpm build:skip-api   # Production build without API types
pnpm lint             # Run Biome linter
pnpm format           # Format code with Biome
```

## Project Structure

```
src/
├── app/[locale]/           # Next.js App Router pages
│   ├── (authenticated)/    # Protected routes (requires login)
│   │   ├── home/
│   │   ├── master/[studioId]/  # Studio detail page
│   │   ├── group/[groupId]/    # Group pages
│   │   └── settings/
│   └── (guest)/            # Public routes (login, register, landing)
├── api/                    # API clients and types
│   ├── api-client.ts       # Client-side API fetch with auth
│   ├── server-client.ts     # Server-side API fetch
│   ├── types.ts            # OpenAPI generated types
│   └── studios.ts          # Studio API functions
├── components/
│   ├── common/             # Shared UI components (Button, Input...)
│   ├── features/           # Feature-specific components
│   │   ├── studio/        # Studio-related components
│   │   └── group/         # Group-related components
│   ├── layout/            # Header, Footer, Sidebar
│   └── ui/                # shadcn/ui components
└── lib/utils.ts           # Utility functions (cn helper)
```
## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Desktop firt Responsive

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
## API Patterns

### Server Component (page.tsx)
```typescript
import { serverFetchApi } from "@/api/server-client";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import ClientComponent from "@/components/features/...";

export default async function Page() {
  const { data, status } = await serverFetchApi.GET("/endpoint");

  if (status === "error" || !data) {
    console.error("[Page] Failed to load data:", { status });
    return <ErrorDisplay message="Không thể tải dữ liệu" />;
  }

  return <ClientComponent data={data} />;
}
```

### Client Component
```typescript
"use client";

import { useState } from "react";

interface Props {
  data: DataType;
}

export default function Component({ data }: Props) {
  const [state, setState] = useState(data);

  return <div>{/* UI */}</div>;
}
```

### API Client Functions
API functions are defined in `src/api/*.ts` files. Example from `studios.ts`:
```typescript
export async function getStudioMembers(studioId: string, locale = "vi") {
  return apiFetch<StudioMemberResponse[]>(`/studio/${studioId}/members`, {
    method: "GET",
    locale
  });
}
```

### ⚠️ CRITICAL: Use OpenAPI Types from api/types.ts

When implementing API functions, **ALWAYS use the types from `src/api/types.ts`** instead of defining custom types. The types are generated from OpenAPI/Swagger and follow this pattern:

```typescript
import { apiFetch } from "./api-client";
import type { components } from "./types";

// ✅ CORRECT: Use OpenAPI types
export type AdminGroupListResponse = components["schemas"]["AdminGroupListResponse"];

// ❌ WRONG: Don't define custom types like:
export interface MyCustomType { ... }
```

**Why this matters:**
- Types in `api/types.ts` are auto-generated from the backend API (Swagger/OpenAPI)
- Using these types ensures frontend-backend type consistency
- The API types include all response schemas like `StudioAnalyticsResponse`, `GroupComparisonData`, etc.

**How to use:**
1. Import `components` from `@/api/types`
2. Access types via `components["schemas"]["SchemaName"]`
3. Export them as type aliases for reuse in your API module

Example from `admin-groups.ts`:
```typescript
import type { components } from "@/api/types";

export type AdminGroupListResponse = components["schemas"]["AdminGroupListResponse"];
export type AdminGroupDetailResponse = components["schemas"]["AdminGroupDetailResponse"];
```

## Analytics API (Use OpenAPI Types!)

The project has OpenAPI-generated types for analytics endpoints in `src/api/types.ts`:

> ⚠️ **IMPORTANT**: When implementing analytics API functions, use `components["schemas"]["..."]` types from `api/types.ts` instead of creating custom interfaces. See the "CRITICAL" section above for details.

- **Studio Analytics**: `/api/analytics/studio/{studioId}` - Returns `StudioAnalyticsResponse`
  - `activeUsers`: number
  - `completionRate`: number
  - `engagementScore`: number
  - `completionRateHistory`: StudioProgressData[]
  - `groupComparison`: GroupComparisonData[]
  - `groupHeatmapComparison`: GroupHeatmapComparisonData[]

- **Group Analytics**: `/api/analytics/studio/{studioId}/groups` - Returns group-level analytics

Studio analytics types:
```typescript
StudioProgressData: { date: string; completionRate: number; activeUsers: number }
GroupComparisonData: { groupId: string; groupName: string; activeMembers: number; completedTasks: number; totalTasks: number; completionRate: number }
GroupHeatmapComparisonData: { date: string; groups: GroupActivityItem[] }
```

## Key Conventions

### File Naming
- Use **PascalCase**: `Button.tsx`, `UserProfile.tsx`, `StudioDetailPage.tsx`

### Import Order
1. React (useState, useEffect)
2. External libraries (Zod, React Hook Form)
3. API & Types (@/api/*)
4. Internal components (@/components/*)
5. Utils & hooks (@/utils/*)

### Styling
- Use TailwindCSS utility classes
- Responsive: `px-4 md:px-6 lg:px-8`
- Conditional: `className={isActive ? "bg-blue-500" : "bg-gray-200"}`

### Error Handling
- Log errors with `console.error("[Page] Failed to load data:", { status })`
- Show `<ErrorDisplay message="..." />` on API failure
- Never use default/fallback data when API fails

## Studio Feature

The Studio (workspace) feature includes:
- **StudioDetailPage**: Main studio view at `/master/[studioId]`
- **Analytics Tab**: Shows charts (ActivityHeatmap, GroupProgressChart, GroupPerformanceRadar)
- Currently uses mock data in `types.ts` - should connect to `/api/analytics/studio/{studioId}` API
- Components in `src/components/features/studio/studio-detail/`

## Environment Variables

All env vars in `.env` - server vars defined in `env.ts` using T3 Env pattern with Zod validation.

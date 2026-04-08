# StudyStudio — Frontend

> Collaborative workspace platform for university students
> Built with **Next.js 16 + React 19** | Part of **SEP490 Graduation Thesis**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat-square&logo=tailwindcss)
![pnpm](https://img.shields.io/badge/pnpm-9-F69220?style=flat-square&logo=pnpm)
![i18n](https://img.shields.io/badge/i18n-vi%2Ben-10B981?style=flat-square)
![SignalR](https://img.shields.io/badge/SignalR-ready-512BD4?style=flat-square&logo=.net)
![MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 📖 Table of Contents

1. [About the Frontend](#about-the-frontend)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Features](#features)
7. [AI Integration](#ai-integration)
8. [Internationalization](#internationalization)
9. [State Management](#state-management)
10. [API Integration](#api-integration)
11. [Code Quality](#code-quality)
12. [Troubleshooting](#troubleshooting)
13. [Documentation](#documentation)
14. [License](#license)

---

## 🧠 About the Frontend

**StudyStudio Frontend** is a Next.js 16 application that provides the user interface for the StudyStudio collaborative workspace platform. It communicates with the ASP.NET Core 8.0 Backend API and supports real-time features via SignalR.

**Key capabilities:**
- 📱 Server-side rendering with Next.js App Router
- 🌐 Full Vietnamese and English localization
- 📊 Interactive analytics dashboards (ECharts + Recharts)
- 💬 Real-time group chat and @mention notifications
- 🤖 AI chat interface with SSE streaming
- 📋 Kanban boards with drag-and-drop
- 📅 Calendar view with FullCalendar

---

## 💻 Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 16.0.10 | SSR + App Router |
| UI Library | React | 19.2.1 | Component model |
| Language | TypeScript | 5.x | Type safety |
| Styling | TailwindCSS | v4 | Utility CSS with `@tailwindcss/postcss` |
| Package Manager | pnpm | 9.x | Dependency management |
| State (client) | Zustand | 5.0.9 | Local/global state |
| State (server) | TanStack Query | 5.90.12 | Server state + caching |
| Forms | React Hook Form | 7.68.0 | Form management |
| Validation | Zod | 4.2.1 | Schema validation |
| Charts | ECharts | 6.x | Studio analytics |
| Charts | Recharts | 3.7.x | General charts |
| Real-time | @microsoft/signalr | 10.0 | WebSocket client |
| Drag & Drop | @dnd-kit/core + sortable | latest | Kanban boards |
| Calendar | FullCalendar | 6.1.20 | Calendar view |
| Icons | Lucide React, React Icons | latest | UI icons |
| Auth | @react-oauth/google | 0.13.4 | Google OAuth |
| i18n | next-intl | 4.6.1 | Localization |
| Linting | Biome | 2.3.10 | Lint + format |
| Type Gen | openapi-typescript | — | Swagger → types |

---

## 🏗️ Architecture

### Next.js App Router Structure

```
mystudio/src/app/
├── [locale]/                      # i18n routing
│   ├── (authenticated)/           # Protected routes (requires JWT)
│   │   ├── home/                  # Dashboard
│   │   ├── master/[studioId]/     # Studio detail pages
│   │   │   ├── page.tsx           # Server component (fetches data)
│   │   │   └── ClientComponent.tsx # Client component (UI)
│   │   ├── group/[groupId]/       # Group pages
│   │   │   ├── board/             # Kanban board
│   │   │   ├── list/              # List view
│   │   │   ├── discuss/           # Real-time chat
│   │   │   ├── calendar/          # Calendar view
│   │   │   ├── documents/         # Document management
│   │   │   └── analytic/          # Analytics
│   │   └── settings/              # User settings
│   └── (guest)/                   # Public routes
│       ├── login/
│       ├── register/
│       └── landing/
```

### Data Flow Pattern

```
Server Component (page.tsx)
    ↓
serverFetchApi.GET("/endpoint")     # Server-side API call
    ↓
returns data to Client Component
    ↓
Client Component (use TanStack Query for client-side data)
    ↓
uiFetch for mutations
```

### Real-time (SignalR)

```typescript
// mystudio/src/lib/signalr.ts
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:8080/hubs/group-discuss", {
    accessTokenFactory: () => getAuthToken(),
  })
  .withAutomaticReconnect()
  .build();

await connection.start();
// Listen for messages
connection.on("ReceiveMessage", (message) => { ... });
// Send message
connection.invoke("SendMessage", groupId, content);
```

---

## 📁 Project Structure

```
mystudio/
├── README.md                     # ← This file
├── CLAUDE.md                    # Architecture guidance for Claude Code
├── package.json
├── next.config.ts
├── biome.json                   # Biome linter config
├── lefthook.yml                 # Git hooks
├── tsconfig.json
├── src/
│   ├── app/[locale]/           # Next.js App Router (i18n routing)
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx           # Landing page redirect
│   │   ├── (authenticated)/   # Protected routes
│   │   │   ├── layout.tsx     # Auth layout with sidebar
│   │   │   ├── home/
│   │   │   ├── master/
│   │   │   ├── group/
│   │   │   └── settings/
│   │   └── (guest)/           # Public routes
│   │       ├── login/
│   │       ├── register/
│   │       └── landing/
│   │
│   ├── api/                   # API layer
│   │   ├── api-client.ts      # Client-side fetch (apiFetch)
│   │   ├── server-client.ts   # Server-side fetch (serverFetchApi)
│   │   ├── types.ts          # Auto-generated from Swagger
│   │   └── *.ts              # API functions (studios.ts, etc.)
│   │
│   ├── components/
│   │   ├── common/           # Shared components
│   │   │   ├── ErrorDisplay.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── RolePill.tsx
│   │   ├── features/         # Feature-specific components
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── home/         # Dashboard components
│   │   │   ├── group/
│   │   │   │   ├── board/    # Kanban board
│   │   │   │   ├── discuss/  # Real-time chat
│   │   │   │   ├── task/     # Task forms & detail
│   │   │   │   ├── analytic/ # Group analytics
│   │   │   │   └── setting/  # Group settings
│   │   │   ├── master/       # Studio components
│   │   │   ├── admin/        # Admin dashboard
│   │   │   ├── payment/      # Payment components
│   │   │   └── landing/      # Landing page
│   │   ├── layout/           # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   └── ui/               # shadcn/ui components
│   │
│   ├── hooks/                # Custom React hooks
│   ├── store/                # Zustand stores
│   ├── lib/                  # Utilities
│   │   ├── signalr.ts       # SignalR connection
│   │   ├── utils.ts        # cn() helper, etc.
│   │   └── env.ts          # Environment validation (Zod)
│   │
│   └── i18n/                 # next-intl config
│       └── request.ts       # Server-side i18n config
│
└── messages/                 # Translation files
    ├── vi.json               # Vietnamese
    └── en.json               # English
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | 20+ | ✅ |
| pnpm | 9.x | ✅ |
| Backend API | Running | ✅ (http://localhost:8080) |

### Installation

```bash
# Clone and navigate
cd mystudio

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API URL
```

### Development

```bash
# Start development server
pnpm dev
# → http://localhost:3000

# Build for production
pnpm build
# → Builds with API types regeneration

# Build skipping API types (faster)
pnpm build:skip-api

# Lint code
pnpm lint

# Format code
pnpm format
```

### Docker Development

```bash
# Start backend stack first
cd ../StudyStudio_backend
docker compose up -d

# Then run frontend
cd ../mystudio
pnpm dev
```

### Environment Variables

```bash
# .env.example — copy to .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✨ Features

All features are implemented across frontend and backend. Below are the **frontend components** for each feature.

| Feature | Components |
|---------|-----------|
| **FE-01: User & Access** | `login/`, `register/`, `settings/`, `announcements/` |
| **FE-02: Group Collaboration** | `group/board/`, `group/discuss/`, `group/task/`, `group/setting/` |
| **FE-03: Studio Management** | `master/StudioModal/`, `master/studio-detail/`, `master/MemberList/` |
| **FE-04: Task Management** | `group/task/TaskForm.tsx`, `group/task/TaskDetailModal.tsx`, `group/calendar/` |
| **FE-05: Document Management** | `group/documents/GroupDocumentsPage.tsx` |
| **FE-06: AI Intelligence** | `home/AIHome.tsx`, `group/ai-qa/GroupAiQaPage.tsx`, `master/AIMaster.tsx` |
| **FE-07: Payments** | `payment/PaymentPage.tsx`, `payment/PaymentHistoryPage.tsx`, `landing/LandingPlan.tsx` |
| **FE-08: Admin Dashboard** | `admin/dashboard/`, `admin/users/`, `admin/groups/`, `admin/reports/` |
| **FE-09: Analytics** | `home/AnalysisHome.tsx`, `group/analytic/`, `master/analytic/` |

### Key UI Screenshots

> 📸 Add screenshots here: place `.png` or `.gif` files in the `public/screenshots/` folder

---

## 🤖 AI Integration

The frontend provides AI chat interfaces at three levels, communicating via **SSE (Server-Sent Events)** for streaming responses.

### Implementation Pattern

```typescript
// SSE streaming from backend AI endpoint
const response = await fetch(
  `${API_URL}/api/ai/{level}/ask/stream`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  }
);

const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = new TextDecoder().decode(value);
  // Parse SSE events: metadata, chunk, done
}
```

### AI Pages

| Level | File | Access |
|-------|------|--------|
| Personal AI | `src/components/features/home/AIHome.tsx` | Any logged-in user |
| Group AI | `src/components/features/group/ai-qa/GroupAiQaPage.tsx` | Group members |
| Master AI | `src/components/features/master/studio-detail/AIMaster.tsx` | Studio Owner only |

> 📖 Backend AI docs: [StudyStudio_backend/StudioStudio_Server/Docs/AI/](StudyStudio_backend/StudioStudio_Server/Docs/AI/)

---

## 🌐 Internationalization

### Supported Locales

| Locale | URL Prefix | Default |
|--------|-----------|---------|
| Vietnamese | `/vi/*` | ✅ Yes |
| English | `/en/*` | ✅ Yes |

### Translation Files

```text
mystudio/messages/
├── vi.json    # Vietnamese translations
└── en.json    # English translations
```

### Using Translations

```typescript
import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations("FeatureName");
  return <h1>{t("title")}</h1>;
}
```

### Backend i18n

Backend error messages are also localized in:
- `StudyStudio_backend/StudioStudio_Server/Resources/Errors/errors.vi.json`
- `StudyStudio_backend/StudioStudio_Server/Resources/Errors/errors.en.json`

The `apiFetch` client automatically sends the `Accept-Language` header based on the current locale.

---

## 📊 State Management

### Zustand (Client State)

```typescript
// mystudio/src/store/useAuthStore.ts
interface AuthStore {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  logout: () => void;
}
```

### TanStack Query (Server State)

```typescript
// Query for data
const { data, isLoading } = useQuery({
  queryKey: ["studios"],
  queryFn: () => getStudios(),
});

// Mutation for writes
const mutation = useMutation({
  mutationFn: (data) => createStudio(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["studios"] });
  },
});
```

---

## 📡 API Integration

### Client-Side Fetch (`apiFetch`)

All client-side API calls go through `src/api/api-client.ts`:

```typescript
import { apiFetch } from "@/api/api-client";

// GET request
const { data } = await apiFetch.GET("/studio");

// POST request
const { data } = await apiFetch.POST("/studio", { body: { name: "My Studio" } });
```

Features:
- Automatically injects JWT token from localStorage
- Sends `Accept-Language` header based on current locale
- Auto-refreshes token on 401 and retries the request

### Server-Side Fetch (`serverFetchApi`)

For server components, use `src/api/server-client.ts`:

```typescript
import { serverFetchApi } from "@/api/server-client";

const { data } = await serverFetchApi.GET("/studio", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Type Safety

API types in `src/api/types.ts` are **auto-generated from the backend Swagger** (`/swagger/v1/swagger.json`).

```bash
# Regenerate types after backend API changes
pnpm api:types
```

Always use types from `types.ts` — never define custom types for API responses:

```typescript
import type { components } from "@/api/types";

type Studio = components["schemas"]["StudioDetailResponse"];
```

---

## 🧪 Code Quality

### Biome (Linter + Formatter)

```bash
# Check for lint errors
pnpm lint

# Auto-fix formatting issues
pnpm format
```

### Import Order Convention

```typescript
// 1. React
import { useState, useEffect } from "react";

// 2. External libraries
import { z } from "zod";

// 3. API & Types
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";

// 4. Internal components
import Button from "@/components/ui/Button";

// 5. Utils & hooks
import { cn } from "@/lib/utils";
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `TaskForm.tsx` |
| Hooks | camelCase with `use` | `useTaskList.ts` |
| API functions | camelCase | `getStudios()` |
| Stores | camelCase with `Store` | `useAuthStore.ts` |
| Types | PascalCase | `StudioResponse` |

---

## 🔧 Troubleshooting

### "Cannot find module '@/api/types'"

Run the API type generator:
```bash
cd mystudio && pnpm api:types
```

### "JWT token expired"

The `apiFetch` client auto-refreshes tokens. If issues persist, check that the refresh endpoint (`/api/auth/refresh`) is working correctly on the backend.

### SignalR connection fails

Ensure the backend SignalR hub is running at `http://localhost:8080/hubs/group-discuss` and the client has a valid JWT token before connecting.

### Port already in use

```bash
# Find and kill the process using port 3000
npx kill-port 3000
# or
lsof -ti:3000 | xargs kill
```

---

## 📚 Documentation

| Document | Location |
|----------|----------|
| Project overview | [Root README.md](../README.md) |
| Frontend architecture | [CLAUDE.md](./CLAUDE.md) |
| Backend architecture | [StudyStudio_backend/.../CLAUDE.md](../StudyStudio_backend/StudioStudio_Server/CLAUDE.md) |
| AI system | [StudyStudio_backend/.../Docs/AI/](../StudyStudio_backend/StudioStudio_Server/Docs/AI/) |
| Feature specifications | [MAJOR_FEATURES.md](../MAJOR_FEATURES.md) |
| Installation guide | [StudyStudio_Installation_Guide.md](../StudyStudio_Installation_Guide.md) |

---

## 👥 Team — SEP490-G62

| Name | Role |
|------|------|
| Vũ Xuân Bắc | Technical Leader |
| Lê Tuấn Dũng | BA / Test Leader |
| Lê Đức Mạnh | PM / Developer |
| Dương Tiến Đạt | Design / Developer |
| Nguyễn Quang Minh | Developer |

**Supervisor:** Nguyễn Thị Hạnh

---

## 📄 License

**MIT License** — See [root README.md](../README.md) for full details.

---

## ⬆️

Back to top: [README](#studystudio--frontend)

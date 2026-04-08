# StudyStudio — Frontend

<p align="center">
    <img src="logo.png" alt="StudyStudio" width="420">
</p>

<p align="center">
    <strong>Không gian học tập dành cho sinh viên</strong>
</p>

<p align="center">
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/pnpm-9-F69220?style=for-the-badge&logo=pnpm" alt="pnpm"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/i18n-vi%2Ben-10B981?style=for-the-badge" alt="i18n"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/SignalR-Real--Time-512BD4?style=for-the-badge&logo=.net" alt="SignalR"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/Zustand-State-FF6B6B?style=for-the-badge" alt="Zustand"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/TanStack-Query-FF4154?style=for-the-badge" alt="TanStack Query"></a>
    <a href="https://github.com/your-username/StudyStudio"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License"></a>
</p>

---

## 📖 Table of Contents

1. [About the Frontend](#about-the-frontend)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Installation](#installation)
7. [Features](#features)
8. [AI Integration](#ai-integration)
9. [Internationalization](#internationalization)
10. [State Management](#state-management)
11. [API Integration](#api-integration)
12. [Code Quality](#code-quality)
13. [Troubleshooting](#troubleshooting)
14. [Documentation](#documentation)
15. [Team](#team)
16. [Changelog](#changelog)

---

## 🧠 About the Frontend

**StudyStudio Frontend** is a Next.js 16 application that provides the user interface for the StudyStudio collaborative workspace platform. Built with React 19 and TypeScript, it delivers a modern, responsive experience with real-time capabilities.

**Core capabilities:**
- 📱 Server-side rendering with Next.js App Router
- 🌐 Full Vietnamese and English localization (next-intl)
- 📊 Interactive analytics dashboards (ECharts + Recharts)
- 💬 Real-time group chat and @mention notifications (SignalR)
- 🤖 AI chat interface with SSE streaming
- 📋 Kanban boards with drag-and-drop (@dnd-kit)
- 📅 Calendar view with FullCalendar
- 💳 Payment integration with PayOS

---

## 💻 Tech Stack

<p align="center">

| | | |
|:---:|:---:|:---:|
| ![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js) | ![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react) | ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript) |
| ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss) | ![pnpm](https://img.shields.io/badge/pnpm-9-F69220?style=for-the-badge&logo=pnpm) | ![Zustand](https://img.shields.io/badge/Zustand-State-FF6B6B?style=for-the-badge) |
| ![TanStack Query](https://img.shields.io/badge/TanStack-Query-FF4154?style=for-the-badge) | ![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-7-EC5990?style=for-the-badge) | ![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1?style=for-the-badge) |
| ![SignalR](https://img.shields.io/badge/SignalR-Real--Time-512BD4?style=for-the-badge&logo=.net) | ![ECharts](https://img.shields.io/badge/ECharts-6-AA344D?style=for-the-badge) | ![Recharts](https://img.shields.io/badge/Recharts-3-FF6F61?style=for-the-badge) |
| ![FullCalendar](https://img.shields.io/badge/FullCalendar-6-3F51B5?style=for-the-badge) | ![dnd-kit](https://img.shields.io/badge/dnd--kit-Drag%20%26%20Drop-CC0000?style=for-the-badge) | ![next-intl](https://img.shields.io/badge/next--intl-4-10B981?style=for-the-badge) |

</p>

### Detailed Tech Stack

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
| Animations | framer-motion | 12.x | UI animations |
| UI Components | shadcn/ui + Radix | latest | Accessible components |

---

## 🏗️ Architecture

### Next.js App Router Structure

```
mystudio/src/app/
├── [locale]/                      # i18n routing (/vi/*, /en/*)
│   ├── (authenticated)/           # Protected routes (requires JWT)
│   │   ├── layout.tsx            # Auth layout with sidebar
│   │   ├── (user)/              # User routes
│   │   │   ├── home/            # Dashboard (AI, Analysis, Announcements)
│   │   │   ├── master/          # Studio management
│   │   │   │   └── [studioId]/  # Studio detail
│   │   │   ├── group/           # Group management
│   │   │   │   └── [groupId]/
│   │   │   │       ├── board/   # Kanban board
│   │   │   │       ├── discuss/ # Real-time chat
│   │   │   │       ├── list/    # List view
│   │   │   │       ├── calendar/# Calendar view
│   │   │   │       ├── documents/# Document management
│   │   │   │       ├── ai-qa/   # Group AI
│   │   │   │       ├── analytic/# Group analytics
│   │   │   │       ├── setting/ # Group settings
│   │   │   │       └── trashed/ # Trash bin
│   │   │   ├── settings/        # User settings
│   │   │   │   ├── security/
│   │   │   │   ├── billing/
│   │   │   │   └── help/
│   │   │   └── payment/        # Payment pages
│   │   │       ├── history/
│   │   │       ├── success/
│   │   │       └── cancel/
│   │   └── admin/              # Admin routes
│   │       ├── dashboard/
│   │       ├── users/
│   │       ├── groups/
│   │       ├── studios/
│   │       ├── subscriptions/
│   │       ├── revenue/
│   │       ├── reports/
│   │       ├── news/
│   │       └── templates/
│   │
│   └── (guest)/                 # Public routes (no auth required)
│       ├── layout.tsx          # Guest layout
│       ├── login/
│       ├── register/
│       ├── forgot-password/
│       ├── reset-password/
│       ├── verify-email/
│       ├── landing/            # Landing page
│       │   ├── personal/
│       │   ├── group/
│       │   ├── management/
│       │   └── plan/
│       └── studio-invite/      # Studio invite
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
apiFetch for mutations (auto-attaches JWT)
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
├── screenshot.mjs              # Screenshot utility
├── serve.mjs                   # Local server for screenshots
├── src/
│   ├── app/                   # Next.js App Router
│   │   └── [locale]/         # i18n routing
│   │       ├── (authenticated)/
│   │       ├── (guest)/
│   │       └── page.tsx      # Root redirect
│   │
│   ├── api/                   # API layer
│   │   ├── api-client.ts     # Client-side fetch (apiFetch)
│   │   ├── server-client.ts  # Server-side fetch (serverFetchApi)
│   │   ├── types.ts         # Auto-generated from Swagger
│   │   └── *.ts             # API functions (auth.ts, studios.ts, etc.)
│   │
│   ├── components/
│   │   ├── common/           # Shared components
│   │   │   ├── Alert.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Container.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorDisplay.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── LoadingPage.tsx
│   │   │   └── Logo.tsx
│   │   ├── features/         # Feature-specific components
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   ├── home/         # Dashboard components
│   │   │   ├── master/       # Studio components
│   │   │   ├── group/        # Group components
│   │   │   │   ├── board/
│   │   │   │   ├── discuss/
│   │   │   │   ├── calendar/
│   │   │   │   ├── documents/
│   │   │   │   ├── ai-qa/
│   │   │   │   ├── analytic/
│   │   │   │   ├── setting/
│   │   │   │   └── trashed/
│   │   │   ├── payment/
│   │   │   ├── admin/
│   │   │   └── landing/
│   │   ├── layout/           # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/               # shadcn/ui + Radix components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── avatar.tsx
│   │       ├── tabs.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── calendar.tsx
│   │       └── ...
│   │
│   ├── hooks/                # Custom React hooks
│   ├── store/                # Zustand stores
│   ├── utils/                # Utilities
│   │   ├── utils.ts         # cn() helper, etc.
│   │   ├── env.ts           # Environment validation (Zod)
│   │   └── payment-status.ts
│   ├── i18n/                 # next-intl config
│   │   └── request.ts       # Server-side i18n config
│   └── lib/                  # Libraries
│       └── utils.ts
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

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/StudyStudio.git
cd StudyStudio
```

### 2. Install dependencies

```bash
cd mystudio
pnpm install
```

### 3. Setup environment variables

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start development

```bash
pnpm dev
# → http://localhost:3000
```

### 5. Build for production

```bash
# Build with API types regeneration
pnpm build

# Build skipping API types (faster)
pnpm build:skip-api
```

### 6. Other commands

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Generate API types from Swagger
pnpm api:types
```

---

## ✨ Features

### User Features

| Feature | Route | Description |
|---------|-------|-------------|
| **Dashboard** | `/vi/home`, `/en/home` | Overview with AI, Analysis, Announcements tabs |
| **Studio Management** | `/vi/master`, `/en/master` | Create and manage workspaces |
| **Group Board** | `/vi/group/[id]/board` | Kanban board with drag-and-drop |
| **Group Discuss** | `/vi/group/[id]/discuss` | Real-time chat with @mentions |
| **Group Calendar** | `/vi/group/[id]/calendar` | Calendar view with FullCalendar |
| **Group Documents** | `/vi/group/[id]/documents` | Document management with B2 upload |
| **Group AI** | `/vi/group/[id]/ai-qa` | AI-powered Q&A for group |
| **Group Analytics** | `/vi/group/[id]/analytic` | Group-level analytics charts |
| **Payment** | `/vi/payment` | Subscription and billing |

### Admin Features

| Feature | Route | Description |
|---------|-------|-------------|
| **Admin Dashboard** | `/vi/admin/dashboard` | System overview |
| **User Management** | `/vi/admin/users` | User CRUD operations |
| **Group Management** | `/vi/admin/groups` | Group CRUD operations |
| **Studio Management** | `/vi/admin/studios` | Studio CRUD operations |
| **Subscriptions** | `/vi/admin/subscriptions` | Subscription plans management |
| **Revenue** | `/vi/admin/revenue` | Revenue analytics |
| **Reports** | `/vi/admin/reports` | System reports |
| **News** | `/vi/admin/news` | Announcement management |
| **Templates** | `/vi/admin/templates` | Group templates |

### Authentication

| Feature | Route | Description |
|---------|-------|-------------|
| **Login** | `/vi/login`, `/en/login` | Email + Google OAuth |
| **Register** | `/vi/register`, `/en/register` | Account creation |
| **Forgot Password** | `/vi/forgot-password` | Password reset request |
| **Reset Password** | `/vi/reset-password` | Password reset form |
| **Verify Email** | `/vi/verify-email` | Email verification |
| **User Settings** | `/vi/settings` | Profile, security, billing |

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

| Level | Route | Access |
|-------|-------|--------|
| Personal AI | `/vi/home/ai` | Any logged-in user |
| Group AI | `/vi/group/[id]/ai-qa` | Group members |
| Master AI | `/vi/master/[id]` | Studio Owner only |

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AIHome` | `components/features/home/` | Personal AI chat interface |
| `GroupAiQaPage` | `components/features/group/ai-qa/` | Group AI chat |
| `AIMaster` | `components/features/master/` | Master AI for studio |

> 📖 Backend AI docs: [StudyStudio_backend/StudioStudio_Server/Docs/AI/](../StudyStudio_backend/StudioStudio_Server/Docs/AI/)

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

| Name | Student ID | Role |
|------|-----------|------|
| Vũ Xuân Bắc | HE182325 | Technical Leader |
| Lê Tuấn Dũng | HE180884 | BA / Test Leader |
| Lê Đức Mạnh | HE180916 | PM / Developer |
| Dương Tiến Đạt | HE180717 | Design / Developer |
| Nguyễn Quang Minh | HE180190 | Developer |

**Supervisor:** Nguyễn Thị Hạnh

---

## 📋 Changelog

| Version | Date | Description |
|---------|------|-------------|
| **v1.0** | 2026-02-08 | Init Project + CI/CD + Exception Handling + i18n |
| **v1.1** | 2026-02-11 | Authentication — JWT, Google OAuth, email verification |
| **v1.2** | 2026-02-23 | Group Collaboration — CRUD, RBAC, member management |
| **v2.0** | 2026-03 | Task & Document — Kanban, calendar, B2 upload, Qdrant |
| **v2.1** | 2026-03 | Studio Management — batch assign, random assign |
| **v2.2** | 2026-03 | SignalR Real-time — chat, @mention |
| **v3.0** | 2026-03 | AI Integration — Gemini, ReAct Agent, 3-tier AI |
| **v3.1** | 2026-03-26 | Notifications — email, push, announcements |
| **v3.2** | 2026-03-31 | Analytics Dashboard — KPI, trends, heatmaps |
| **v4.0** | 2026-04-07 | Admin & Polish — archive, restore, Redis, CI/CD |

---

## 📄 License

**MIT License** — See [root README.md](../README.md) for full details.

---

## ⬆️

Back to top: [README](#studystudio--frontend)

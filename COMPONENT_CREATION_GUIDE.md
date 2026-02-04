# Component Creation Guide

This document defines essential rules and conventions for creating new React components in this Next.js 16 project.

## 📋 Table of Contents

1. [File Structure & Naming](#1-file-structure--naming)
2. [Component Structure](#2-component-structure)
3. [Type Definitions & Props Design](#3-type-definitions--props-design)
4. [Styling Conventions](#4-styling-conventions)
5. [State Management & Logic](#5-state-management--logic)
6. [Accessibility](#6-accessibility)
7. [Comments & Documentation](#7-comments--documentation)
8. [Import Order](#8-import-order)
9. [Component Boilerplate Templates](#9-component-boilerplate-templates)
10. [Checklist](#10-checklist)

---

## 1. File Structure & Naming

### 1.1 File Naming Conventions

- **File names**: PascalCase (e.g., `Button.tsx`, `InputField.tsx`, `CompanySelector.tsx`)
- **Extension**: `.tsx` (TypeScript file containing JavaScript and JSX)
- **Principle**: 1 file = 1 main component

### 1.2 Directory Structure & Placement

```
src/components/
├── common/                    # Reusable UI components
│   ├── Button.tsx
│   ├── InputField.tsx
│   └── Modal.tsx
├── features/                  # Feature-specific components
│   ├── authentication/
│   │   └── LoginForm.tsx
│   ├── profile/
│   │   ├── index.tsx          # Main component
│   │   ├── ProfileCard.tsx
│   │   └── ProfileImageUpload.tsx
├── layout/                    # Global layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
└── providers/                 # Context providers
    └── ThemeProvider.tsx
```

#### Placement Guidelines

| Component Type | Location | Examples |
|---|---|---|
| **Global Layout** | `/src/components/layout/` | Header, Footer, Navigation |
| **Reusable UI** | `/src/components/common/` | Button, InputField, Modal, Card |
| **Feature-specific** | `/src/components/features/{feature}/` | LoginForm, ProfileCard |
| **Multi-file Features** | `/src/components/features/{feature}/` + `index.tsx` | company-selector/index.tsx |
| **Context Providers** | `/src/components/providers/` | ThemeProvider, AuthProvider |

### 1.3 Naming Convention

```typescript
// ✅ Good examples
Button.tsx
InputField.tsx
CompanySelector.tsx
ProfileCard.tsx

// ❌ Avoid
button.tsx             // lowercase
buttonComponent.tsx    // camelCase
button.js              // .js extension (use .tsx)
BTN.tsx                // abbreviations
```

---

## 2. Component Structure

### 2.1 Basic Structure Template

```typescript
"use client"; // Add only for Client Components

// 1. External library imports
import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";

// 2. Internal module imports (using @ alias)
import { Button } from "@/components/common/Button";
import { InputField } from "@/components/common/InputField";

// 3. Type definitions
interface ComponentProps {
  title: string;
  onSubmit?: () => void;
}

// 4. Constants (outside component)
const DEFAULT_VALUE = "Initial value";

// 5. Component definition
export function ComponentName({ title, onSubmit }: ComponentProps) {
  // 6. Hooks (useState, useEffect, custom hooks)
  const [value, setValue] = useState("");
  
  // 7. Event handlers
  const handleClick = () => {
    // Logic here
  };

  // 8. JSX rendering
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### 2.2 Server vs Client Components

#### Server Component (default)
- No `"use client"` directive
- Best for data fetching
- Static content without user interaction

```typescript
// ✅ Server Component example
import { serverClient } from "@/api/server-client";

export async function DataDisplay() {
  const { data } = await serverClient.GET("/api/data");
  
  return <div>{/* Render data */}</div>;
}
```

#### Client Component (with `"use client"`)
- Required when using hooks (useState, useEffect)
- Needed for interactive elements (clicks, inputs)
- Necessary for browser APIs (localStorage, window)

```typescript
// ✅ Client Component example
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## 3. Type Definitions & Props Design

### 3.1 Props Type Definition

```typescript
// ✅ Recommended: inline type or type alias
interface ButtonProps {
  /**
   * Button label text
   */
  label: string;
  /**
   * Callback function on click
   */
  onClick?: () => void;
  /**
   * Disable button state
   */
  disabled?: boolean;
}

// ✅ Extending React Aria Components
import type { ButtonProps as AriaButtonProps } from "react-aria-components";

interface CustomButtonProps extends Omit<AriaButtonProps, "children" | "className"> {
  variant?: "solid" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}
```

### 3.2 OpenAPI Schema Types

```typescript
// ✅ Use auto-generated types from OpenAPI
import type { components } from "@/api/types";

interface DataListProps {
  items: components["schemas"]["ItemSchema"][];
}

// ❌ Don't manually duplicate types (causes sync issues)
interface DataListProps {
  items: { id: number; name: string }[];
}
```

### 3.3 Type Naming Conventions

```typescript
// ✅ Good examples
interface ButtonProps { ... }
type UserInfo = { ... }
type TaskItem = { ... }

// ❌ Avoid
interface IButton { ... }       // I prefix (not needed)
type buttonProps { ... }        // camelCase
type Props { ... }              // Too generic (use specific names)
```

---

## 4. Styling Conventions

### 4.1 Tailwind CSS Principles

```typescript
// ✅ Use utility classes
<button className="h-11 rounded-[30px] px-6 text-[14px] bg-[#4C6AA8] text-white">
  Click Me
</button>

// ✅ Conditional styling with twMerge
import { twMerge } from "tailwind-merge";

const buttonClass = twMerge(
  "h-11 rounded-[30px] px-6 text-[14px]",
  disabled && "cursor-not-allowed opacity-50",
  variant === "primary" && "bg-[#4C6AA8] text-white"
);

// ❌ Avoid inline styles
<button style={{ height: "44px", borderRadius: "30px" }}>Button</button>
```

### 4.2 Color Palette

```typescript
// ✅ Use design system colors from Figma
const colors = {
  primary: "#4C6AA8",      // Primary action
  textMain: "#261E33",     // Main text
  textSecondary: "#6F6B99", // Secondary text
  error: "#E26060",        // Error state
  border: "#8A8A8A",       // Borders
  background: "#F8F8F8"    // Backgrounds
};
```

### 4.3 Responsive Design (Mobile-first)

```typescript
// ✅ Mobile-first approach
<div className="px-[15px] md:px-[30px] lg:px-[60px]">
  {/* Mobile: 15px, Tablet: 30px, Desktop: 60px */}
</div>

// Breakpoint reference
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
```

### 4.4 Common Style Patterns

```typescript
// Card container
const cardStyle = "rounded-[24px] bg-white p-6 shadow-lg";

// Form group
const formStyle = "flex flex-col gap-[15px]";

// Page container
const pageStyle = "min-h-screen bg-[#F8F8F8]";

// Section spacing
const sectionStyle = "flex flex-col gap-[10px] px-[15px] py-[20px]";
```

---

## 5. State Management & Logic

### 5.1 Local State (useState)

```typescript
"use client";

import { useState } from "react";

export function Counter() {
  // ✅ Initialize with function for heavy computations
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem("count");
    return saved ? Number(saved) : 0;
  });

  // ✅ Group related state in single object
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    isValid: false
  });

  return <div>{count}</div>;
}
```

### 5.2 Form Management (React Hook Form + Zod)

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// 1. Define schema
const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be 8+ characters")
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  // 2. Initialize form
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" }
  });

  // 3. Submit handler
  const onSubmit = async (data: FormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <InputField
            {...field}
            type="email"
            label="Email"
            error={errors.email?.message}
          />
        )}
      />
    </form>
  );
}
```

### 5.3 Server State (API Integration)

#### Client Component Data Fetching

```typescript
"use client";

import { useQuery, useMutation } from "@tanstack/react-query";

export function DataList() {
  // ✅ Fetch with TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["items"],
    queryFn: () => fetch("/api/items").then(r => r.json())
  });

  // ✅ Mutations for POST/PUT/DELETE
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (newItem) => 
      fetch("/api/items", { method: "POST", body: JSON.stringify(newItem) })
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render data */}</div>;
}
```

#### Server Component Data Fetching

```typescript
// No "use client" - Server Component

export async function DataList() {
  // ✅ Direct server-side API calls
  const response = await fetch("http://localhost:3000/api/items");
  const data = await response.json();

  if (!response.ok) {
    return <div>Error loading data</div>;
  }

  return <div>{/* Render data */}</div>;
}
```

### 5.4 Global State (Context/Zustand)

```typescript
// ✅ Use Context for minimal global state (e.g., auth)
import { useContext } from "react";
import { AuthContext } from "@/components/providers/AuthProvider";

export function UserProfile() {
  const { user } = useContext(AuthContext);
  
  return <div>{user?.name}</div>;
}
```

---

## 6. Accessibility

### 6.1 React Aria Components

```typescript
"use client";

import { Button, Dialog, Modal, ModalOverlay } from "react-aria-components";

// ✅ Use React Aria for accessible components
export function AccessibleModal() {
  return (
    <ModalOverlay>
      <Modal>
        <Dialog role="dialog" aria-labelledby="title">
          <h2 id="title">Modal Title</h2>
          <Button>Close</Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
```

### 6.2 Semantic HTML

```typescript
// ✅ Use semantic elements
<header className="...">
  <h1 className="...">Page Title</h1>
  <nav>...</nav>
</header>
<main>
  {/* Main content */}
</main>
<footer>...</footer>

// ❌ Avoid excessive divs
<div className="header">
  <div className="title">Page Title</div>
  <div className="nav">...</div>
</div>
```

### 6.3 ARIA Attributes

```typescript
// ✅ Add appropriate ARIA attributes
<button
  aria-label="Toggle password visibility"
  aria-pressed={showPassword}
  onClick={() => setShowPassword(!showPassword)}
>
  <EyeIcon />
</button>

// ✅ Use role and aria-modal
<div role="dialog" aria-modal="true" aria-labelledby={titleId}>
  <h2 id={titleId}>Dialog Title</h2>
</div>
```

---

## 7. Comments & Documentation

### 7.1 JSDoc for Props

```typescript
interface ButtonProps {
  /**
   * Label text to display on the button
   */
  label: string;
  /**
   * Visual variant of the button
   * @default "solid"
   */
  variant?: "solid" | "outline" | "ghost";
  /**
   * Callback function on button click
   */
  onClick?: () => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}
```

### 7.2 Component Documentation

```typescript
/**
 * A reusable button component following the design system
 * 
 * Built with React Aria Components for accessibility support.
 * All styling uses Tailwind CSS utility classes.
 * 
 * @example
 * ```tsx
 * <Button 
 *   variant="solid" 
 *   onClick={handleClick}
 * >
 *   Click me
 * </Button>
 * ```
 */
export function Button({ variant = "solid", ...props }: ButtonProps) {
  // ...
}
```

### 7.3 Inline Comments

```typescript
export function DataSelector({ items }: Props) {
  // ✅ Explain the "why" behind complex logic
  // Auto-select on first render only to prevent re-selection
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (hasAutoSelected.current) return;

    // Use first item if none is explicitly selected
    const selected = items.find((item) => item.selected === 1)?.id;
    
    if (!selected && items[0]) {
      // ...
    }
  }, []);
}
```

### 7.4 Comment Best Practices

```typescript
// ✅ Good: Explain why, not what code does
// Password field needs extra right padding for the visibility toggle icon
const inputClass = isPassword ? "px-[10px] pr-[40px]" : "px-[10px]";

// ❌ Bad: Restates obvious code
// Set input class
const inputClass = "px-[10px]";

// ❌ Bad: Commented-out code (delete instead)
// const oldImplementation = () => { ... };
```

---

## 8. Import Order

### 8.1 Standard Import Ordering

```typescript
"use client";

// 1. React internals
import { useState, useEffect, type ReactNode } from "react";

// 2. External libraries
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button, Form } from "react-aria-components";
import { z } from "zod";
import { twMerge } from "tailwind-merge";

// 3. API clients and types
import type { components } from "@/api/types";
import { useQuery } from "@tanstack/react-query";

// 4. Internal components
import { Button as UIButton } from "@/components/common/Button";
import { InputField } from "@/components/common/InputField";
import { Header } from "@/components/layout/Header";

// 5. Utilities, hooks, constants
import { useFileUpload } from "@/hooks/useFileUpload";
import { formatDate } from "@/utils/formatDate";
import { MENU_ITEMS } from "@/constants/navigation";

// 6. Local type definitions
import type { DataListProps } from "./types";

// 7. Styles and assets
import styles from "./styles.module.css";
import Logo from "./logo.svg";
```

### 8.2 Type-only Imports

```typescript
// ✅ Use type keyword for types
import type { ReactNode } from "react";
import type { components } from "@/api/types";

// ✅ Mix runtime and type imports
import { useState, type Dispatch, type SetStateAction } from "react";

// ❌ Don't forget type keyword
import { ReactNode } from "react"; // Not needed at runtime
```

---

## 9. Component Boilerplate Templates

Use these templates as starting points for creating new components.

### 9.1 Simple UI Component (Stateless)

```typescript
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface CardProps {
  /**
   * Card title
   */
  title: string;
  /**
   * Card content
   */
  children: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Card component for displaying grouped content
 * 
 * @example
 * ```tsx
 * <Card title="User Info">
 *   <p>John Doe</p>
 * </Card>
 * ```
 */
export function Card({ title, children, className }: CardProps) {
  return (
    <div className={twMerge("rounded-[24px] bg-white p-6 shadow-lg", className)}>
      <h2 className="text-[18px] font-bold text-[#261E33]">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
```

### 9.2 Form Component with Validation

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { InputField } from "@/components/common/InputField";

// Define validation schema
const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address")
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  /** Initial form values (for edit mode) */
  initialValues?: Partial<UserFormData>;
  /** Callback on successful submission */
  onSubmit?: (data: UserFormData) => Promise<void>;
}

/**
 * User information form component
 */
export function UserForm({ initialValues, onSubmit }: UserFormProps) {
  const { control, handleSubmit, formState: { isSubmitting, errors } } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialValues || { name: "", email: "" }
  });

  const onFormSubmit = async (data: UserFormData) => {
    try {
      await onSubmit?.(data);
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-[15px]">
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <InputField
            {...field}
            label="Full Name"
            required
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <InputField
            {...field}
            type="email"
            label="Email Address"
            required
            error={errors.email?.message}
          />
        )}
      />

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="mt-4"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
```

### 9.3 Data Fetching Component

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import type { components } from "@/api/types";

type DataItem = components["schemas"]["DataItem"];

interface DataListProps {
  /** Optional filter status */
  status?: "active" | "inactive";
}

/**
 * Data list component with loading and error states
 */
export function DataList({ status }: DataListProps) {
  const { data, isLoading, error } = useQuery<DataItem[]>({
    queryKey: ["data-items", status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const response = await fetch(`/api/items${params}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      return response.json();
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-[#E26060]">Error loading data</div>;
  }

  const items = data || [];

  if (items.length === 0) {
    return <div className="text-center py-8 text-[#6F6B99]">No items found</div>;
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {items.map((item) => (
        <DataItem key={item.id} data={item} />
      ))}
    </div>
  );
}

// Child component (can be in same file)
function DataItem({ data }: { data: DataItem }) {
  return (
    <div className="rounded-[12px] bg-white p-4">
      <h3 className="font-bold text-[16px]">{data.name}</h3>
      <p className="mt-2 text-[14px] text-[#6F6B99]">{data.description}</p>
    </div>
  );
}
```

### 9.4 Interactive Component with Local State

```typescript
"use client";

import { useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface TabsProps {
  /** List of tabs with labels and content */
  tabs: Array<{ label: string; content: ReactNode }>;
  /** Initial active tab index */
  defaultIndex?: number;
  /** Callback when tab changes */
  onChange?: (index: number) => void;
}

/**
 * Tab navigation component
 */
export function Tabs({ tabs, defaultIndex = 0, onChange }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    onChange?.(index);
  };

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-[10px] border-b border-[#E0E0E0]">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabClick(index)}
            className={twMerge(
              "px-4 py-2 text-[14px] font-medium transition-colors",
              activeIndex === index
                ? "border-b-2 border-[#4C6AA8] text-[#4C6AA8]"
                : "text-[#6F6B99] hover:text-[#261E33]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tabs[activeIndex]?.content}
      </div>
    </div>
  );
}
```

---

## 10. Checklist

Before submitting a new component, ensure:

### File & Structure
- [ ] File name is PascalCase (e.g., `Button.tsx`)
- [ ] Placed in appropriate directory (`/common` vs `/features`)
- [ ] Follows 1 file = 1 component principle
- [ ] Single responsibility (not doing too many things)

### TypeScript & Types
- [ ] Props are properly typed (no `any` types)
- [ ] Added `"use client"` directive if component uses hooks/interactivity
- [ ] Imported types from correct locations
- [ ] Types are exported if reusable elsewhere

### Styling
- [ ] Uses Tailwind CSS utility classes (no inline styles)
- [ ] Colors match design system from Figma
- [ ] Responsive design considered (mobile-first)
- [ ] Uses `twMerge` for conditional classes

### Code Quality
- [ ] Props documented with JSDoc comments
- [ ] Complex logic has explanatory comments
- [ ] Follows import order convention
- [ ] No console.log statements (only warnings/errors)
- [ ] `pnpm lint` passes without errors

### State Management
- [ ] Uses React Hook Form + Zod for forms
- [ ] Uses TanStack Query for API calls
- [ ] No unnecessary global state
- [ ] Event handlers are memoized if needed (useCallback)

### Accessibility
- [ ] Uses semantic HTML elements
- [ ] Includes ARIA attributes where needed
- [ ] Keyboard navigation supported
- [ ] Images have alt text

### Testing Ready
- [ ] Component is testable (not tightly coupled)
- [ ] Clear props and expected behavior
- [ ] No external dependencies that can't be mocked
- [ ] Error states handled gracefully

---

## Quick Reference

### Key Imports by Use Case

**Data Fetching**
```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
```

**Forms**
```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```

**Styling**
```typescript
import { twMerge } from "tailwind-merge";
```

**Accessibility**
```typescript
import { Button, Dialog, Modal } from "react-aria-components";
```

### Color Reference
```
Primary:     #4C6AA8
Text Main:   #261E33
Text Secondary: #6F6B99
Error:       #E26060
Border:      #8A8A8A
Background:  #F8F8F8
```

### Common Utilities
```typescript
// Merge Tailwind classes conditionally
const buttonClass = twMerge(
  "px-4 py-2",
  disabled && "opacity-50 cursor-not-allowed"
);
```

---

## FAQ

**Q: When should I split a component into multiple files?**
- If it exceeds 200 lines
- When it has multiple distinct responsibilities
- When parts are reused elsewhere

**Q: Server or Client Component?**
- Use Client Component if: interactive, uses hooks, accesses browser APIs
- Use Server Component for: static content, data fetching, sensitive operations

**Q: How much should I abstract styles?**
- Extract if used 3+ times, otherwise keep inline
- Avoid over-abstraction that reduces readability

**Q: Do I need to wrap everything with `"use client"`?**
- No, only if the component uses hooks or browser APIs
- Default to Server Components for better performance

---

**Last Updated**: December 18, 2024  
**Version**: 2.0.0 (English Boilerplate Edition)

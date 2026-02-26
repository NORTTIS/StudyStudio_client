# Code Pattern - MyStudio Project

Hướng dẫn ngắn gọn về cách code trong dự án này.

---

## 📁 Cấu trúc thư mục

```
src/
├── app/[locale]/                    # Pages (Server Components)
│   ├── (authenticated)/             # Trang yêu cầu đăng nhập
│   │   ├── home/page.tsx
│   │   └── settings/page.tsx
│   └── (guest)/                     # Trang không cần đăng nhập
│       └── landing/page.tsx
│
├── components/
│   ├── common/                      # Component dùng chung (Button, Input...)
│   ├── features/                    # Component theo feature (Home, Settings...)
│   ├── layout/                      # Layout chung (Header, Footer...)
│   └── ui/                          # shadcn/ui components
│
└── api/
    ├── server-client.ts             # API cho Server Components
    └── api-client.ts                # API cho Client Components
```

---

## 🎯 Pattern 1: Server Component (Trang trong app/)

**Chức năng:** Call API → Truyền data vào component

```tsx
// ✅ app/[locale]/(authenticated)/home/page.tsx
import { serverFetchApi } from "@/api/server-client";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import HomePage from "@/components/features/home/Home";

export default async function Home() {
  // 1. Call API lấy data
  const { data, status } = await serverFetchApi.GET("/home/dashboard");
  
  // 2. Handle error nếu API fail
  if (status === "error" || !data) {
    console.error("[Home Page] Failed to load home data:", { status });
    return <ErrorDisplay message="Không thể tải dữ liệu trang chủ" />;
  }
  
  // 3. Truyền vào component
  return <HomePage data={data} />;
}
```

**Quy tắc:**
- ❌ KHÔNG có `"use client"`
- ❌ KHÔNG dùng useState, useEffect
- ❌ KHÔNG viết UI logic
- ❌ KHÔNG dùng default data khi API fail
- ✅ CHỈ call API và truyền props
- ✅ Log lỗi ra console và hiển thị ErrorDisplay khi API fail

---

## 🎨 Pattern 2: Client Component (Component trong components/features/)

**Chức năng:** Nhận data từ props → Xử lý UI và interaction

```tsx
// ✅ components/features/home/Home.tsx
"use client";

import { useState } from "react";

interface HomePageProps {
  data: HomeData;
}

export default function HomePage({ data }: HomePageProps) {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <div>
      <h1>{data.title}</h1>
      {/* UI logic here */}
    </div>
  );
}
```

**Quy tắc:**
- ✅ BẮT BUỘC có `"use client"` ở đầu file
- ✅ Nhận data qua props
- ✅ Xử lý state, events, hooks
- ❌ KHÔNG call API fetch data (chỉ mutations như POST/PUT/DELETE)

---

## 🔧 API Client

### Server-side (trong page.tsx)

```tsx
import { serverFetchApi } from "@/api/server-client";

// GET
const { data } = await serverFetchApi.GET<User>("/user/profile");

// POST
const { data } = await serverFetchApi.POST("/auth/login", { email, password });

// PUT
const { data } = await serverFetchApi.PUT("/user/update", userData);

// DELETE
await serverFetchApi.DELETE("/user/123");
```

### Client-side (trong component mutations)

```tsx
"use client";

export default function SettingsClient({ initialData }) {
  const handleSubmit = async (formData) => {
    // Mutation sau khi user action
    const response = await fetch("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(formData)
    });
  };
}
```

---

## 📝 Đặt tên file

```
✅ ĐÚNG:
Button.tsx              # PascalCase
UserProfile.tsx
CompanySelector.tsx

❌ SAI:
button.tsx              # lowercase
userProfile.tsx         # camelCase
user-profile.tsx        # kebab-case
```

---

## 🎨 Style với TailwindCSS

```tsx
// ✅ Dùng utility classes
<button className="h-11 rounded-lg bg-[#FF5F3D] px-6 text-white">
  Click Me
</button>

// ✅ Conditional styling
<div className={`rounded-lg ${isActive ? "bg-blue-500" : "bg-gray-200"}`}>

// ❌ Tránh inline style
<button style={{ height: "44px" }}>Button</button>
```

**Breakpoints:**
```tsx
<div className="px-4 md:px-6 lg:px-8">
  {/* Mobile: 16px, Tablet: 24px, Desktop: 32px */}
</div>
```

---

## 📦 Import order

```tsx
"use client";

// 1. React
import { useState, useEffect } from "react";

// 2. External libraries
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 3. API & Types
import type { components } from "@/api/types";
import { serverFetchApi } from "@/api/server-client";

// 4. Internal components
import { Button } from "@/components/common/Button";
import { Header } from "@/components/layout/Header";

// 5. Utils & hooks
import { formatDate } from "@/utils/formatDate";
```

---

## 🔍 Form validation với React Hook Form + Zod

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// 1. Định nghĩa schema
const formSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự")
});

type FormData = z.infer<typeof formSchema>;

// 2. Component
export default function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data: FormData) => {
    // Handle submit
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

---

## 📋 Checklist tạo component mới

### Page Component (app/)
- [ ] KHÔNG có `"use client"` 
- [ ] Dùng `serverFetchApi` để call API
- [ ] Truyền data qua props cho Client Component
- [ ] Handle error khi API fail (console.error + ErrorDisplay)
- [ ] KHÔNG có useState/useEffect

### Feature Component (components/features/)
- [ ] CÓ `"use client"` ở đầu file
- [ ] Nhận data qua props interface
- [ ] Export default function với PascalCase
- [ ] JSDoc cho props nếu phức tạp
- [ ] TypeScript types rõ ràng

---

## 🚀 Quick Examples

### 1. Trang đơn giản (không cần data)

```tsx
// app/about/page.tsx
import About from "@/components/features/about/About";

export default function AboutPage() {
  return <About />;
}
```

### 2. Trang có fetch data

```tsx
// app/home/page.tsx
import { serverFetchApi } from "@/api/server-client";
import HomePage from "@/components/features/home/Home";

export default async function Home() {
  const { data, status } = await serverFetchApi.GET("/home/dashboard");
  
  if (status === "error" || !data) {
    console.error("[Page] Failed to load data:", { status });
    return <ErrorDisplay message="Không thể tải dữ liệu" />;
  }
  
  return <HomePage data={data} />;
}
```

### 3. Trang có redirect logic

```tsx
// app/select-company/page.tsx
import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import SelectCompany from "@/components/features/account/SelectCompany";

export default async function SelectCompanyPage() {
  const { data } = await serverFetchApi.POST("/account/services");
  
  if (data?.service?.length === 1) {
    redirect("/home");
  }

  return <SelectCompany serviceList={data?.service ?? []} />;
}
```

---

## 🎯 Khi nào dùng pattern nào?

| Tình huống | Dùng |
|---|---|
| Hiển thị data từ API | Server Component (page.tsx) |
| Form với input, button | Client Component |
| Layout tĩnh (Header, Footer) | Client Component |
| Redirect dựa trên data | Server Component |
| useState, useEffect | Client Component |
| Call API fetch data | Server Component |
| Call API mutation (POST/PUT/DELETE) | Client Component |
| Handle API error | Server Component (console.error + ErrorDisplay) |

---

## ⚠️ Error Handling

### API Failed → Log Console + Hiển thị ErrorDisplay

```tsx
// ✅ ĐÚNG: Log lỗi và hiển thị ErrorDisplay khi API fail
import ErrorDisplay from "@/components/common/ErrorDisplay";

export default async function Page() {
  const { data, status } = await serverFetchApi.GET("/data");
  
  if (status === "error" || !data) {
    console.error("[Page] Failed to fetch data:", { status });
    return <ErrorDisplay message="Không thể tải dữ liệu" />;
  }
  
  return <PageClient data={data} />;
}

// ❌ SAI: Dùng default data
export default async function Page() {
  const { data } = await serverFetchApi.GET("/data");
  return <PageClient data={data || defaultData} />; // ❌
}
```

### Optional: Redirect khi error

```tsx
import { redirect } from "next/navigation";

export default async function Page() {
  const { data, status } = await serverFetchApi.GET("/data");
  
  if (status === "error" || !data) {
    console.error("[Page] Failed to fetch data:", { status });
    redirect("/error"); // Redirect đến error page
  }
  
  return <PageClient data={data} />;
}
```

**Lưu ý:** Component `ErrorDisplay` đã có sẵn trong `@/components/common/ErrorDisplay` với:
- Hiển thị icon warning
- Message lỗi tiếng Việt
- Nút "Thử lại" reload trang

---

## ⚠️ Lỗi thường gặp

```tsx
// ❌ SAI: Dùng hooks trong Server Component
export default async function Page() {
  const [data, setData] = useState(null); // ❌ Error!
  return <div>{data}</div>;
}

// ✅ ĐÚNG: Tách ra Client Component
// page.tsx - Server
export default async function Page() {
  const { data } = await serverFetchApi.GET("/data");
  return <PageClient data={data} />;
}

// PageClient.tsx - Client
"use client";
export default function PageClient({ data }) {
  const [state, setState] = useState(data);
  return <div>{state}</div>;
}
```

---


# Hướng Dẫn Tạo Thành Phần (Component)

Tài liệu này định nghĩa các quy tắc và quy ước thiết yếu cho việc tạo các thành phần React mới trong dự án Next.js 16 này.

## 📋 Mục Lục

1. [Cấu Trúc Tệp & Đặt Tên](#1-cấu-trúc-tệp--đặt-tên)
2. [Cấu Trúc Thành Phần](#2-cấu-trúc-thành-phần)
3. [Định Nghĩa Kiểu Dữ Liệu & Thiết Kế Props](#3-định-nghĩa-kiểu-dữ-liệu--thiết-kế-props)
4. [Quy Ước Định Kiểu](#4-quy-ước-định-kiểu)
5. [Quản Lý Trạng Thái & Logic](#5-quản-lý-trạng-thái--logic)
6. [Khả Năng Tiếp Cận](#6-khả-năng-tiếp-cận)
7. [Bình Luận & Tài Liệu](#7-bình-luận--tài-liệu)
8. [Thứ Tự Import](#8-thứ-tự-import)
9. [Mẫu Boilerplate Thành Phần](#9-mẫu-boilerplate-thành-phần)
10. [Danh Sách Kiểm Tra](#10-danh-sách-kiểm-tra)

---

## 1. Cấu Trúc Tệp & Đặt Tên

### 1.1 Quy Ước Đặt Tên Tệp

- **Tên tệp**: PascalCase (ví dụ: `Button.tsx`, `InputField.tsx`, `CompanySelector.tsx`)
- **Phần mở rộng**: `.tsx` (Tệp TypeScript chứa JavaScript và JSX)
- **Nguyên tắc**: 1 tệp = 1 thành phần chính

### 1.2 Cấu Trúc & Vị Trí Thư Mục

```
src/components/
├── common/                    # Các thành phần UI tái sử dụng được
│   ├── Button.tsx
│   ├── InputField.tsx
│   └── Modal.tsx
├── features/                  # Các thành phần riêng theo tính năng
│   ├── authentication/
│   │   └── LoginForm.tsx
│   ├── profile/
│   │   ├── index.tsx          # Thành phần chính
│   │   ├── ProfileCard.tsx
│   │   └── ProfileImageUpload.tsx
├── layout/                    # Các thành phần bố cục toàn cục
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
└── providers/                 # Các nhà cung cấp Context
    └── ThemeProvider.tsx
```

#### Hướng Dẫn Vị Trí

| Loại Thành Phần | Vị Trí | Ví Dụ |
|---|---|---|
| **Bố Cục Toàn Cục** | `/src/components/layout/` | Header, Footer, Navigation |
| **UI Tái Sử Dụng** | `/src/components/common/` | Button, InputField, Modal, Card |
| **Riêng Theo Tính Năng** | `/src/components/features/{feature}/` | LoginForm, ProfileCard |
| **Tính Năng Đa Tệp** | `/src/components/features/{feature}/` + `index.tsx` | company-selector/index.tsx |
| **Nhà Cung Cấp Context** | `/src/components/providers/` | ThemeProvider, AuthProvider |

### 1.3 Quy Ước Đặt Tên

```typescript
// ✅ Ví dụ tốt
Button.tsx
InputField.tsx
CompanySelector.tsx
ProfileCard.tsx

// ❌ Tránh
button.tsx             // chữ thường
buttonComponent.tsx    // camelCase
button.js              // phần mở rộng .js (sử dụng .tsx)
BTN.tsx                // viết tắt
```

---

## 2. Cấu Trúc Thành Phần

### 2.1 Mẫu Cấu Trúc Cơ Bản

```typescript
"use client"; // Thêm chỉ cho Client Components

// 1. Import từ thư viện bên ngoài
import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";

// 2. Import từ mô-đun nội bộ (sử dụng @ alias)
import { Button } from "@/components/common/Button";
import { InputField } from "@/components/common/InputField";

// 3. Định nghĩa kiểu dữ liệu
interface ComponentProps {
  title: string;
  onSubmit?: () => void;
}

// 4. Hằng số (bên ngoài thành phần)
const DEFAULT_VALUE = "Giá trị ban đầu";

// 5. Định nghĩa thành phần
export function ComponentName({ title, onSubmit }: ComponentProps) {
  // 6. Hooks (useState, useEffect, custom hooks)
  const [value, setValue] = useState("");
  
  // 7. Xử lý sự kiện
  const handleClick = () => {
    // Logic ở đây
  };

  // 8. Kết xuất JSX
  return (
    <div>
      {/* Nội dung thành phần */}
    </div>
  );
}
```

### 2.2 Server vs Client Components

#### Server Component (mặc định)
- Không có chỉ thị `"use client"`
- Tốt nhất cho tìm nạp dữ liệu
- Nội dung tĩnh không có tương tác của người dùng

```typescript
// ✅ Ví dụ Server Component
import { serverClient } from "@/api/server-client";

export async function DataDisplay() {
  const { data } = await serverClient.GET("/api/data");
  
  return <div>{/* Kết xuất dữ liệu */}</div>;
}
```

#### Client Component (với `"use client"`)
- Bắt buộc khi sử dụng hooks (useState, useEffect)
- Cần thiết cho các phần tử tương tác (nhấp chuột, đầu vào)
- Cần thiết cho API trình duyệt (localStorage, window)

```typescript
// ✅ Ví dụ Client Component
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## 3. Định Nghĩa Kiểu Dữ Liệu & Thiết Kế Props

### 3.1 Định Nghĩa Kiểu Props

```typescript
// ✅ Được Khuyến Nghị: định nghĩa nội tuyến hoặc type alias
interface ButtonProps {
  /**
   * Văn bản nhãn nút
   */
  label: string;
  /**
   * Hàm callback khi nhấp chuột
   */
  onClick?: () => void;
  /**
   * Trạng thái vô hiệu hóa nút
   */
  disabled?: boolean;
}

// ✅ Mở rộng React Aria Components
import type { ButtonProps as AriaButtonProps } from "react-aria-components";

interface CustomButtonProps extends Omit<AriaButtonProps, "children" | "className"> {
  variant?: "solid" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}
```

### 3.2 Các Kiểu OpenAPI Schema

```typescript
// ✅ Sử dụng các kiểu được tạo tự động từ OpenAPI
import type { components } from "@/api/types";

interface DataListProps {
  items: components["schemas"]["ItemSchema"][];
}

// ❌ Không sao chép thủ công các kiểu (gây ra sự cố đồng bộ)
interface DataListProps {
  items: { id: number; name: string }[];
}
```

### 3.3 Quy Ước Đặt Tên Kiểu

```typescript
// ✅ Ví dụ tốt
interface ButtonProps { ... }
type UserInfo = { ... }
type TaskItem = { ... }

// ❌ Tránh
interface IButton { ... }       // Tiền tố I (không cần)
type buttonProps { ... }        // camelCase
type Props { ... }              // Quá chung chung (sử dụng tên cụ thể)
```

---

## 4. Quy Ước Định Kiểu

### 4.1 Nguyên Tắc Tailwind CSS

```typescript
// ✅ Sử dụng các lớp tiện ích
<button className="h-11 rounded-[30px] px-6 text-[14px] bg-[#4C6AA8] text-white">
  Nhấp Chuột
</button>

// ✅ Định kiểu có điều kiện với twMerge
import { twMerge } from "tailwind-merge";

const buttonClass = twMerge(
  "h-11 rounded-[30px] px-6 text-[14px]",
  disabled && "cursor-not-allowed opacity-50",
  variant === "primary" && "bg-[#4C6AA8] text-white"
);

// ❌ Tránh các kiểu nội tuyến
<button style={{ height: "44px", borderRadius: "30px" }}>Nút</button>
```

### 4.2 Bảng Màu

```typescript
// ✅ Sử dụng các màu hệ thống thiết kế từ Figma
const colors = {
  primary: "#4C6AA8",      // Hành động chính
  textMain: "#261E33",     // Văn bản chính
  textSecondary: "#6F6B99", // Văn bản thứ cấp
  error: "#E26060",        // Trạng thái lỗi
  border: "#8A8A8A",       // Đường viền
  background: "#F8F8F8"    // Nền
};
```

### 4.3 Thiết Kế Phản Hồi (Dành Cho Di Động Trước Tiên)

```typescript
// ✅ Phương pháp dành cho di động trước tiên
<div className="px-[15px] md:px-[30px] lg:px-[60px]">
  {/* Di động: 15px, Máy tính bảng: 30px, Máy tính để bàn: 60px */}
</div>

// Tham chiếu Breakpoint
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
```

### 4.4 Các Mẫu Kiểu Chung

```typescript
// Vùng chứa thẻ
const cardStyle = "rounded-[24px] bg-white p-6 shadow-lg";

// Nhóm biểu mẫu
const formStyle = "flex flex-col gap-[15px]";

// Vùng chứa trang
const pageStyle = "min-h-screen bg-[#F8F8F8]";

// Khoảng cách phần
const sectionStyle = "flex flex-col gap-[10px] px-[15px] py-[20px]";
```

---

## 5. Quản Lý Trạng Thái & Logic

### 5.1 Trạng Thái Cục Bộ (useState)

```typescript
"use client";

import { useState } from "react";

export function Counter() {
  // ✅ Khởi tạo với hàm cho các tính toán nặng
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem("count");
    return saved ? Number(saved) : 0;
  });

  // ✅ Nhóm trạng thái liên quan trong một đối tượng
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    isValid: false
  });

  return <div>{count}</div>;
}
```

### 5.2 Quản Lý Biểu Mẫu (React Hook Form + Zod)

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// 1. Định nghĩa schema
const formSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có 8+ ký tự")
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  // 2. Khởi tạo biểu mẫu
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" }
  });

  // 3. Xử lý gửi
  const onSubmit = async (data: FormData) => {
    // Xử lý gửi
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

### 5.3 Trạng Thái Máy Chủ (Tích Hợp API)

#### Tìm Nạp Dữ Liệu Client Component

```typescript
"use client";

import { useQuery, useMutation } from "@tanstack/react-query";

export function DataList() {
  // ✅ Tìm nạp với TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["items"],
    queryFn: () => fetch("/api/items").then(r => r.json())
  });

  // ✅ Biến đổi cho POST/PUT/DELETE
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (newItem) => 
      fetch("/api/items", { method: "POST", body: JSON.stringify(newItem) })
  });

  if (isLoading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error.message}</div>;

  return <div>{/* Kết xuất dữ liệu */}</div>;
}
```

#### Tìm Nạp Dữ Liệu Server Component

```typescript
// Không có "use client" - Server Component

export async function DataList() {
  // ✅ Gọi API phía máy chủ trực tiếp
  const response = await fetch("http://localhost:3000/api/items");
  const data = await response.json();

  if (!response.ok) {
    return <div>Lỗi tải dữ liệu</div>;
  }

  return <div>{/* Kết xuất dữ liệu */}</div>;
}
```

### 5.4 Trạng Thái Toàn Cục (Context/Zustand)

```typescript
// ✅ Sử dụng Context cho trạng thái toàn cục tối thiểu (ví dụ: xác thực)
import { useContext } from "react";
import { AuthContext } from "@/components/providers/AuthProvider";

export function UserProfile() {
  const { user } = useContext(AuthContext);
  
  return <div>{user?.name}</div>;
}
```

---

## 6. Khả Năng Tiếp Cận

### 6.1 React Aria Components

```typescript
"use client";

import { Button, Dialog, Modal, ModalOverlay } from "react-aria-components";

// ✅ Sử dụng React Aria cho các thành phần có thể truy cập được
export function AccessibleModal() {
  return (
    <ModalOverlay>
      <Modal>
        <Dialog role="dialog" aria-labelledby="title">
          <h2 id="title">Tiêu Đề Modal</h2>
          <Button>Đóng</Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
```

### 6.2 HTML Ngữ Nghĩa

```typescript
// ✅ Sử dụng các yếu tố ngữ nghĩa
<header className="...">
  <h1 className="...">Tiêu Đề Trang</h1>
  <nav>...</nav>
</header>
<main>
  {/* Nội dung chính */}
</main>
<footer>...</footer>

// ❌ Tránh các div quá mức
<div className="header">
  <div className="title">Tiêu Đề Trang</div>
  <div className="nav">...</div>
</div>
```

### 6.3 Thuộc Tính ARIA

```typescript
// ✅ Thêm các thuộc tính ARIA thích hợp
<button
  aria-label="Chuyển đổi khả năng hiển thị mật khẩu"
  aria-pressed={showPassword}
  onClick={() => setShowPassword(!showPassword)}
>
  <EyeIcon />
</button>

// ✅ Sử dụng role và aria-modal
<div role="dialog" aria-modal="true" aria-labelledby={titleId}>
  <h2 id={titleId}>Tiêu Đề Hộp Thoại</h2>
</div>
```

---

## 7. Bình Luận & Tài Liệu

### 7.1 JSDoc cho Props

```typescript
interface ButtonProps {
  /**
   * Văn bản nhãn hiển thị trên nút
   */
  label: string;
  /**
   * Biến thể trực quan của nút
   * @default "solid"
   */
  variant?: "solid" | "outline" | "ghost";
  /**
   * Hàm callback khi nhấp nút
   */
  onClick?: () => void;
  /**
   * Liệu nút bị vô hiệu hóa hay không
   */
  disabled?: boolean;
}
```

### 7.2 Tài Liệu Thành Phần

```typescript
/**
 * Một thành phần nút tái sử dụng được tuân theo hệ thống thiết kế
 * 
 * Được xây dựng bằng React Aria Components để hỗ trợ khả năng tiếp cận.
 * Tất cả kiểu dáng sử dụng các lớp tiện ích Tailwind CSS.
 * 
 * @example
 * ```tsx
 * <Button 
 *   variant="solid" 
 *   onClick={handleClick}
 * >
 *   Nhấp chuột
 * </Button>
 * ```
 */
export function Button({ variant = "solid", ...props }: ButtonProps) {
  // ...
}
```

### 7.3 Bình Luận Nội Tuyến

```typescript
export function DataSelector({ items }: Props) {
  // ✅ Giải thích "tại sao" đằng sau logic phức tạp
  // Tự động chọn khi kết xuất lần đầu tiên để tránh chọn lại
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (hasAutoSelected.current) return;

    // Sử dụng mục đầu tiên nếu không có mục nào được chọn rõ ràng
    const selected = items.find((item) => item.selected === 1)?.id;
    
    if (!selected && items[0]) {
      // ...
    }
  }, []);
}
```

### 7.4 Các Thực Hành Bình Luận Tốt Nhất

```typescript
// ✅ Tốt: Giải thích lý do, không phải code làm gì
// Trường mật khẩu cần thêm khoảng đệm phải cho biểu tượng chuyển đổi khả năng hiển thị
const inputClass = isPassword ? "px-[10px] pr-[40px]" : "px-[10px]";

// ❌ Xấu: Phát biểu lại code rõ ràng
// Đặt lớp đầu vào
const inputClass = "px-[10px]";

// ❌ Xấu: Code được nhận xét (xóa thay vì)
// const oldImplementation = () => { ... };
```

---

## 8. Thứ Tự Import

### 8.1 Thứ Tự Import Tiêu Chuẩn

```typescript
"use client";

// 1. React nội bộ
import { useState, useEffect, type ReactNode } from "react";

// 2. Thư viện bên ngoài
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button, Form } from "react-aria-components";
import { z } from "zod";
import { twMerge } from "tailwind-merge";

// 3. API clients và kiểu
import type { components } from "@/api/types";
import { useQuery } from "@tanstack/react-query";

// 4. Các thành phần nội bộ
import { Button as UIButton } from "@/components/common/Button";
import { InputField } from "@/components/common/InputField";
import { Header } from "@/components/layout/Header";

// 5. Tiện ích, hooks, hằng số
import { useFileUpload } from "@/hooks/useFileUpload";
import { formatDate } from "@/utils/formatDate";
import { MENU_ITEMS } from "@/constants/navigation";

// 6. Định nghĩa kiểu cục bộ
import type { DataListProps } from "./types";

// 7. Kiểu dáng và tài sản
import styles from "./styles.module.css";
import Logo from "./logo.svg";
```

### 8.2 Import Chỉ Kiểu

```typescript
// ✅ Sử dụng từ khóa type cho các kiểu
import type { ReactNode } from "react";
import type { components } from "@/api/types";

// ✅ Trộn runtime và import kiểu
import { useState, type Dispatch, type SetStateAction } from "react";

// ❌ Đừng quên từ khóa type
import { ReactNode } from "react"; // Không cần khi chạy
```

---

## 9. Mẫu Boilerplate Thành Phần

Sử dụng các mẫu này làm điểm xuất phát cho việc tạo các thành phần mới.

### 9.1 Thành Phần UI Đơn Giản (Không Có Trạng Thái)

```typescript
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface CardProps {
  /**
   * Tiêu đề thẻ
   */
  title: string;
  /**
   * Nội dung thẻ
   */
  children: ReactNode;
  /**
   * Các lớp CSS bổ sung
   */
  className?: string;
}

/**
 * Thành phần thẻ để hiển thị nội dung được nhóm
 * 
 * @example
 * ```tsx
 * <Card title="Thông Tin Người Dùng">
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

### 9.2 Thành Phần Biểu Mẫu với Xác Thực

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { InputField } from "@/components/common/InputField";

// Định nghĩa schema xác thực
const userFormSchema = z.object({
  name: z.string().min(1, "Tên là bắt buộc"),
  email: z.string().email("Địa chỉ email không hợp lệ")
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  /** Giá trị biểu mẫu ban đầu (cho chế độ chỉnh sửa) */
  initialValues?: Partial<UserFormData>;
  /** Callback khi gửi thành công */
  onSubmit?: (data: UserFormData) => Promise<void>;
}

/**
 * Thành phần biểu mẫu thông tin người dùng
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
      console.error("Gửi biểu mẫu thất bại:", error);
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
            label="Họ Tên Đầy Đủ"
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
            label="Địa Chỉ Email"
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
        {isSubmitting ? "Đang gửi..." : "Gửi"}
      </Button>
    </form>
  );
}
```

### 9.3 Thành Phần Tìm Nạp Dữ Liệu

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import type { components } from "@/api/types";

type DataItem = components["schemas"]["DataItem"];

interface DataListProps {
  /** Trạng thái lọc tùy chọn */
  status?: "active" | "inactive";
}

/**
 * Thành phần danh sách dữ liệu với các trạng thái tải và lỗi
 */
export function DataList({ status }: DataListProps) {
  const { data, isLoading, error } = useQuery<DataItem[]>({
    queryKey: ["data-items", status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const response = await fetch(`/api/items${params}`);
      if (!response.ok) throw new Error("Không thể tìm nạp dữ liệu");
      return response.json();
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-[#E26060]">Lỗi tải dữ liệu</div>;
  }

  const items = data || [];

  if (items.length === 0) {
    return <div className="text-center py-8 text-[#6F6B99]">Không tìm thấy mục nào</div>;
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {items.map((item) => (
        <DataItem key={item.id} data={item} />
      ))}
    </div>
  );
}

// Thành phần con (có thể nằm trong cùng một tệp)
function DataItem({ data }: { data: DataItem }) {
  return (
    <div className="rounded-[12px] bg-white p-4">
      <h3 className="font-bold text-[16px]">{data.name}</h3>
      <p className="mt-2 text-[14px] text-[#6F6B99]">{data.description}</p>
    </div>
  );
}
```

### 9.4 Thành Phần Tương Tác với Trạng Thái Cục Bộ

```typescript
"use client";

import { useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface TabsProps {
  /** Danh sách các tab với nhãn và nội dung */
  tabs: Array<{ label: string; content: ReactNode }>;
  /** Chỉ số tab hoạt động ban đầu */
  defaultIndex?: number;
  /** Callback khi tab thay đổi */
  onChange?: (index: number) => void;
}

/**
 * Thành phần điều hướng tab
 */
export function Tabs({ tabs, defaultIndex = 0, onChange }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    onChange?.(index);
  };

  return (
    <div>
      {/* Nút tab */}
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

      {/* Nội dung tab */}
      <div className="mt-4">
        {tabs[activeIndex]?.content}
      </div>
    </div>
  );
}
```

---

## 10. Danh Sách Kiểm Tra

Trước khi gửi một thành phần mới, hãy đảm bảo:

### Tệp & Cấu Trúc
- [ ] Tên tệp là PascalCase (ví dụ: `Button.tsx`)
- [ ] Được đặt trong thư mục thích hợp (`/common` vs `/features`)
- [ ] Tuân theo nguyên tắc 1 tệp = 1 thành phần
- [ ] Trách nhiệm duy nhất (không làm quá nhiều điều)

### TypeScript & Kiểu
- [ ] Props được nhập vào đúng cách (không có kiểu `any`)
- [ ] Chỉ thị `"use client"` được thêm nếu thành phần sử dụng hooks/tương tác
- [ ] Các kiểu được nhập từ các vị trí chính xác
- [ ] Các kiểu được xuất nếu có thể tái sử dụng ở nơi khác

### Kiểu Dáng
- [ ] Sử dụng các lớp tiện ích Tailwind CSS (không có kiểu nội tuyến)
- [ ] Màu sắc phù hợp với hệ thống thiết kế từ Figma
- [ ] Thiết kế phản hồi được xem xét (dành cho di động trước tiên)
- [ ] Sử dụng `twMerge` cho các lớp có điều kiện

### Chất Lượng Mã
- [ ] Props được ghi lại bằng bình luận JSDoc
- [ ] Logic phức tạp có bình luận giải thích
- [ ] Tuân theo quy ước thứ tự import
- [ ] Không có câu lệnh console.log (chỉ cảnh báo/lỗi)
- [ ] `pnpm lint` thông qua mà không có lỗi

### Quản Lý Trạng Thái
- [ ] Sử dụng React Hook Form + Zod cho biểu mẫu
- [ ] Sử dụng TanStack Query cho các lệnh gọi API
- [ ] Không có trạng thái toàn cục không cần thiết
- [ ] Xử lý sự kiện được ghi nhớ nếu cần (useCallback)

### Khả Năng Tiếp Cận
- [ ] Sử dụng các yếu tố HTML ngữ nghĩa
- [ ] Bao gồm các thuộc tính ARIA ở nơi cần thiết
- [ ] Hỗ trợ điều hướng bàn phím
- [ ] Hình ảnh có văn bản thay thế

### Sẵn Sàng Kiểm Tra
- [ ] Thành phần có thể kiểm tra được (không liên kết chặt chẽ)
- [ ] Props và hành vi dự kiến rõ ràng
- [ ] Không có phụ thuộc bên ngoài không thể được giả lập
- [ ] Các trạng thái lỗi được xử lý một cách duyên dáng

---

## Tham Chiếu Nhanh

### Import Chính Theo Trường Hợp Sử Dụng

**Tìm Nạp Dữ Liệu**
```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
```

**Biểu Mẫu**
```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```

**Kiểu Dáng**
```typescript
import { twMerge } from "tailwind-merge";
```

**Khả Năng Tiếp Cận**
```typescript
import { Button, Dialog, Modal } from "react-aria-components";
```

### Tham Chiếu Màu Sắc
```
Chính:           #4C6AA8
Văn Bản Chính:   #261E33
Văn Bản Thứ Cấp: #6F6B99
Lỗi:             #E26060
Đường Viền:      #8A8A8A
Nền:             #F8F8F8
```

### Tiện Ích Chung
```typescript
// Hợp nhất các lớp Tailwind một cách có điều kiện
const buttonClass = twMerge(
  "px-4 py-2",
  disabled && "opacity-50 cursor-not-allowed"
);
```

---

## Câu Hỏi Thường Gặp

**Q: Khi nào tôi nên chia một thành phần thành nhiều tệp?**
- Nếu vượt quá 200 dòng
- Khi nó có nhiều trách nhiệm riêng biệt
- Khi các phần được tái sử dụng ở nơi khác

**Q: Server hay Client Component?**
- Sử dụng Client Component nếu: tương tác, sử dụng hooks, truy cập API trình duyệt
- Sử dụng Server Component cho: nội dung tĩnh, tìm nạp dữ liệu, hoạt động nhạy cảm

**Q: Tôi nên trừu tượng hóa kiểu dáng bao nhiêu?**
- Trích xuất nếu được sử dụng 3+ lần, nếu không hãy giữ nội tuyến
- Tránh trừu tượng hóa quá mức làm giảm khả năng đọc

**Q: Tôi có cần bọc mọi thứ bằng `"use client"` không?**
- Không, chỉ khi thành phần sử dụng hooks hoặc API trình duyệt
- Mặc định là Server Components để hiệu suất tốt hơn

---

**Cập Nhật Lần Cuối**: Tháng 12 18, 2024  
**Phiên Bản**: 2.0.0 (Phiên Bản Boilerplate Tiếng Việt)

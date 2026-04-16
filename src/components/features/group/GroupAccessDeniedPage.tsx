"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

const PRIMARY_BUTTON_CLASS = "w-full bg-orange-600 text-white hover:bg-orange-700";

function Logo() {
    return (
        <div className="mb-6 flex items-center justify-center gap-3">
            <svg width="48" height="48" viewBox="0 0 64 64">
                <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
            </svg>
            <span className="text-3xl font-bold leading-tight text-orange-500">
                Study <br /> Studio
            </span>
        </div>
    );
}

function getCopy(locale: string) {
    const isVi = locale.toLowerCase().startsWith("vi");

    return isVi
        ? {
              title: "Bạn không phải thành viên của nhóm",
              description: "Bạn không có quyền truy cập nhóm này hoặc liên kết nhóm không hợp lệ.",
              action: "Quay lại nhóm"
          }
        : {
              title: "You are not a member of this group",
              description: "You do not have permission to access this group or the group link is invalid.",
              action: "Go back"
          };
}

export function GroupAccessDeniedPage() {
    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const copy = getCopy(locale);

    const handleBack = () => {
        const fallback = `/${locale}/home`;
        const from = String(searchParams.get("from") ?? "").trim();

        if (from) {
            router.push(from);
            return;
        }

        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }

        router.push(fallback);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <Logo />
                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{copy.title}</h1>
                <p className="mb-6 text-sm text-muted-foreground">{copy.description}</p>
                <Button className={PRIMARY_BUTTON_CLASS} onClick={handleBack}>
                    {copy.action}
                </Button>
            </div>
        </div>
    );
}

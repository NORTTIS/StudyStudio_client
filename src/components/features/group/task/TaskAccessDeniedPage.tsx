"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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

export function TaskAccessDeniedPage() {
    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const t = useTranslations("GroupTaskDeepLinkPage");
    const reason = String(searchParams.get("reason") ?? "").trim().toLowerCase();

    const title =
        reason === "forbidden"
            ? t("accessDeniedTitle")
            : t("cannotOpenTitle");

    const description = t("accessDeniedDescription");

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <Logo />

                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{title}</h1>
                <p className="mb-6 text-sm text-muted-foreground">{description}</p>

                <div className="space-y-3">
                    <Button className={PRIMARY_BUTTON_CLASS} onClick={() => router.push(`/${locale}/home`)}>
                        {t("goHome")}
                    </Button>
                </div>
            </div>
        </div>
    );
}



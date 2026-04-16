"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function GroupSettingAccessDeniedPage({
    groupId,
    fromStudioId,
    description,
    title,
    buttonLabel
}: {
    groupId?: string | null;
    fromStudioId?: string | null;
    description?: string;
    title?: string;
    buttonLabel?: string;
}) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("GroupSettingView");

    const normalizedGroupId = String(groupId ?? "").trim();
    const normalizedStudioId = String(fromStudioId ?? "").trim();
    const groupHref = normalizedStudioId
        ? `/${locale}/group/${normalizedGroupId}?fromStudioId=${encodeURIComponent(normalizedStudioId)}`
        : `/${locale}/group/${normalizedGroupId}`;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                    </svg>
                    <span className="text-3xl font-bold leading-tight text-orange-500">
                        Study <br /> Studio
                    </span>
                </div>

                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{title ?? t("unauthorized.title")}</h1>
                <p className="mb-6 text-sm text-muted-foreground">{description ?? t("unauthorized.description")}</p>

                <Button
                    className="w-full bg-orange-600 text-white hover:bg-orange-700"
                    onClick={() => router.push(groupHref)}>
                    {buttonLabel ?? t("unauthorized.backToGroup")}
                </Button>
            </div>
        </div>
    );
}

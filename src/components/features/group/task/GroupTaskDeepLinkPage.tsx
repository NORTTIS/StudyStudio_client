"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { GroupShell } from "@/components/features/group/GroupShell";
import { GroupBoardScreen } from "@/components/features/group/board/GroupBoardScreen";
import { Button } from "@/components/ui/button";

export type GroupTaskDeepLinkResolution =
    | { status: "found"; groupId: string }
    | { status: "forbidden" }
    | { status: "not_found" }
    | { status: "error"; message?: string | null };

const PRIMARY_BUTTON_CLASS = "w-full bg-orange-600 text-white hover:bg-orange-700";

function CenterMessage({
    title,
    description,
    status = "idle",
    primaryLabel,
    onPrimary,
    secondaryLabel,
    onSecondary
}: {
    title: string;
    description: string;
    status?: "idle" | "loading" | "error" | "blocked";
    primaryLabel: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <Logo />

                {status === "loading" ? (
                    <div className="mb-5 flex justify-center">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    </div>
                ) : null}

                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{title}</h1>
                <p className="mb-6 text-sm text-muted-foreground">{description}</p>

                <div className="space-y-3">
                    <Button className={PRIMARY_BUTTON_CLASS} onClick={onPrimary}>
                        {primaryLabel}
                    </Button>
                    {secondaryLabel && onSecondary ? (
                        <Button className="w-full" variant="outline" onClick={onSecondary}>
                            {secondaryLabel}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

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

export function GroupTaskDeepLinkPage({
    taskId,
    initialResolution
}: {
    taskId: string;
    initialResolution: GroupTaskDeepLinkResolution;
}) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("GroupTaskDeepLinkPage");
    const normalizedTaskId = React.useMemo(() => String(taskId ?? "").trim(), [taskId]);
    const resolvedGroupId = initialResolution.status === "found" ? initialResolution.groupId : "";
    const notMember = initialResolution.status === "forbidden";
    const error =
        initialResolution.status === "error"
            ? initialResolution.message || t("cannotOpenTask")
            : initialResolution.status === "not_found" || !normalizedTaskId
              ? t("invalidOrMissingLink")
              : "";

    React.useEffect(() => {
        if (!notMember) return;
        router.replace(`/${locale}/task-access-denied`, { scroll: false });
    }, [notMember, router, locale]);

    const goHome = React.useCallback(() => {
        router.push(`/${locale}/home`);
    }, [router, locale]);

    const goBackToGroup = React.useCallback(() => {
        if (!resolvedGroupId) {
            goHome();
            return;
        }

        router.replace(`/${locale}/group/${resolvedGroupId}`, { scroll: false });
    }, [router, locale, resolvedGroupId, goHome]);

    if (notMember) {
        return (
            <CenterMessage
                title={t("accessDeniedTitle")}
                description={t("accessDeniedDescription")}
                status="blocked"
                primaryLabel={t("goHome")}
                onPrimary={goHome}
            />
        );
    }

    if (error || !resolvedGroupId) {
        return (
            <CenterMessage
                title={t("cannotOpenTitle")}
                description={error || t("invalidOrMissingLink")}
                status="error"
                primaryLabel={t("goHome")}
                onPrimary={goHome}
            />
        );
    }

    return (
        <GroupShell groupId={resolvedGroupId}>
            <GroupBoardScreen
                groupIdOverride={resolvedGroupId}
                initialTaskId={normalizedTaskId}
                onTaskDetailClose={goBackToGroup}
            />
        </GroupShell>
    );
}

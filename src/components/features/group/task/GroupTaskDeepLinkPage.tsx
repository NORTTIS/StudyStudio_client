"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { GroupShell } from "@/components/features/group/GroupShell";
import { GroupBoardScreen } from "@/components/features/group/board/GroupBoardScreen";
import { Button } from "@/components/ui/button";

/**
 * Kết quả resolve deep link task
 */
export type GroupTaskDeepLinkResolution =
    | { status: "found"; groupId: string } // tìm thấy task + group
    | { status: "forbidden" } // user không có quyền truy cập
    | { status: "not_found" } // task không tồn tại
    | { status: "error"; message?: string | null }; // lỗi hệ thống

// Class dùng chung cho nút chính
const PRIMARY_BUTTON_CLASS = "w-full bg-orange-600 text-white hover:bg-orange-700";

/**
 * Component hiển thị message ở giữa màn hình
 * Dùng cho các trạng thái:
 * - loading
 * - error
 * - access denied
 */
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
                {/* Logo app */}
                <Logo />

                {/* Loading indicator */}
                {status === "loading" ? (
                    <div className="mb-5 flex justify-center">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    </div>
                ) : null}

                {/* Nội dung message */}
                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{title}</h1>
                <p className="mb-6 text-sm text-muted-foreground">{description}</p>

                {/* Action buttons */}
                <div className="space-y-3">
                    <Button className={PRIMARY_BUTTON_CLASS} onClick={onPrimary}>
                        {primaryLabel}
                    </Button>

                    {/* Secondary button (nếu có) */}
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

/**
 * Logo hiển thị trong CenterMessage
 */
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

/**
 * Page xử lý deep link đến task trong group
 * Flow:
 * - Nhận taskId + initialResolution từ server
 * - Xử lý quyền truy cập
 * - Redirect hoặc render board tương ứng
 */
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

    // Normalize taskId
    const normalizedTaskId = React.useMemo(() => String(taskId ?? "").trim(), [taskId]);

    // Lấy groupId nếu tìm thấy
    const resolvedGroupId =
        initialResolution.status === "found" ? initialResolution.groupId : "";

    // Flag user không có quyền
    const notMember = initialResolution.status === "forbidden";

    /**
     * Xác định lỗi hiển thị
     * Ưu tiên:
     * - error từ server
     * - not_found hoặc taskId invalid
     */
    const error =
        initialResolution.status === "error"
            ? initialResolution.message || t("cannotOpenTask")
            : initialResolution.status === "not_found" || !normalizedTaskId
                ? t("taskNotFound")
                : "";

    /**
     * Nếu user không có quyền -> redirect sang trang access denied
     */
    React.useEffect(() => {
        if (!notMember) return;

        router.replace(`/${locale}/task-access-denied`, { scroll: false });
    }, [notMember, router, locale]);

    /**
     * Điều hướng về trang home
     */
    const goHome = React.useCallback(() => {
        router.push(`/${locale}/home`);
    }, [router, locale]);

    /**
     * Điều hướng về group hiện tại
     * Nếu không có groupId thì fallback về home
     */
    const goBackToGroup = React.useCallback(() => {
        if (!resolvedGroupId) {
            goHome();
            return;
        }

        router.replace(`/${locale}/group/${resolvedGroupId}`, { scroll: false });
    }, [router, locale, resolvedGroupId, goHome]);

    /**
     * Case: user không có quyền
     */
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

    /**
     * Case: lỗi hoặc không tìm thấy task/group
     */
    if (error || !resolvedGroupId) {
        return (
            <CenterMessage
                title={t("cannotOpenTitle")}
                description={error || t("taskNotFound")}
                status="error"
                primaryLabel={t("goHome")}
                onPrimary={goHome}
            />
        );
    }

    /**
     * Case: thành công
     * Render group board và mở task detail tương ứng
     */
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
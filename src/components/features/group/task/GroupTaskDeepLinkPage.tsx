"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import * as React from "react";
import { Loader2 } from "lucide-react";
import type { components } from "@/api/types";
import { apiFetch } from "@/api/api-client";
import { GroupShell } from "@/components/features/group/GroupShell";
import { fetchGroupsPageData, getCurrentUserId } from "@/components/features/group/group.api";
import { GroupBoardScreen } from "@/components/features/group/board/GroupBoardScreen";
import { Button } from "@/components/ui/button";

type GroupCardDto = components["schemas"]["GroupCardDto"];
type GroupDetailResponse = components["schemas"]["GroupDetailResponse"];
type GroupMemberListResponse = components["schemas"]["GroupMemberListResponse"];

const PRIMARY_BUTTON_CLASS = "w-full bg-orange-600 text-white hover:bg-orange-700";

function getGroupId(group: GroupCardDto | Record<string, unknown>) {
    const candidate = group as { id?: unknown; groupId?: unknown; group_id?: unknown };
    return String(candidate.id ?? candidate.groupId ?? candidate.group_id ?? "").trim();
}

async function fetchGroupDetail(groupId: string, locale: string) {
    const response = await apiFetch<GroupDetailResponse>(`/group/${encodeURIComponent(groupId)}/detail`, {
        method: "GET",
        locale
    });

    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Không thể tải chi tiết nhóm.");
    }

    return response.data;
}

async function fetchGroupMembers(groupId: string, locale: string) {
    const response = await apiFetch<GroupMemberListResponse>(`/group/${encodeURIComponent(groupId)}/members`, {
        method: "GET",
        locale
    });

    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Không thể tải danh sách thành viên.");
    }

    return response.data;
}

function taskExistsInGroup(detail: GroupDetailResponse, taskId: string) {
    return (detail.taskStatuses ?? []).some((status) =>
        (status?.taskList ?? []).some((task) => String(task?.taskId ?? "").trim() === taskId)
    );
}

function isCurrentUserMember(memberData: GroupMemberListResponse, currentUserId: string) {
    const normalizedUserId = String(currentUserId ?? "").trim().toLowerCase();
    if (!normalizedUserId) return false;

    return (memberData.members ?? []).some((member) => String(member?.userId ?? "").trim().toLowerCase() === normalizedUserId);
}

async function resolveGroupIdFromTaskId(taskId: string, locale: string) {
    const groupsPageData = await fetchGroupsPageData();
    const currentUserId = getCurrentUserId();
    const allGroups = [
        ...(groupsPageData.favorites ?? []),
        ...(groupsPageData.managed ?? []),
        ...(groupsPageData.independent ?? []),
        ...(groupsPageData.joined ?? []),
        ...(groupsPageData.inactive ?? [])
    ];

    const uniqueGroupIds = Array.from(new Set(allGroups.map((group) => getGroupId(group)).filter(Boolean)));

    const detailResults = await Promise.allSettled(uniqueGroupIds.map((groupId) => fetchGroupDetail(groupId, locale)));
    const candidateGroupIds = detailResults.flatMap((result, index) => {
        if (result.status !== "fulfilled") return [];
        return taskExistsInGroup(result.value, taskId) ? [uniqueGroupIds[index]] : [];
    });

    if (!currentUserId) return candidateGroupIds[0] ?? ""; // Membership is intentionally skipped for unauthenticated users.

    const membershipResults = await Promise.allSettled(
        candidateGroupIds.map(async (groupId) => ({
            groupId,
            isMember: isCurrentUserMember(await fetchGroupMembers(groupId, locale), currentUserId)
        }))
    );

    for (const result of membershipResults) {
        if (result.status === "fulfilled" && result.value.isMember) {
            return result.value.groupId;
        }
    }

    return "";
}

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

export function GroupTaskDeepLinkPage({ taskId }: { taskId: string }) {
    const router = useRouter();
    const locale = useLocale();
    const normalizedTaskId = React.useMemo(() => String(taskId ?? "").trim(), [taskId]);

    const [resolvedGroupId, setResolvedGroupId] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [notMember, setNotMember] = React.useState(false);

    React.useEffect(() => {
        if (!normalizedTaskId) {
            setLoading(false);
            setError("Liên kết công việc không hợp lệ.");
            return;
        }

        let alive = true;

        void (async () => {
            try {
                setLoading(true);
                setError("");
                setNotMember(false);

                const groupId = await resolveGroupIdFromTaskId(normalizedTaskId, locale);
                if (!alive) return;

                if (!groupId) {
                    setNotMember(true);
                    return;
                }

                setResolvedGroupId(groupId);
            } catch (err: unknown) {
                if (!alive) return;
                setError(err instanceof Error ? err.message : "Không thể mở công việc này.");
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [normalizedTaskId, locale]);

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

    if (loading) {
        return (
            <CenterMessage
                title="Đang tải công việc"
                description="Đang kiểm tra liên kết công việc và quyền truy cập của bạn."
                status="loading"
                primaryLabel="Về trang chủ"
                onPrimary={goHome}
            />
        );
    }

    if (notMember) {
        return (
            <CenterMessage
                title="Không có quyền truy cập"
                description="Bạn không phải thành viên của nhóm chứa công việc này hoặc liên kết không còn hợp lệ."
                status="blocked"
                primaryLabel="Về trang chủ"
                onPrimary={goHome}
            />
        );
    }

    if (error || !resolvedGroupId) {
        return (
            <CenterMessage
                title="Không thể mở công việc"
                description={error || "Liên kết công việc không còn hợp lệ hoặc không tồn tại."}
                status="error"
                primaryLabel="Về trang chủ"
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

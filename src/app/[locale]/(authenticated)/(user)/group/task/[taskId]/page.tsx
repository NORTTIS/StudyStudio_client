import { serverFetchApi } from "@/api/server-client";
import { redirect } from "next/navigation";
import type { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import {
    GroupTaskDeepLinkPage,
    type GroupTaskDeepLinkResolution
} from "@/components/features/group/task/GroupTaskDeepLinkPage";
import type { GroupCardDto } from "@/components/features/group/types";

type GroupDetailResponse = components["schemas"]["GroupDetailResponse"];

function getGroupId(group: GroupCardDto | Record<string, unknown>) {
    const candidate = group as { id?: unknown; groupId?: unknown; group_id?: unknown };
    return String(candidate.id ?? candidate.groupId ?? candidate.group_id ?? "").trim();
}

function taskExistsInGroup(detail: GroupDetailResponse, taskId: string) {
    return (detail.taskStatuses ?? []).some((status) =>
        (status?.taskList ?? []).some((task) => String(task?.taskId ?? "").trim() === taskId)
    );
}

async function resolveTaskGroupOnServer(taskId: string, locale: string): Promise<GroupTaskDeepLinkResolution> {
    const groupsResponse = await serverFetchApi.GET<{
        sections?: {
            favorites?: GroupCardDto[] | null;
            studioGroups?: GroupCardDto[] | null;
            independentGroups?: GroupCardDto[] | null;
            archivedGroups?: GroupCardDto[] | null;
        } | null;
    }>("/group", {
        headers: {
            "Accept-Language": locale
        }
    });

    if (groupsResponse.status !== "success" || !groupsResponse.data) {
        if (groupsResponse.code === "HTTP_401") {
            return { status: "forbidden" };
        }

        return {
            status: "error",
            message: groupsResponse.message || null
        };
    }

    const sections = groupsResponse.data.sections;
    const allGroups = [
        ...(sections?.favorites ?? []),
        ...(sections?.studioGroups ?? []),
        ...(sections?.independentGroups ?? []),
        ...(sections?.archivedGroups ?? [])
    ];
    const uniqueGroupIds = Array.from(new Set(allGroups.map((group) => getGroupId(group)).filter(Boolean)));

    if (uniqueGroupIds.length === 0) {
        return { status: "not_found" };
    }

    const detailResults = await Promise.allSettled(
        uniqueGroupIds.map((groupId) =>
            serverFetchApi.GET<GroupDetailResponse>(`/group/${encodeURIComponent(groupId)}/detail`, {
                headers: {
                    "Accept-Language": locale
                }
            })
        )
    );

    for (const [index, result] of detailResults.entries()) {
        if (result.status !== "fulfilled") {
            continue;
        }

        if (result.value.status !== "success" || !result.value.data) {
            continue;
        }

        if (taskExistsInGroup(result.value.data, taskId)) {
            return {
                status: "found",
                groupId: uniqueGroupIds[index]
            };
        }
    }

    return { status: "not_found" };
}

export default async function Page({
    params
}: {
    params: Promise<{ locale: string; taskId: string }>;
}) {
    const resolvedParams = await params;
    const initialResolution = await resolveTaskGroupOnServer(resolvedParams.taskId, resolvedParams.locale);

    if (initialResolution.status === "forbidden") {
        redirect(`/${resolvedParams.locale}/task-access-denied?reason=forbidden`);
    }

    if (initialResolution.status === "not_found") {
        redirect(`/${resolvedParams.locale}/task-access-denied?reason=invalid`);
    }

    if (initialResolution.status === "error") {
        console.error("Failed to resolve task deep link on the server", {
            locale: resolvedParams.locale,
            taskId: resolvedParams.taskId,
            message: initialResolution.message ?? null
        });

        return <ErrorDisplay message={initialResolution.message || "Unable to open this task right now."} />;
    }

    return <GroupTaskDeepLinkPage taskId={resolvedParams.taskId} initialResolution={initialResolution} />;
}

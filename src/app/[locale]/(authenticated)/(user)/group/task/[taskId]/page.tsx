import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import type { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import {
    GroupTaskDeepLinkPage,
    type GroupTaskDeepLinkResolution
} from "@/components/features/group/task/GroupTaskDeepLinkPage";

type TaskGroupResponse = components["schemas"]["TaskGroupResponse"];

async function resolveTaskGroupOnServer(taskId: string, locale: string): Promise<GroupTaskDeepLinkResolution> {
    const response = await serverFetchApi.GET<TaskGroupResponse>(`/task/${encodeURIComponent(taskId)}/group`, {
        headers: {
            "Accept-Language": locale
        }
    });

    if (response.status === "error") {
        if (response.code === "HTTP_401") {
            return { status: "forbidden" };
        }

        return {
            status: "error",
            message: response.message || null
        };
    }

    if (response.status !== "success" || !response.data) {
        return { status: "not_found" };
    }
    if (!response.data.groupId) {
        return { status: "not_found" };
    }

    return {
        status: "found",
        groupId: response.data.groupId
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string; taskId: string }> }) {
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

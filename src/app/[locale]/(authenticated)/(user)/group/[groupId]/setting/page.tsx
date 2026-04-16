import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import type { components } from "@/api/types";
import { GroupSettingView } from "@/components/features/group/setting/GroupSettingView";

type GroupDetailResponse = components["schemas"]["GroupDetailResponse"];

function normalizeSettingRole(role?: string | null) {
    const raw = String(role ?? "")
        .trim()
        .replace(/^['"]+|['"]+$/g, "")
        .toLowerCase();

    if (raw.includes("owner") || raw === "admin") return "owner";
    if (raw.includes("moderator")) return "moderator";
    if (raw.includes("member")) return "member";
    if (raw.includes("commenter")) return "commenter";
    if (raw.includes("viewer") || raw === "view") return "viewer";
    return raw;
}

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ locale: string; groupId: string }>;
    searchParams: Promise<{ fromStudioId?: string }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const response = await serverFetchApi.GET<GroupDetailResponse>(
        `/group/${encodeURIComponent(resolvedParams.groupId)}/detail`,
        {
            headers: {
                "Accept-Language": resolvedParams.locale
            }
        }
    );

    if (response.status === "success") {
        const normalizedRole = normalizeSettingRole(response.data?.userRole);
        const canViewSettings = normalizedRole === "owner" || normalizedRole === "moderator";

        if (!canViewSettings) {
            const nextParams = new URLSearchParams();
            nextParams.set("groupId", resolvedParams.groupId);

            if (resolvedSearchParams.fromStudioId) {
                nextParams.set("fromStudioId", resolvedSearchParams.fromStudioId);
            }

            redirect(`/${resolvedParams.locale}/group-setting-no-access?${nextParams.toString()}`);
        }
    }

    return <GroupSettingView />;
}

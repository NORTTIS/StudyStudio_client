import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import type { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import GroupAnalyticPage from "@/components/features/group/analytic/GroupAnalyticPage";

type GroupDetailResponse = components["schemas"]["GroupDetailResponse"];

function isUuidLike(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? "").trim());
}

function normalizeGroupRole(role?: string | null) {
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
    const nextParams = new URLSearchParams();
    nextParams.set("groupId", resolvedParams.groupId);

    if (resolvedSearchParams.fromStudioId) {
        nextParams.set("fromStudioId", resolvedSearchParams.fromStudioId);
    }

    if (!isUuidLike(resolvedParams.groupId)) {
        redirect(`/${resolvedParams.locale}/group-analytic-no-access?${nextParams.toString()}`);
    }

    const response = await serverFetchApi.GET<GroupDetailResponse>(
        `/group/${encodeURIComponent(resolvedParams.groupId)}/detail`,
        {
            headers: {
                "Accept-Language": resolvedParams.locale
            }
        }
    );

    if (response.status === "error") {
        if (response.code === "HTTP_401" || response.code === "HTTP_403") {
            redirect(`/${resolvedParams.locale}/group-analytic-no-access?${nextParams.toString()}`);
        }

        console.error("[GroupAnalyticPage] Failed to load group detail on the server", {
            locale: resolvedParams.locale,
            groupId: resolvedParams.groupId,
            status: response.status,
            code: response.code ?? null,
            message: response.message ?? null
        });

        return <ErrorDisplay message={response.message || "Unable to open this group's analytic page right now."} />;
    }

    if (!response.data) {
        console.error("[GroupAnalyticPage] Group detail response was missing data", {
            locale: resolvedParams.locale,
            groupId: resolvedParams.groupId,
            status: response.status
        });

        return <ErrorDisplay message="Unable to open this group's analytic page right now." />;
    }

    const normalizedRole = normalizeGroupRole(response.data.userRole);
    const canViewAnalytic =
        normalizedRole === "owner" ||
        normalizedRole === "moderator" ||
        normalizedRole === "member" ||
        normalizedRole === "commenter";

    if (!canViewAnalytic) {
        redirect(`/${resolvedParams.locale}/group-analytic-no-access?${nextParams.toString()}`);
    }

    return <GroupAnalyticPage />;
}

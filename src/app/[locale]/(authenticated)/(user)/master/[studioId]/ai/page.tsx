import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import StudioDetailPage from "@/components/features/studio/studio-detail/StudioDetailPage";

type StudioResponse = components["schemas"]["StudioResponse"];
type StudioGroupListResponse = components["schemas"]["StudioGroupListResponse"];

interface PageProps {
    params: Promise<{ locale: string; studioId: string }>;
}

export default async function StudioAiPage({ params }: PageProps) {
    const { locale, studioId } = await params;

    const [studioResponse, groupsResponse] = await Promise.all([
        serverFetchApi.GET<StudioResponse>(`/studio/${studioId}`),
        serverFetchApi.GET<StudioGroupListResponse>(`/studio/${studioId}/groups`)
    ]);

    if (studioResponse.status === "error") {
        console.error("[StudioAiPage] Failed to load studio on the server", {
            locale,
            studioId,
            status: studioResponse.status,
            code: studioResponse.code ?? null,
            message: studioResponse.message ?? null
        });

        return <ErrorDisplay message={studioResponse.message || "Unable to open this studio's AI page right now."} />;
    }

    if (!studioResponse.data) {
        console.error("[StudioAiPage] Studio response was missing data", {
            locale,
            studioId,
            status: studioResponse.status
        });

        return <ErrorDisplay message="Unable to open this studio's AI page right now." />;
    }

    const studioData = studioResponse.data;

    if (studioData.studioRole !== 0) {
        redirect(`/${locale}/master-ai-no-access?studioId=${encodeURIComponent(studioId)}`);
    }

    if (groupsResponse.status === "error") {
        console.error("[StudioAiPage] Failed to load studio groups on the server", {
            locale,
            studioId,
            status: groupsResponse.status,
            code: groupsResponse.code ?? null,
            message: groupsResponse.message ?? null
        });

        return <ErrorDisplay message={groupsResponse.message || "Unable to load this studio's groups right now."} />;
    }

    if (!groupsResponse.data) {
        console.error("[StudioAiPage] Studio groups response was missing data", {
            locale,
            studioId,
            status: groupsResponse.status
        });

        return <ErrorDisplay message="Unable to load this studio's groups right now." />;
    }

    const groupsData = groupsResponse.data.studioGroups ?? [];

    return (
        <StudioDetailPage
            initialStudio={studioData}
            initialGroups={groupsData}
            bannerUrl={studioData?.bannerUrl ?? null}
            colorHex={studioData?.colorHex ?? null}
            initialTab="ai"
        />
    );
}

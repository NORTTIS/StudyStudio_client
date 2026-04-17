import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import { components } from "@/api/types";
import StudioDetailPage from "@/components/features/studio/studio-detail/StudioDetailPage";

type StudioResponse = components["schemas"]["StudioResponse"];
type StudioGroupListResponse = components["schemas"]["StudioGroupListResponse"];

interface PageProps {
    params: Promise<{ locale: string; studioId: string }>;
}

export default async function StudioAnalyticsPage({ params }: PageProps) {
    const { locale, studioId } = await params;

    const [studioResponse, groupsResponse] = await Promise.all([
        serverFetchApi.GET<StudioResponse>(`/studio/${studioId}`),
        serverFetchApi.GET<StudioGroupListResponse>(`/studio/${studioId}/groups`)
    ]);

    const studioData = studioResponse.status === "success" ? studioResponse.data : null;

    if ((studioData?.studioRole ?? 1) !== 0) {
        redirect(`/${locale}/master-analytics-no-access?studioId=${encodeURIComponent(studioId)}`);
    }

    const groupsData =
        groupsResponse.status === "success" && groupsResponse.data?.studioGroups
            ? groupsResponse.data.studioGroups
            : [];

    return (
        <StudioDetailPage
            initialStudio={studioData}
            initialGroups={groupsData}
            bannerUrl={studioData?.bannerUrl ?? null}
            colorHex={studioData?.colorHex ?? null}
            initialTab="analytics"
        />
    );
}

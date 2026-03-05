import { serverFetchApi } from "@/api/server-client";
import { components } from "@/api/types";
import StudioDetailPage from "@/components/features/studio/studio-detail/StudioDetailPage";

type StudioResponse = components["schemas"]["StudioResponse"];
type StudioGroupListResponse = components["schemas"]["StudioGroupListResponse"];

interface PageProps {
    params: Promise<{ studioId: string }>;
}

export default async function StudioDetail({ params }: PageProps) {
    const { studioId } = await params;

    // Fetch studio details
    const studioResponse = await serverFetchApi.GET<StudioResponse>(`/studio/${studioId}`);
    const studioData = studioResponse.status === "success" ? studioResponse.data : null;
    console.log("Fetched studio details:", studioData);
    // Fetch studio groups
    const groupsResponse = await serverFetchApi.GET<StudioGroupListResponse>(`/studio/${studioId}/groups`);
    const groupsData =
        groupsResponse.status === "success" && groupsResponse.data?.studioGroups
            ? groupsResponse.data.studioGroups
            : [];
    console.log("Fetched studio groups:", groupsData);
    return <StudioDetailPage initialStudio={studioData} initialGroups={groupsData} />;
}

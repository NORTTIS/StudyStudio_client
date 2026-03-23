import { serverFetchApi } from "@/api/server-client";
import { components } from "@/api/types";
import AIMaster from "@/components/features/studio/studio-detail/AIMaster";

type StudioResponse = components["schemas"]["StudioResponse"];

interface PageProps {
    params: Promise<{ studioId: string }>;
}

export default async function AIMasterPage({ params }: PageProps) {
    const { studioId } = await params;

    // Fetch studio details
    const studioResponse = await serverFetchApi.GET<StudioResponse>(`/studio/${studioId}`);
    const studioData = studioResponse.status === "success" ? studioResponse.data : null;

    return <AIMaster initialStudio={studioData} />;
}

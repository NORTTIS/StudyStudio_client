import { GroupTaskDeepLinkPage } from "@/components/features/group/task/GroupTaskDeepLinkPage";

export default async function Page({
    params
}: {
    params: Promise<{ taskId: string }>;
}) {
    const resolvedParams = await params;

    return <GroupTaskDeepLinkPage taskId={resolvedParams.taskId} />;
}

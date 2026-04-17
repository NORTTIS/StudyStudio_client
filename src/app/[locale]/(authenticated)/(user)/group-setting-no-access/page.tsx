import { GroupSettingAccessDeniedPage } from "@/components/features/group/setting/GroupSettingAccessDeniedPage";

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ groupId?: string; fromStudioId?: string }>;
}) {
    const resolvedSearchParams = await searchParams;

    return (
        <GroupSettingAccessDeniedPage
            groupId={resolvedSearchParams.groupId}
            fromStudioId={resolvedSearchParams.fromStudioId}
        />
    );
}

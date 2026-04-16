import { GroupSettingAccessDeniedPage } from "@/components/features/group/setting/GroupSettingAccessDeniedPage";

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ groupId?: string; fromStudioId?: string }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const isVi = resolvedParams.locale.startsWith("vi");

    return (
        <GroupSettingAccessDeniedPage
            groupId={resolvedSearchParams.groupId}
            fromStudioId={resolvedSearchParams.fromStudioId}
            title={isVi ? "Bạn không có thẩm quyền" : "You do not have permission"}
            description={
                isVi
                    ? "Bạn không có quyền truy cập trang AI của nhóm này."
                    : "You do not have permission to access this group's AI page."
            }
            buttonLabel={isVi ? "Quay lại nhóm" : "Back to group"}
        />
    );
}

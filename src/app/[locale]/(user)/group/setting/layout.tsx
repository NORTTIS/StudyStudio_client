import { GroupStudioHeader } from "@/components/features/group/setting/GroupStudioHeader";

export default function GroupSettingLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white">
            <GroupStudioHeader />
            {children}
        </div>
    );
}
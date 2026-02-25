import * as React from "react";
import { GroupStudioHeader } from "@/components/features/group/setting/GroupStudioHeader";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <GroupStudioHeader />
            {children}
        </div>
    );
}
"use client";

import * as React from "react";
import { GroupShell } from "@/components/features/group/GroupShell";

export default function Layout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ groupId: string }>;
}) {
    const resolvedParams = React.use(params);

    return <GroupShell groupId={resolvedParams.groupId}>{children}</GroupShell>;
}

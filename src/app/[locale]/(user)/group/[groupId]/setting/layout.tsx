import * as React from "react";

export default function GroupSettingLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <div className="min-h-screen bg-white">{children}</div>;
}
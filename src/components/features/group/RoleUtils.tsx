import { Crown, Shield, User, MessageCircle, Eye } from "lucide-react";
import React from "react";

type MemberRole = "Owner" | "Moderator" | "Member" | "Commenter" | "Viewer";
type GroupRole = "owner" | "moderator" | "member" | "commenter" | "viewer";

export const roleDisplayText: Record<GroupRole, string> = {
    owner: "Chủ sở hữu",
    moderator: "Điều phối viên",
    member: "Thành viên",
    commenter: "Người bình luận",
    viewer: "Người xem"
};

export function getRoleIcon(role: MemberRole | GroupRole): React.ReactNode {
    const iconProps = { className: "h-4 w-4" };

    const rolesLower = String(role).toLowerCase();

    if (rolesLower === "owner") {
        return <Crown {...iconProps} />;
    }
    if (rolesLower === "moderator") {
        return <Shield {...iconProps} />;
    }
    if (rolesLower === "member") {
        return <User {...iconProps} />;
    }
    if (rolesLower === "commenter") {
        return <MessageCircle {...iconProps} />;
    }
    if (rolesLower === "viewer") {
        return <Eye {...iconProps} />;
    }

    return null;
}

export function getRoleColor(role: MemberRole | GroupRole): {
    bg: string;
    text: string;
    border: string;
} {
    const rolesLower = String(role).toLowerCase();

    if (rolesLower === "owner") {
        return {
            bg: "bg-orange-50",
            text: "text-orange-700",
            border: "border-orange-200"
        };
    }
    if (rolesLower === "moderator") {
        return {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200"
        };
    }
    if (rolesLower === "member") {
        return {
            bg: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200"
        };
    }
    if (rolesLower === "commenter") {
        return {
            bg: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200"
        };
    }
    if (rolesLower === "viewer") {
        return {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200"
        };
    }

    return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200"
    };
}

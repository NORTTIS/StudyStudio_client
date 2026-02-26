export type GroupRole = "owner" | "moderator" | "member" | "commenter" | "viewer";

export type Group = {
    id: string;
    title: string;
    shortCode?: string;
    tag?: string;
    description: string;
    role: GroupRole;
    membersCount: number;
    tasksCount: number;
    createdByInitials: string;
    memberInitials: string[];
    isStarred?: boolean;
};

export type GroupsPageData = {
    usage: { current: number; max: number };
    favorites: Group[];
    managed: Group[];
    independent: Group[];
};

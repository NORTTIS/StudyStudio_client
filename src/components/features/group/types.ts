import type { components } from "@/api/types";

// Use OpenAPI types via components["schemas"]
export type GroupCardDto = components["schemas"]["GroupCardDto"];
export type MemberPreviewDto = components["schemas"]["MemberPreviewDto"];

export type GroupRole = "owner" | "moderator" | "member" | "commenter" | "viewer";

export type GroupsPageData = {
    usage: { current: number; max: number };
    favorites: GroupCardDto[];
    managed: GroupCardDto[];
    independent: GroupCardDto[];
    pending: GroupCardDto[];
    joined: GroupCardDto[];
};

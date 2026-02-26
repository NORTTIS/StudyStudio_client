import type { StudioUI } from "@/api/studios";

export const mockStudios: StudioUI[] = [
    {
        id: "SEP490-G62",
        name: "Manh - Test",
        description: "Capstone Project - Study Studio Application",
        type: "group",
        memberCount: 6,
        groupCount: 3,
        completionProgress: 37.34,
        createdAt: "2024-01-15T08:00:00Z",
        updatedAt: "2024-02-20T10:30:00Z"
    },
    {
        id: "SEP490-G60",
        name: "Healthcare Project",
        description: "E-Commerce Platform",
        type: "group",
        memberCount: 8,
        groupCount: 2,
        completionProgress: 65.5,
        createdAt: "2024-01-10T09:00:00Z",
        updatedAt: "2024-02-18T14:20:00Z"
    },
    {
        id: "SEP490-G61",
        name: "AI Project",
        description: "Retail Management System",
        type: "group",
        memberCount: 10,
        groupCount: 4,
        completionProgress: 82.1,
        createdAt: "2024-01-12T10:00:00Z",
        updatedAt: "2024-02-19T16:45:00Z"
    }
];

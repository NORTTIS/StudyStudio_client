import type { StudioUI } from "@/api/studios";

export const mockStudios: StudioUI[] = [
    {
        id: "1",
        name: "Marketing Team",
        description: "Quản lý các chiến dịch marketing và nội dung",
        type: "group",
        memberCount: 12,
        groupCount: 3,
        completionProgress: 75,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-03-10T15:30:00Z",
        studioRole: 0,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        avatarUrl: null,
        colorHex: "#667eea"
    },
    {
        id: "2",
        name: "Design Studio",
        description: "Team thiết kế đồ họa và UX/UI",
        type: "group",
        memberCount: 8,
        groupCount: 2,
        completionProgress: 60,
        createdAt: "2024-02-01T09:00:00Z",
        updatedAt: "2024-03-08T11:20:00Z",
        studioRole: 0,
        startDate: "2024-02-01",
        endDate: "2024-06-30",
        avatarUrl: null,
        colorHex: "#f093fb"
    },
    {
        id: "3",
        name: "Development",
        description: "Phát triển sản phẩm và ứng dụng",
        type: "group",
        memberCount: 15,
        groupCount: 4,
        completionProgress: 45,
        createdAt: "2024-01-20T14:00:00Z",
        updatedAt: "2024-03-12T09:45:00Z",
        studioRole: 1,
        startDate: "2024-01-15",
        endDate: null,
        avatarUrl: null,
        colorHex: "#43e97b"
    }
];

import type { StudioListItem } from "@/api/admin-studios";

/**
 * Mock data for testing Studios management
 * Use this when backend is not available
 */

export const mockStudiosSummary = {
    totalStudios: 25,
    activeStudios: 20,
    inactiveStudios: 5,
    totalMembers: 450,
    totalGroups: 85
};

export const mockStudios: StudioListItem[] = [
    {
        studioId: "studio-001",
        studioName: "Khoa Công nghệ Thông tin - HCMUT",
        description: "Studio quản lý các lớp học và nhóm nghiên cứu của Khoa CNTT",
        ownerName: "TS. Nguyễn Văn A",
        ownerEmail: "nguyenvana@hcmut.edu.vn",
        groupCount: 15,
        memberCount: 120,
        taskCount: 450,
        createdAt: "2024-01-15T08:00:00Z",
        lastActivityAt: "2026-04-04T10:30:00Z",
        isActive: true
    },
    {
        studioId: "studio-002",
        studioName: "IELTS Study Hub",
        description: "Cộng đồng học IELTS với các nhóm luyện thi theo band điểm",
        ownerName: "Trần Thị B",
        ownerEmail: "tranthib@gmail.com",
        groupCount: 8,
        memberCount: 65,
        taskCount: 230,
        createdAt: "2024-03-20T10:00:00Z",
        lastActivityAt: "2026-04-04T09:15:00Z",
        isActive: true
    },
    {
        studioId: "studio-003",
        studioName: "AI Research Lab",
        description: "Nhóm nghiên cứu về Trí tuệ nhân tạo và Machine Learning",
        ownerName: "PGS. Lê Minh C",
        ownerEmail: "leminhc@university.edu.vn",
        groupCount: 5,
        memberCount: 25,
        taskCount: 180,
        createdAt: "2023-09-10T14:00:00Z",
        lastActivityAt: "2026-04-03T22:45:00Z",
        isActive: true
    },
    {
        studioId: "studio-004",
        studioName: "Startup Incubator 2026",
        description: "Không gian hỗ trợ các nhóm startup sinh viên",
        ownerName: "Phạm Văn D",
        ownerEmail: "phamvand@startup.vn",
        groupCount: 12,
        memberCount: 48,
        taskCount: 320,
        createdAt: "2025-11-01T09:00:00Z",
        lastActivityAt: "2026-04-04T08:20:00Z",
        isActive: true
    },
    {
        studioId: "studio-005",
        studioName: "Design Thinking Workshop",
        description: "Studio dành cho các khóa học về Design Thinking",
        ownerName: "Hoàng Thị E",
        ownerEmail: "hoangthie@design.edu",
        groupCount: 6,
        memberCount: 42,
        taskCount: 150,
        createdAt: "2025-08-15T11:00:00Z",
        lastActivityAt: "2026-04-02T16:30:00Z",
        isActive: true
    },
    {
        studioId: "studio-006",
        studioName: "Blockchain Development",
        description: "Nhóm học và phát triển ứng dụng Blockchain",
        ownerName: "Vũ Minh F",
        ownerEmail: "vuminhf@blockchain.io",
        groupCount: 4,
        memberCount: 18,
        taskCount: 95,
        createdAt: "2025-12-01T13:00:00Z",
        lastActivityAt: "2026-04-01T19:00:00Z",
        isActive: false
    },
    {
        studioId: "studio-007",
        studioName: "Digital Marketing Academy",
        description: "Học viện đào tạo Digital Marketing cho sinh viên",
        ownerName: "Đỗ Thị G",
        ownerEmail: "dothig@marketing.vn",
        groupCount: 10,
        memberCount: 85,
        taskCount: 380,
        createdAt: "2024-06-10T10:00:00Z",
        lastActivityAt: "2026-04-04T11:45:00Z",
        isActive: true
    },
    {
        studioId: "studio-008",
        studioName: "Mobile App Development",
        description: "Studio phát triển ứng dụng di động iOS & Android",
        ownerName: "Bùi Văn H",
        ownerEmail: "buivanh@appdev.com",
        groupCount: 7,
        memberCount: 32,
        taskCount: 210,
        createdAt: "2025-02-14T15:00:00Z",
        lastActivityAt: "2026-04-03T14:20:00Z",
        isActive: true
    },
    {
        studioId: "studio-009",
        studioName: "Data Science Bootcamp",
        description: "Bootcamp đào tạo Data Science từ cơ bản đến nâng cao",
        ownerName: "Lý Thị I",
        ownerEmail: "lythii@datascience.edu",
        groupCount: 9,
        memberCount: 72,
        taskCount: 290,
        createdAt: "2024-10-05T09:30:00Z",
        lastActivityAt: "2026-04-04T07:50:00Z",
        isActive: true
    },
    {
        studioId: "studio-010",
        studioName: "Game Development Studio",
        description: "Phát triển game indie và học lập trình game",
        ownerName: "Trương Văn K",
        ownerEmail: "truongvank@gamedev.vn",
        groupCount: 5,
        memberCount: 28,
        taskCount: 165,
        createdAt: "2025-04-20T12:00:00Z",
        lastActivityAt: "2026-03-30T20:15:00Z",
        isActive: false
    }
];

/**
 * Simulate API response
 */
export function getMockStudiosResponse(pageNumber = 1, pageSize = 10, searchTerm = "") {
    let filteredStudios = mockStudios;

    // Apply search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredStudios = mockStudios.filter(
            (s) =>
                s.studioName?.toLowerCase().includes(term) ||
                s.ownerName?.toLowerCase().includes(term) ||
                s.ownerEmail?.toLowerCase().includes(term) ||
                s.description?.toLowerCase().includes(term)
        );
    }

    // Apply pagination
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedStudios = filteredStudios.slice(startIndex, endIndex);

    return {
        status: "success",
        code: "SUCCESS",
        message: "Lấy danh sách studios thành công",
        data: {
            summary: mockStudiosSummary,
            studioList: paginatedStudios,
            pageNumber,
            pageSize,
            totalCount: filteredStudios.length,
            totalPages: Math.ceil(filteredStudios.length / pageSize)
        }
    };
}

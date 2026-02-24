import type { Studio } from "@/api/studios";

export const mockStudios: Studio[] = [
  {
    id: "SEP490-G62",
    name: "SEP490-G62",
    description: "Capstone Project - Study Studio Application",
    type: "group",
    memberCount: 4,
    videoCount: 7,
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-02-20T10:30:00Z"
  },
  {
    id: "SEP490-G60",
    name: "SEP490-G60",
    description: "Healthcare Project - E-Commerce Platform",
    type: "group",
    memberCount: 5,
    videoCount: 12,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-02-18T14:20:00Z"
  },
  {
    id: "SEP490-G61",
    name: "SEP490-G61",
    description: "AI Project - Retail Management System",
    type: "group",
    memberCount: 6,
    videoCount: 8,
    createdAt: "2024-01-12T10:00:00Z",
    updatedAt: "2024-02-19T16:45:00Z"
  }
];

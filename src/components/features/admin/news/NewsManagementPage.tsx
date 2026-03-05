"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { CreateNewsModal } from "./CreateNewsModal";
import { EditNewsModal } from "./EditNewsModal";
import { DeleteNewsModal } from "./DeleteNewsModal";

type News = {
    id: string;
    title: string;
    content: string;
    type: "System" | "Update" | "Maintenance" | "Announcement";
    status: "Published" | "Draft" | "Archived";
    priority: "Low" | "Normal" | "High" | "Urgent";
    author: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

export function NewsManagementPage() {
    const t = useTranslations("AdminNews");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "archived">("all");
    const [filterType, setFilterType] = useState<"all" | "system" | "update" | "maintenance" | "announcement">("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState<News | null>(null);
    const [deletingNews, setDeletingNews] = useState<News | null>(null);

    // Mock data
    const newsList: News[] = [
        {
            id: "1",
            title: "System Maintenance Scheduled",
            content: "We will be performing scheduled maintenance on March 10, 2024 from 2:00 AM to 4:00 AM UTC. During this time, the system may be temporarily unavailable.",
            type: "Maintenance",
            status: "Published",
            priority: "High",
            author: "Admin Team",
            createdAt: "2024-03-05",
            updatedAt: "2024-03-05",
            publishedAt: "2024-03-05"
        },
        {
            id: "2",
            title: "New Features Released",
            content: "We're excited to announce new features including dark mode, advanced search, and improved performance. Check out the changelog for more details.",
            type: "Update",
            status: "Published",
            priority: "Normal",
            author: "Product Team",
            createdAt: "2024-03-04",
            updatedAt: "2024-03-04",
            publishedAt: "2024-03-04"
        },
        {
            id: "3",
            title: "Security Update Available",
            content: "A critical security update is now available. Please update your application to the latest version to ensure your data remains secure.",
            type: "System",
            status: "Published",
            priority: "Urgent",
            author: "Security Team",
            createdAt: "2024-03-03",
            updatedAt: "2024-03-03",
            publishedAt: "2024-03-03"
        },
        {
            id: "4",
            title: "Welcome to Study Studio",
            content: "Welcome to our platform! This is a draft announcement that will be published soon with tips for getting started.",
            type: "Announcement",
            status: "Draft",
            priority: "Low",
            author: "Admin Team",
            createdAt: "2024-03-02",
            updatedAt: "2024-03-02",
            publishedAt: null
        },
        {
            id: "5",
            title: "Holiday Schedule",
            content: "Our support team will have limited availability during the holiday season. Emergency support will still be available 24/7.",
            type: "Announcement",
            status: "Archived",
            priority: "Normal",
            author: "Support Team",
            createdAt: "2024-02-15",
            updatedAt: "2024-02-20",
            publishedAt: "2024-02-15"
        }
    ];

    const filteredNews = newsList.filter((news) => {
        const matchesSearch =
            news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            news.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            news.author.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            filterStatus === "all" || news.status.toLowerCase() === filterStatus;

        const matchesType =
            filterType === "all" || news.type.toLowerCase() === filterType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Published":
                return "bg-green-100 text-green-700";
            case "Draft":
                return "bg-yellow-100 text-yellow-700";
            case "Archived":
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Urgent":
                return "bg-red-100 text-red-700";
            case "High":
                return "bg-orange-100 text-orange-700";
            case "Normal":
                return "bg-blue-100 text-blue-700";
            case "Low":
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const stats = {
        total: newsList.length,
        published: newsList.filter(n => n.status === "Published").length,
        draft: newsList.filter(n => n.status === "Draft").length,
        archived: newsList.filter(n => n.status === "Archived").length
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />

                    <div className="px-6 py-6">
                        {/* Page Header */}
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
                                <p className="text-[#6F6B99] text-sm">{t("subtitle")}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-[#FF5F3D] px-4 py-2 text-white hover:bg-[#ff4620] transition-colors">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="font-medium">{t("createButton")}</span>
                            </button>
                        </div>

                        {/* Stats Cards */}
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("totalNews")}</p>
                                <p className="font-bold text-2xl text-[#261E33]">{stats.total}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("published")}</p>
                                <p className="font-bold text-2xl text-green-600">{stats.published}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("draft")}</p>
                                <p className="font-bold text-2xl text-yellow-600">{stats.draft}</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-5">
                                <p className="mb-2 text-[#6F6B99] text-sm">{t("archived")}</p>
                                <p className="font-bold text-2xl text-gray-600">{stats.archived}</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="relative flex-1 max-w-md">
                                <input
                                    type="text"
                                    placeholder={t("searchPlaceholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20"
                                />
                                <svg
                                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as any)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                    <option value="all">{t("filters.allTypes")}</option>
                                    <option value="system">{t("filters.system")}</option>
                                    <option value="update">{t("filters.update")}</option>
                                    <option value="maintenance">{t("filters.maintenance")}</option>
                                    <option value="announcement">{t("filters.announcement")}</option>
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/20">
                                    <option value="all">{t("filters.allStatus")}</option>
                                    <option value="published">{t("filters.published")}</option>
                                    <option value="draft">{t("filters.draft")}</option>
                                    <option value="archived">{t("filters.archived")}</option>
                                </select>
                            </div>
                        </div>

                        {/* News Table */}
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#F8F8F8]">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.title")}</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.type")}</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.priority")}</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.status")}</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.author")}</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.date")}</th>
                                            <th className="px-6 py-4 text-left font-semibold text-[#261E33] text-sm">{t("table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredNews.map((news) => (
                                            <tr key={news.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-[#261E33] text-sm">{news.title}</p>
                                                    <p className="text-[#6F6B99] text-xs line-clamp-1">{news.content}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[#261E33] text-xs">
                                                        {news.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(news.priority)}`}>
                                                        {news.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(news.status)}`}>
                                                        {news.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[#6F6B99] text-sm">{news.author}</td>
                                                <td className="px-6 py-4 text-[#6F6B99] text-sm">{news.createdAt}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingNews(news)}
                                                            className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm font-medium">
                                                            {t("table.edit")}
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingNews(news)}
                                                            className="cursor-pointer text-red-600 hover:text-red-700 text-sm font-medium">
                                                            {t("table.delete")}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredNews.length === 0 && (
                                <div className="py-12 text-center">
                                    <p className="text-[#6F6B99]">{t("noNews")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Modals */}
            {isCreateModalOpen && (
                <CreateNewsModal onClose={() => setIsCreateModalOpen(false)} />
            )}
            {editingNews && (
                <EditNewsModal news={editingNews} onClose={() => setEditingNews(null)} />
            )}
            {deletingNews && (
                <DeleteNewsModal news={deletingNews} onClose={() => setDeletingNews(null)} />
            )}
        </div>
    );
}

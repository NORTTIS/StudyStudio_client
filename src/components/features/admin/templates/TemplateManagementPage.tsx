"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateTemplateModal } from "./CreateTemplateModal";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { getTemplates, type TemplateListItem } from "@/api/admin-templates";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/Header";
import { LayoutTemplate } from "lucide-react";

type FilterStatus = "all" | "active" | "inactive";

export function TemplateManagementPage() {
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [detailModalId, setDetailModalId] = useState<string | null>(null);

    const total = templates.length;
    const activeCount = templates.filter((t) => t.isActive).length;
    const inactiveCount = total - activeCount;

    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getTemplates("vi");
            if (result.status === "success" && result.data) {
                // Chỉ hiển thị system templates (do admin tạo)
                const systemTemplates = result.data.filter((t) => t.isSystemTemplate);

                // Fetch group detail cho mỗi template để lấy taskStatuses, banner, color
                // bannerUrl, colorHex, groupTaskStatuses đã có trong TemplateResponse
                const enriched: TemplateListItem[] = systemTemplates.map((t) => ({
                    ...t,
                    bannerUrl: t.bannerUrl ?? null,
                    colorHex: t.colorHex ?? null,
                    taskStatuses: (t.groupTaskStatuses ?? []).map((s) => ({
                        statusId: s.statusId,
                        statusName: s.statusName ?? "",
                        position: s.position ?? 0
                    }))
                }));

                setTemplates(enriched);
            } else {
                setError(result.message || "Không thể tải danh sách template");
                setTemplates([]);
            }
        } catch {
            setError("Có lỗi xảy ra khi tải template");
            setTemplates([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    const filteredTemplates = templates.filter((t) => {
        const matchesSearch =
            !search ||
            (t.groupName?.toLowerCase().includes(search.toLowerCase())) ||
            (t.groupDescription?.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "active" && t.isActive) ||
            (filterStatus === "inactive" && !t.isActive);

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-[#F8F8F8] font-[family-name:var(--font-app-inter)]">
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1">
                    <Header userProfile={null} />
                    <div className="px-6 py-6 space-y-6">

                        {/* Page header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="font-bold text-2xl text-[#261E33] leading-tight">Quản lý Template</h1>
                                <p className="mt-1 text-sm text-[#6F6B99]">Tạo và quản lý các template nhóm học tập cho người dùng</p>
                            </div>
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-[#FF5F3D] text-white hover:bg-[#ff4620] shadow-sm active:scale-[0.98] transition-all duration-150 gap-2 text-sm px-4 py-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tạo mới
                            </Button>
                        </div>

                        {/* Stats cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-[#6F6B99]">Tổng số</p>
                                        <p className="mt-2 font-bold text-3xl text-[#261E33]">{total}</p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8F8F8]">
                                        <LayoutTemplate className="h-6 w-6 text-[#6F6B99]" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-[#6F6B99]">Đang hoạt động</p>
                                        <p className="mt-2 font-bold text-3xl text-emerald-600">{activeCount}</p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                                        <svg className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-[#6F6B99]">Chưa kích hoạt</p>
                                        <p className="mt-2 font-bold text-3xl text-amber-600">{inactiveCount}</p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                                        <svg className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filter bar */}
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <svg
                                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6B99]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm kiếm template..."
                                    className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-10 pr-4 text-sm text-[#261E33] placeholder:text-[#6F6B99]/60 focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/10 transition-colors duration-150"
                                />
                            </div>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                                className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#261E33] focus:border-[#FF5F3D] focus:outline-none focus:ring-2 focus:ring-[#FF5F3D]/10 transition-colors duration-150 cursor-pointer"
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Chưa kích hoạt</option>
                            </select>

                            <span className="text-sm text-[#6F6B99] whitespace-nowrap">
                                {filteredTemplates.length} template
                            </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <svg className="h-10 w-10 animate-spin text-[#FF5F3D]" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <svg className="h-12 w-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="font-medium text-[#261E33]">{error}</p>
                                    <button onClick={loadTemplates} className="mt-3 text-sm text-[#FF5F3D] hover:underline">
                                        Thử lại
                                    </button>
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8F8F8]">
                                        <LayoutTemplate className="h-8 w-8 text-[#6F6B99]" />
                                    </div>
                                    <p className="font-semibold text-[#261E33]">Chưa có template nào</p>
                                    <p className="mt-1 text-sm text-[#6F6B99]">Tạo template đầu tiên để bắt đầu</p>
                                    <Button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="mt-4 bg-[#FF5F3D] text-white hover:bg-[#ff4620] text-sm px-4 py-2">
                                        Tạo mới
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                                                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Tên template</th>
                                                <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Ảnh mô tả</th>
                                                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Mô tả</th>
                                                <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Cột Kanban</th>
                                                <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Trạng thái</th>
                                                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Ngày tạo</th>
                                                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#6F6B99]">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E5E5E5]">
                                            {filteredTemplates.map((t) => (
                                                <tr
                                                    key={t.templateId}
                                                    className="group cursor-pointer transition-colors duration-100 hover:bg-[#FAFAFA]"
                                                    onClick={() => setDetailModalId(t.templateId ?? "")}
                                                >
                                                    {/* Name */}
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-sm text-[#261E33]">{t.groupName}</span>
                                                    </td>

                                                    {/* Background image */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center">
                                                            {t.bannerUrl ? (
                                                                <div className="relative h-9 w-14 overflow-hidden rounded-lg border border-[#E5E5E5]">
                                                                    <img
                                                                        src={t.bannerUrl}
                                                                        alt={t.groupName ?? "banner"}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] bg-[#F8F8F8]">
                                                                    <svg className="h-4 w-4 text-[#6F6B99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Description */}
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-[#6F6B99] line-clamp-2">
                                                            {t.groupDescription || "Không có mô tả"}
                                                        </span>
                                                    </td>

                                                    {/* Kanban columns */}
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center rounded-full bg-[#F8F8F8] px-2.5 py-1 text-xs font-semibold text-[#6F6B99]">
                                                            {t.taskStatuses.length} cột
                                                        </span>
                                                    </td>

                                                    {/* Status badge */}
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                                            t.isActive
                                                                ? "bg-emerald-50 text-emerald-600"
                                                                : "bg-amber-50 text-amber-600"
                                                        }`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                            {t.isActive ? "Đang hoạt động" : "Chưa kích hoạt"}
                                                        </span>
                                                    </td>

                                                    {/* Created at */}
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-[#6F6B99]">
                                                            {t.createdAt
                                                                ? new Date(t.createdAt).toLocaleDateString("vi-VN", {
                                                                    year: "numeric",
                                                                    month: "short",
                                                                    day: "numeric"
                                                                })
                                                                : "-"}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 transition-opacity duration-100 group-hover:opacity-100">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDetailModalId(t.templateId ?? ""); }}
                                                                title="Xem chi tiết"
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6F6B99] transition-colors duration-150 hover:bg-[#F8F8F8] hover:text-[#261E33]"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Modals */}
            {isCreateModalOpen && (
                <CreateTemplateModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => { setIsCreateModalOpen(false); loadTemplates(); }}
                    locale="vi"
                />
            )}

            {detailModalId && (
                <TemplateDetailModal
                    templateId={detailModalId}
                    onClose={() => setDetailModalId(null)}
                    onSuccess={() => { setDetailModalId(null); loadTemplates(); }}
                    locale="vi"
                />
            )}
        </div>
    );
}

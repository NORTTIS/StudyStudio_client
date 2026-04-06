"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BannerUpload } from "@/components/ui/banner-upload";
import { TaskStatusEditor, type TaskStatusItem } from "./TaskStatusEditor";
import {
    getTemplateById,
    updateTemplate,
    inactiveTemplate,
    hardDeleteTemplate,
    type TemplateResponse
} from "@/api/admin-templates";
import { useToast } from "@/hooks/use-toast";
import { X, LayoutTemplate, CheckCircle2, XCircle, Trash2, Ban } from "lucide-react";

interface TemplateDetailModalProps {
    templateId: string;
    onClose: () => void;
    onSuccess: () => void;
    locale?: string;
}

const FALLBACK_STATUSES: TaskStatusItem[] = [];

function adjustColor(hex: string, amount: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const num = parseInt(hex.replace("#", ""), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0xff) + amount);
    const b = clamp((num & 0xff) + amount);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function TemplateDetailModal({
    templateId,
    onClose,
    onSuccess,
    locale = "vi"
}: TemplateDetailModalProps) {
    const { toast } = useToast();

    const toastRef = useRef(toast);
    const onCloseRef = useRef(onClose);
    const onSuccessRef = useRef(onSuccess);
    toastRef.current = toast;
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;

    const [template, setTemplate] = useState<TemplateResponse | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isInactivating, setIsInactivating] = useState(false);
    const [isHardDeleting, setIsHardDeleting] = useState(false);
    const [taskStatuses, setTaskStatuses] = useState<TaskStatusItem[]>(FALLBACK_STATUSES);

    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editBannerUrl, setEditBannerUrl] = useState<string | null>(null);
    const [nameError, setNameError] = useState(false);

    const loadTemplate = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getTemplateById(templateId, locale);
            if (result.status === "success" && result.data) {
                const t = result.data;
                setTemplate(t);
                setEditName(t.groupName ?? "");
                setEditDescription(t.groupDescription ?? "");
                setEditBannerUrl(t.bannerUrl ?? null);

                // groupTaskStatuses, bannerUrl, colorHex đã có trong TemplateResponse
                if (t.groupTaskStatuses && t.groupTaskStatuses.length > 0) {
                    setTaskStatuses(t.groupTaskStatuses.map((s) => ({
                        statusId: s.statusId,
                        statusName: s.statusName ?? "",
                        position: s.position ?? 0
                    })));
                } else {
                    setTaskStatuses(FALLBACK_STATUSES);
                }
            } else {
                toastRef.current({ description: result.message || "Không thể tải template.", variant: "destructive" });
                onCloseRef.current();
            }
        } catch {
            toastRef.current({ description: "Có lỗi xảy ra khi tải template.", variant: "destructive" });
            onCloseRef.current();
        } finally {
            setIsLoading(false);
        }
    }, [templateId, locale]);

    useEffect(() => { loadTemplate(); }, [loadTemplate]);

    const handleToggleActive = async () => {
        const activate = !isActive;
        setIsSaving(true);
        try {
            const result = await updateTemplate(templateId, { groupId: template?.groupId ?? "", isActive: activate }, locale);
            if (result.status === "success" && result.data) {
                setTemplate(result.data);
                toastRef.current({
                    description: activate
                        ? "Template đã được kích hoạt."
                        : "Template đã bị vô hiệu hóa."
                });
                onSuccessRef.current();
            } else {
                toastRef.current({ description: result.message, variant: "destructive" });
            }
        } catch {
            toastRef.current({ description: "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) {
            setNameError(true);
            return;
        }
        setIsSaving(true);
        setNameError(false);
        try {
            const result = await updateTemplate(templateId, {
                groupId: template?.groupId ?? "",
                groupName: editName.trim(),
                groupDescription: editDescription.trim() || undefined,
                groupTaskStatuses: taskStatuses,
                bannerUrl: editBannerUrl
            }, locale);
            if (result.status === "success" && result.data) {
                setTemplate(result.data);
                setIsEditing(false);
                toastRef.current({ description: "Đã cập nhật template." });
                onSuccessRef.current();
            } else {
                toastRef.current({ description: result.message, variant: "destructive" });
            }
        } catch {
            toastRef.current({ description: "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInactive = async () => {
        const confirmed = window.confirm(
            locale === "vi"
                ? "Bạn có muốn vô hiệu hóa template này?"
                : "Are you sure you want to deactivate this template?"
        );
        if (!confirmed) return;

        setIsInactivating(true);
        try {
            const result = await inactiveTemplate(templateId, locale);
            if (result.status === "success") {
                toastRef.current({ description: "Template đã được vô hiệu hóa." });
                onSuccessRef.current();
                onCloseRef.current();
            } else {
                toastRef.current({ description: result.message, variant: "destructive" });
            }
        } catch {
            toastRef.current({ description: "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setIsInactivating(false);
        }
    };

    const handleHardDelete = async () => {
        const confirmed = window.confirm(
            locale === "vi"
                ? "Bạn có chắc muốn XÓA VĨNH VIỄN template này? Hành động này không thể hoàn tác."
                : "Are you sure you want to PERMANENTLY DELETE this template? This action cannot be undone."
        );
        if (!confirmed) return;

        const doubleConfirm = window.confirm(
            locale === "vi"
                ? "Cần chắc chắn! Tất cả dữ liệu (template, nhóm, cột Kanban) sẽ bị xóa vĩnh viễn. Tiếp tục?"
                : "Are you absolutely sure? All data will be permanently deleted. Continue?"
        );
        if (!doubleConfirm) return;

        setIsHardDeleting(true);
        try {
            const result = await hardDeleteTemplate(templateId, locale);
            if (result.status === "success") {
                toastRef.current({ description: "Template đã bị xóa vĩnh viễn." });
                onSuccessRef.current();
                onCloseRef.current();
            } else {
                toastRef.current({ description: result.message, variant: "destructive" });
            }
        } catch {
            toastRef.current({ description: "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setIsHardDeleting(false);
        }
    };

    const isActive = template?.isActive ?? false;
    const bannerColor = template?.colorHex ?? "#FF5722";
    const bannerGradient = `linear-gradient(135deg, ${bannerColor} 0%, ${adjustColor(bannerColor, -20)} 100%)`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            style={{ animation: "modal-fade-in 200ms ease both" }}
        >
            <style>{`
                @keyframes modal-fade-in {
                    from { opacity: 0; transform: scale(0.97); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div
                className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden overflow-y-auto rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl"
                style={{ animation: "modal-fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
            >
                {/* ── Sticky Header ───────────────────────────────────── */}
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E5E5] bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8F8F8]">
                            <LayoutTemplate className="h-5 w-5 text-[#FF5722]" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-[#6F6B99]">
                                {locale === "vi" ? "Admin" : "Admin"}
                            </p>
                            <h2 className="font-bold text-base text-[#261E33] leading-tight">
                                {locale === "vi" ? "Chi tiết Template" : "Template Details"}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && template && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="bg-[#FF5722] text-white hover:bg-[#e64a19] text-xs px-4 py-1.5 h-8 gap-1.5 shadow-sm transition-all duration-150 active:scale-[0.97]"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                {locale === "vi" ? "Sửa" : "Edit"}
                            </Button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#6F6B99] transition-all duration-150 hover:bg-[#F8F8F8] hover:text-[#261E33]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <svg className="h-10 w-10 animate-spin text-[#FF5722]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : template ? (
                    <div className="pb-0">
                        {/* ── Banner Section ──────────────────────────────── */}
                        <div
                            className="relative h-40 w-full overflow-hidden"
                            style={{ background: isEditing ? undefined : bannerGradient }}
                        >
                            {isEditing ? (
                                <BannerUpload
                                    entityType="group"
                                    entityId={template?.groupId ?? templateId}
                                    bannerUrl={editBannerUrl}
                                    colorHex={template?.colorHex ?? "#FF5722"}
                                    onUploadSuccess={(url) => setEditBannerUrl(url)}
                                    onDeleteSuccess={() => setEditBannerUrl(null)}
                                    onError={(msg) => toastRef.current({ description: msg, variant: "destructive" })
                                    
                                }
                                />
                            ) : (
                                <>
                                    {template.bannerUrl && (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${template.bannerUrl})` }}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black/20" />

                                    {/* Overlay info */}
                                    <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                                        <h1 className="font-bold text-2xl text-white drop-shadow-sm">
                                            {template.groupName}
                                        </h1>
                                        {template.groupDescription && (
                                            <p className="mt-0.5 text-sm text-white/80 line-clamp-1">
                                                {template.groupDescription}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Status chip */}
                            <div className="absolute top-4 right-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                                    isActive
                                        ? "bg-emerald-500/90 text-white"
                                        : "bg-amber-500/90 text-white"
                                }`}>
                                    <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-200" : "bg-amber-200"}`} />
                                    {isActive
                                        ? (locale === "vi" ? "Đang hoạt động" : "Active")
                                        : (locale === "vi" ? "Chưa công khai" : "Inactive")}
                                </span>
                            </div>

                            {/* Edit mode: always show overlay info on top of BannerUpload */}
                            {isEditing && (
                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-6 pb-4">
                                    <h1 className="font-bold text-2xl text-white drop-shadow-sm">
                                        {editName || template.groupName}
                                    </h1>
                                    {editDescription && (
                                        <p className="mt-0.5 text-sm text-white/80 line-clamp-1">
                                            {editDescription}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Content ─────────────────────────────────────── */}
                        <div className="px-6 py-5 space-y-5">

                            {/* Card 1: Thong tin template */}
                            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                                <h3 className="text-sm font-semibold text-[#261E33] mb-4 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-[#FF5722]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {locale === "vi" ? "Thông tin Template" : "Template Info"}
                                </h3>

                                <div className="space-y-4">
                                    {/* Name */}
                                    <div>
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6F6B99]">
                                            {locale === "vi" ? "Tên template" : "Template Name"}
                                        </label>
                                        {isEditing ? (
                                            <div>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => { setEditName(e.target.value); setNameError(false); }}
                                                    placeholder={locale === "vi" ? "Tên template" : "Template name"}
                                                    maxLength={100}
                                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-[#261E33] placeholder:text-[#6F6B99]/50 focus:outline-none focus:ring-2 transition-colors duration-150 ${
                                                        nameError
                                                            ? "border-red-400 bg-red-50/50 focus:border-red-400 focus:ring-red-200"
                                                            : "border-[#E5E5E5] focus:border-[#FF5722] focus:ring-[#FF5722]/10"
                                                    }`}
                                                />
                                                {nameError && (
                                                    <p className="mt-1.5 text-xs text-red-500">
                                                        {locale === "vi" ? "Tên không được để trống." : "Name is required."}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-base font-semibold text-[#261E33]">{template.groupName}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6F6B99]">
                                            {locale === "vi" ? "Mô tả" : "Description"}
                                        </label>
                                        {isEditing ? (
                                            <textarea
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                placeholder={locale === "vi" ? "Chưa có mô tả..." : "No description yet..."}
                                                rows={2}
                                                maxLength={500}
                                                className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm text-[#261E33] placeholder:text-[#6F6B99]/50 focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/10 transition-colors duration-150 resize-none"
                                            />
                                        ) : (
                                            <p className="text-sm text-[#6F6B99]">
                                                {template.groupDescription || (locale === "vi" ? "Chưa có mô tả..." : "No description yet...")}
                                            </p>
                                        )}
                                    </div>

                                    {/* Created date */}
                                    <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-3">
                                        <p className="text-xs text-[#6F6B99]">
                                            {locale === "vi" ? "Ngày tạo" : "Created"}:{" "}
                                            <span className="font-medium text-[#261E33]">
                                                {template.createdAt
                                                    ? new Date(template.createdAt).toLocaleDateString("vi-VN", {
                                                        year: "numeric", month: "short", day: "numeric"
                                                    })
                                                    : "-"}
                                            </span>
                                        </p>
                                        <p className="text-xs text-[#6F6B99]">
                                            ID:{" "}
                                            <span className="font-mono text-[#261E33]">
                                                {template.templateId?.slice(0, 8) ?? "-"}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Hanh dong */}
                            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                                <h3 className="text-sm font-semibold text-[#261E33] mb-4 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-[#FF5722]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                    {locale === "vi" ? "Hành động" : "Actions"}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Toggle active */}
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleToggleActive}
                                        disabled={isSaving}
                                        className={`gap-1.5 text-xs h-8 px-3 transition-all duration-150 active:scale-[0.97] shadow-sm ${
                                            isActive
                                                ? " bg-white border-amber-200 text-amber-600 hover:bg-amber-100 hover:border-amber-600"
                                                : "bg-[#FF5722] text-white hover:bg-[#e64a19]"
                                        }`}
                                    >
                                        {isActive ? (
                                            <>
                                                <XCircle className="h-3.5 w-3.5" />
                                                <span className="text-xs">{locale === "vi" ? "Vô hiệu hóa" : "Deactivate"}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span className="text-xs">{locale === "vi" ? "Công khai" : "Activate"}</span>
                                            </>
                                        )}
                                    </Button>


                                    {/* Hard Delete */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleHardDelete}
                                        disabled={isInactivating || isHardDeleting}
                                        className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-xs h-8 px-3 gap-1.5"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {isHardDeleting
                                            ? (locale === "vi" ? "Đang xóa..." : "Deleting...")
                                            : (locale === "vi" ? "Xóa vĩnh viễn" : "Delete permanently")}
                                    </Button>
                                </div>
                            </div>

                            {/* Card 3: Kanban Columns */}
                            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-[#261E33] flex items-center gap-2">
                                        <svg className="h-4 w-4 text-[#FF5722]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                        </svg>
                                        {locale === "vi" ? "Trạng thái công việc" : "Status Columns"}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-[#6F6B99]">
                                        {locale === "vi"
                                            ? "Quản lý các cột trạng thái công việc của template"
                                            : "Manage task status columns for this template"}
                                    </p>
                                </div>
                                <TaskStatusEditor
                                    items={taskStatuses}
                                    onChange={setTaskStatuses}
                                    disabled={!isEditing || isSaving}
                                    locale={locale}
                                />
                            </div>
                        </div>

                        {/* ── Sticky Footer (khi editing) ─────────────────── */}
                        {isEditing && (
                            <div className="sticky bottom-0 z-20 border-t border-[#E5E5E5] bg-white px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditName(template?.groupName ?? "");
                                            setEditDescription(template?.groupDescription ?? "");
                                            setEditBannerUrl(template?.bannerUrl ?? null);
                                            setNameError(false);
                                        }}
                                        disabled={isSaving}
                                        className="border-[#E5E5E5] text-[#261E33] hover:bg-[#F8F8F8] text-xs px-4 py-1.5 h-8"
                                    >
                                        {locale === "vi" ? "Hủy" : "Cancel"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={isSaving || !editName.trim()}
                                        className="bg-[#FF5722] text-white hover:bg-[#e64a19] shadow-sm text-xs px-4 py-1.5 h-8 gap-1.5 transition-all duration-150 active:scale-[0.97]"
                                    >
                                        {isSaving ? (
                                            <span className="flex items-center gap-1.5">
                                                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                {locale === "vi" ? "Đang lưu..." : "Saving..."}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {locale === "vi" ? "Lưu thay đổi" : "Save changes"}
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

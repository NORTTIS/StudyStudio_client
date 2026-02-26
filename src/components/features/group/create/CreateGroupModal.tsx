"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/api/api-client";

type GroupType = "independent" | "managed";

type UserProfile = {
    userId?: string;
};

type StudioResponse = {
    studioId?: string;
    studioName?: string | null;
    ownerId?: string;
};

type TemplateResponse = {
    templateId?: string;
    groupName?: string | null;
    groupDescription?: string | null;
};

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const API_BASE = RAW_BASE.replace(/\/$/, "");

function buildApiUrl(path: string) {
    if (!API_BASE) return path;
    const p = path.startsWith("/") ? path : `/${path}`;
    if (API_BASE.endsWith("/api") && p.startsWith("/api/")) {
        return `${API_BASE}${p.replace(/^\/api/, "")}`;
    }
    return `${API_BASE}${p}`;
}

export function CreateGroupModal({
    open,
    onClose,
    currentGroupCount,
    maxGroups = 5,
    onCreate
}: {
    open: boolean;
    onClose: () => void;
    currentGroupCount: number;
    maxGroups?: number;
    onCreate: () => void | Promise<void>;
}) {
    const [type, setType] = useState<GroupType>("independent");
    const [studioId, setStudioId] = useState<string>("");
    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [templateId, setTemplateId] = useState<string>("");

    const [loadingOptions, setLoadingOptions] = useState(false);
    const [optionsError, setOptionsError] = useState("");

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [ownerStudios, setOwnerStudios] = useState<Array<{ id: string; name: string }>>([]);
    const [templates, setTemplates] = useState<Array<{ id: string; name: string; desc: string }>>([]);

    const limitReached = useMemo(() => currentGroupCount >= maxGroups, [currentGroupCount, maxGroups]);

    const needStudio = type === "managed";
    const hasOwnerStudio = ownerStudios.length > 0;

    const canCreate = useMemo(() => {
        if (limitReached) return false;
        if (!groupName.trim()) return false;
        if (needStudio && !hasOwnerStudio) return false;
        if (needStudio && !studioId) return false;
        return true;
    }, [limitReached, groupName, needStudio, hasOwnerStudio, studioId]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;

        setType("independent");
        setStudioId("");
        setGroupName("");
        setDescription("");
        setTemplateId("");
        setOwnerStudios([]);
        setTemplates([]);
        setOptionsError("");
        setCreateError("");

        let alive = true;

        (async () => {
            try {
                setLoadingOptions(true);
                setOptionsError("");

                const [profileRes, studiosRes, templatesRes] = await Promise.all([
                    apiGet<UserProfile>(buildApiUrl("/user-profile")),
                    apiGet<StudioResponse[]>(buildApiUrl("/studio")),
                    apiGet<TemplateResponse[]>(buildApiUrl("/templates"))
                ]);

                if (!alive) return;

                if (profileRes.status !== "success" || !profileRes.data?.userId) {
                    throw new Error(profileRes.message || "Không lấy được thông tin người dùng");
                }
                if (studiosRes.status !== "success") {
                    throw new Error(studiosRes.message || "Không tải được danh sách studio");
                }
                if (templatesRes.status !== "success") {
                    throw new Error(templatesRes.message || "Không tải được danh sách template");
                }

                const userId = profileRes.data.userId;
                const studios = Array.isArray(studiosRes.data) ? studiosRes.data : [];
                const tmps = Array.isArray(templatesRes.data) ? templatesRes.data : [];

                const owner = studios
                    .filter((s) => !!s.ownerId && !!s.studioId && s.ownerId === userId)
                    .map((s) => ({
                        id: s.studioId as string,
                        name: s.studioName || "Untitled studio"
                    }));

                const tlist = tmps
                    .filter((t) => !!t.templateId)
                    .map((t) => ({
                        id: t.templateId as string,
                        name: t.groupName || "Template",
                        desc: t.groupDescription || ""
                    }));

                setOwnerStudios(owner);
                setTemplates(tlist);

                if (owner.length > 0) setStudioId(owner[0].id);
            } catch (e: unknown) {
                if (!alive) return;
                setOwnerStudios([]);
                setTemplates([]);
                setOptionsError(e instanceof Error ? e.message : "Không tải được dữ liệu");
            } finally {
                if (!alive) return;
                setLoadingOptions(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open]);

    useEffect(() => {
        if (type !== "managed") {
            setStudioId("");
            return;
        }
        if (!studioId && ownerStudios.length > 0) setStudioId(ownerStudios[0].id);
    }, [type, ownerStudios, studioId]);

    const handleCreate = async () => {
        if (!canCreate) return;

        try {
            setCreating(true);
            setCreateError("");

            const payload = {
                studioId: needStudio ? studioId : null,
                groupName: groupName.trim(),
                description: description.trim(),
                templateId: templateId ? templateId : null
            };

            const res = await apiPost(buildApiUrl("/group"), payload);

            if (res.status !== "success") {
                throw new Error(res.message || "Tạo nhóm thất bại");
            }

            await Promise.resolve(onCreate());
            onClose();
        } catch (e: unknown) {
            setCreateError(e instanceof Error ? e.message : "Tạo nhóm thất bại");
        } finally {
            setCreating(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div className="relative mx-auto flex min-h-screen items-center justify-center px-4 py-10">
                <div className="w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    <div className="flex items-start justify-between gap-6 px-8 py-7 sm:px-10">
                        <div className="min-w-0">
                            <h2 className="text-3xl font-bold tracking-tight text-[#2A2438]">Tạo nhóm mới</h2>
                            <p className="mt-2 text-sm text-[#6F6B99]">
                                Tạo nhóm học tập mới. Bạn có thể chọn mẫu để bắt đầu nhanh.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-200 text-[#2A2438] hover:bg-orange-50"
                            aria-label="Close"
                            disabled={creating}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-8 pb-8 sm:px-10 sm:pb-10">
                        {(optionsError || createError || limitReached) && (
                            <div className="mb-6 space-y-3">
                                {optionsError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {optionsError}
                                    </div>
                                ) : null}

                                {createError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {createError}
                                    </div>
                                ) : null}

                                {limitReached ? (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                        Bạn chỉ được tạo tối đa {maxGroups} nhóm.
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
                            {/* LEFT */}
                            <div className="space-y-7">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <div className="text-base font-semibold text-[#2A2438]">Loại nhóm</div>
                                        <div className="mt-3 relative">
                                            <select
                                                value={type}
                                                onChange={(e) => setType(e.target.value as GroupType)}
                                                className="h-12 w-full appearance-none rounded-2xl border border-[#E6E6E6] bg-white px-5 pr-14 text-sm text-[#2A2438] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                                                <option value="independent">--- Nhóm độc lập ---</option>
                                                <option value="managed">--- Nhóm thuộc không gian quản lý ---</option>
                                            </select>

                                            <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[#6F6B99]">
                                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                                    <path
                                                        d="M6 8l4 4 4-4"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {type === "managed" ? (
                                        <div className="sm:col-span-2">
                                            <div className="flex items-center gap-2 text-base font-semibold text-[#2A2438]">
                                                Studio bạn làm chủ
                                            </div>

                                            <div className="mt-3 relative">
                                                <select
                                                    value={studioId}
                                                    onChange={(e) => setStudioId(e.target.value)}
                                                    disabled={loadingOptions || creating || !hasOwnerStudio}
                                                    className="h-12 w-full appearance-none rounded-2xl border border-[#E6E6E6] bg-white px-5 pr-14 text-sm text-[#2A2438] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100">
                                                    {hasOwnerStudio ? null : (
                                                        <option value="">Bạn chưa có studio nào mà bạn làm chủ</option>
                                                    )}
                                                    {ownerStudios.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[#6F6B99]">
                                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                                        <path
                                                            d="M6 8l4 4 4-4"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <Field label="Tên nhóm">
                                    <input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-sm text-[#2A2438] outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                        placeholder="Nhập tên nhóm"
                                        disabled={loadingOptions || creating}
                                    />
                                </Field>

                                <Field label="Mô tả">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="min-h-[140px] w-full resize-none rounded-2xl border border-[#E6E6E6] px-5 py-4 text-sm text-[#2A2438] outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                        placeholder="Nhập mô tả nhóm (optional)"
                                        disabled={loadingOptions || creating}
                                    />
                                </Field>
                            </div>

                            {/* RIGHT */}
                            <div className="min-w-0">
                                <div className="mb-3">
                                    <div className="text-base font-semibold text-[#2A2438]">Mẫu tạo sẵn</div>
                                    <div className="mt-1 text-sm text-[#6F6B99]">
                                        (Tùy chọn) Chọn 1 mẫu để tạo cấu trúc nhóm nhanh
                                    </div>
                                </div>

                                <div className="max-h-[420px] overflow-y-auto pr-2">
                                    {loadingOptions ? (
                                        <div className="rounded-2xl border border-dashed border-[#E6E6E6] bg-[#FAFAFF] p-6 text-sm text-[#6F6B99]">
                                            Đang tải template...
                                        </div>
                                    ) : null}

                                    {!loadingOptions && templates.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-[#E6E6E6] bg-[#FAFAFF] p-6">
                                            <div className="flex items-start gap-3">
                                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#6F6B99] shadow-sm">
                                                    <ImageIcon className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-[#2A2438]">
                                                        Chưa có template
                                                    </div>
                                                    <div className="mt-1 text-sm text-[#6F6B99]">
                                                        Bạn vẫn có thể tạo nhóm mà không cần chọn template.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
                                        {templates.map((t) => {
                                            const selected = templateId === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setTemplateId((prev) => (prev === t.id ? "" : t.id))}
                                                    disabled={creating}
                                                    className={`overflow-hidden rounded-2xl border text-left transition ${
                                                        selected
                                                            ? "border-orange-500 shadow-[0_10px_30px_rgba(255,122,0,0.18)]"
                                                            : "border-[#E6E6E6] hover:border-[#CFCFCF] hover:shadow-sm"
                                                    }`}
                                                    title={`${t.name}\n\n${t.desc || ""}`}>
                                                    <div className="flex items-center justify-center bg-white py-8">
                                                        <div className="grid h-14 w-14 place-items-center rounded-xl border border-[#E6E6E6] bg-white text-[#6F6B99]">
                                                            <ImageIcon className="h-6 w-6" />
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-[#E6E6E6]" />

                                                    <div
                                                        className={`px-5 py-4 ${selected ? "bg-[#F8EEDB]" : "bg-white"}`}>
                                                        <div className="text-sm font-semibold text-[#2A2438] line-clamp-2">
                                                            {t.name}
                                                        </div>
                                                        <div className="mt-2 text-sm leading-6 text-[#6F6B99] line-clamp-3">
                                                            {t.desc || "Không có mô tả."}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-end gap-5">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="text-sm font-medium text-[#6F6B99] hover:text-[#2A2438]"
                                        disabled={creating}>
                                        Cancel
                                    </button>

                                    <Button
                                        onClick={handleCreate}
                                        disabled={!canCreate || loadingOptions || creating}
                                        className="h-12 rounded-xl bg-orange-500 px-10 text-sm font-semibold hover:bg-orange-600 disabled:bg-gray-300">
                                        {creating ? "Đang tạo..." : "Create"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-base font-semibold text-[#2A2438]">
                {label} {required ? <span className="text-red-500">*</span> : null}
            </div>
            <div className="mt-3">{children}</div>
        </div>
    );
}

"use client";

import { Image as ImageIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/api/api-client";
import type { components } from "@/api/types";
import { Button } from "@/components/ui/button";

type GroupType = "independent" | "managed";
type CreateMode = "single" | "batch";

type UserProfile = {
    userId?: string;
};

type StudioListResponseApiResponse = components["schemas"]["StudioListResponseApiResponse"];

type StudioResponse = NonNullable<NonNullable<StudioListResponseApiResponse["data"]>["studios"]>[number];

type TemplateListDataResponse = {
    subscription?: {
        groupCreated?: number;
        groupLimit?: number;
        memberLimit?: number;
    };
    templates?: TemplateResponse[];
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

type CreateGroupModalVariant = "default" | "studio";

export function CreateGroupModal({
    open,
    onClose,
    currentGroupCount,
    onCreate,
    defaultStudioId,
    variant = "default"
}: {
    open: boolean;
    onClose: () => void;
    currentGroupCount: number;
    onCreate: () => void | Promise<void>;
    defaultStudioId?: string;
    variant?: CreateGroupModalVariant;
}) {
    const [createMode, setCreateMode] = useState<CreateMode>("single");
    const [type, setType] = useState<GroupType>("independent");
    const [studioId, setStudioId] = useState<string>("");
    const [groupName, setGroupName] = useState("");
    const [groupPrefix, setGroupPrefix] = useState("");
    const [groupCount, setGroupCount] = useState<number>(1);
    const [description, setDescription] = useState("");
    const [templateId, setTemplateId] = useState<string>("");

    const [loadingOptions, setLoadingOptions] = useState(false);
    const [optionsError, setOptionsError] = useState("");

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [groupLimit, setGroupLimit] = useState<number>(5);
    const [groupCreated, setGroupCreated] = useState<number>(0);
    const [ownerStudios, setOwnerStudios] = useState<StudioResponse[]>([]);
    const [templates, setTemplates] = useState<Array<{ id: string; name: string; desc: string }>>([]);

    const limitReached = useMemo(
        () => currentGroupCount >= groupLimit,
        [currentGroupCount, groupLimit]
    );

    const remaining = useMemo(() => {
        const r = groupLimit - groupCreated;
        return r > 0 ? r : 0;
    }, [groupLimit, groupCreated]);

    const needStudio = type === "managed";
    const hasOwnerStudio = ownerStudios.length > 0;

    const handleGroupCountChange = (raw: string) => {
        if (raw === "") {
            setGroupCount(1);
            return;
        }
        const next = Number.parseInt(raw, 10);
        if (Number.isNaN(next)) return;

        if (remaining <= 0) {
            setGroupCount(1);
            return;
        }

        if (next < 1) setGroupCount(1);
        else if (next > remaining) setGroupCount(remaining);
        else setGroupCount(next);
    };

    const canCreate = useMemo(() => {
        if (limitReached) return false;

        if (createMode === "single") {
            if (!groupName.trim()) return false;
        } else {
            // In studio variant, studioId is always set via defaultStudioId
            if (variant !== "studio" && needStudio && !studioId) return false;
            if (!groupPrefix.trim()) return false;
            if (!groupCount || groupCount < 1) return false;
            if (groupCount > remaining) return false;
        }

        // In studio variant, needStudio is always true and studioId is pre-set
        if (variant !== "studio") {
            if (needStudio && !hasOwnerStudio) return false;
            if (needStudio && !studioId) return false;
        }

        return true;
    }, [limitReached, createMode, variant, groupName, groupPrefix, groupCount, studioId, needStudio, hasOwnerStudio, remaining]);

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

        setCreateMode("single");
        // In studio variant, type is always "managed"
        setType(variant === "studio" ? "managed" : defaultStudioId ? "managed" : "independent");
        setStudioId(defaultStudioId || "");
        setGroupName("");
        setGroupPrefix("");
        setGroupCount(1);
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

                let userId: string | undefined;
                let owner: StudioResponse[] = [];

                if (variant !== "studio") {
                    const [profileRes, studiosRes] = await Promise.all([
                        apiGet<UserProfile>(buildApiUrl("/user-profile")),
                        apiGet<StudioListResponseApiResponse["data"]>(buildApiUrl("/studio"))
                    ]);

                    if (!alive) return;

                    if (profileRes.status !== "success" || !profileRes.data?.userId) {
                        throw new Error(profileRes.message || "Không lấy được thông tin người dùng");
                    }
                    if (studiosRes.status !== "success") {
                        throw new Error(studiosRes.message || "Không tải được danh sách studio");
                    }

                    userId = profileRes.data.userId;
                    const studios = studiosRes.data?.studios ?? [];
                    owner = studios.filter((s) => s.ownerId === userId);
                }

                // Always fetch templates (includes subscription info)
                const templatesRes = await apiGet<TemplateListDataResponse>(buildApiUrl("/templates"));
                if (!alive) return;
                if (templatesRes.status !== "success") {
                    throw new Error(templatesRes.message || "Không tải được danh sách template");
                }

                // Parse subscription for user plan limits
                const subscription = templatesRes.data?.subscription;
                const groupLimitVal = subscription?.groupLimit ?? 5;
                const groupCreatedVal = subscription?.groupCreated ?? 0;
                setGroupLimit(groupLimitVal);
                setGroupCreated(groupCreatedVal);

                const tmps = templatesRes.data?.templates ?? [];
                const tlist = tmps
                    .filter((t) => !!t.templateId)
                    .map((t) => ({
                        id: t.templateId as string,
                        name: t.groupName || "Template",
                        desc: t.groupDescription || ""
                    }));

                setOwnerStudios(owner);
                setTemplates(tlist);

                if (variant !== "studio" && owner.length > 0) {
                    setStudioId(owner[0].studioId ?? "");
                }
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
    }, [open, defaultStudioId, variant]);

    useEffect(() => {
        if (type !== "managed") {
            setStudioId("");
            return;
        }
        if (!studioId && ownerStudios.length > 0) setStudioId(ownerStudios[0].studioId ?? "");
    }, [type, ownerStudios, studioId]);

    useEffect(() => {
        if (remaining <= 0) {
            setGroupCount(1);
            return;
        }
        setGroupCount((prev) => (prev > remaining ? remaining : prev < 1 ? 1 : prev));
    }, [remaining]);

    const handleCreate = async () => {
        if (!canCreate) return;

        try {
            setCreating(true);
            setCreateError("");

            let res;

            if (createMode === "batch") {
                const payload = {
                    studioId: studioId || null,
                    groupPrefix: groupPrefix.trim(),
                    groupCount,
                    description: description.trim(),
                    templateId: templateId ? templateId : null
                };
                res = await apiPost(buildApiUrl("/api/group/studio-groups"), payload);
            } else {
                const payload = {
                    studioId: needStudio ? studioId : null,
                    groupName: groupName.trim(),
                    description: description.trim(),
                    templateId: templateId ? templateId : null
                };
                res = await apiPost(buildApiUrl("/api/group"), payload);
            }

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

            <div className="relative mx-auto flex min-h-[100vh] items-center justify-center px-4 py-6">
                <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    <div className="flex items-start justify-between gap-6 px-8 py-7 sm:px-10">
                        <div className="min-w-0">
                            <h2 className="font-bold text-3xl text-[#2A2438] tracking-tight">Tạo nhóm mới</h2>
                            <p className="mt-2 text-[#6F6B99] text-sm">
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

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-6 sm:px-10">
                        {(optionsError || createError || limitReached) && (
                            <div className="mb-6 shrink-0 space-y-3">
                                {optionsError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                                        {optionsError}
                                    </div>
                                ) : null}

                                {createError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                                        {createError}
                                    </div>
                                ) : null}

                                {limitReached ? (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
                                        Bạn đã tạo đủ {groupLimit} nhóm theo gói của bạn.
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="grid min-h-0 flex-1 gap-8 md:grid-cols-[1.1fr_0.9fr]">
                            <div className="min-h-0 space-y-7 overflow-y-auto pr-2">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <div className="font-semibold text-[#2A2438] text-base">Chế độ tạo</div>
                                        <div className="relative mt-3">
                                            <select
                                                value={createMode}
                                                onChange={(e) => setCreateMode(e.target.value as CreateMode)}
                                                className="h-12 w-full appearance-none rounded-2xl border border-[#E6E6E6] bg-white px-5 pr-14 text-[#2A2438] text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                                                <option value="single">Tạo một nhóm</option>
                                                <option value="batch">Tạo nhiều nhóm cùng lúc</option>
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

                                    {variant !== "studio" ? (
                                        <div className="sm:col-span-2">
                                            <div className="font-semibold text-[#2A2438] text-base">Loại nhóm</div>
                                            <div className="relative mt-3">
                                                <select
                                                    value={type}
                                                    onChange={(e) => setType(e.target.value as GroupType)}
                                                    className="h-12 w-full appearance-none rounded-2xl border border-[#E6E6E6] bg-white px-5 pr-14 text-[#2A2438] text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                                                    <option value="independent">Nhóm độc lập</option>
                                                    <option value="managed">Nhóm thuộc không gian quản lý</option>
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

                                    {type === "managed" && variant !== "studio" ? (
                                        <div className="sm:col-span-2">
                                            <div className="flex items-center gap-2 font-semibold text-[#2A2438] text-base">
                                                Studio bạn làm chủ
                                            </div>

                                            <div className="relative mt-3">
                                                <select
                                                    value={studioId}
                                                    onChange={(e) => setStudioId(e.target.value)}
                                                    disabled={loadingOptions || creating || !hasOwnerStudio}
                                                    className="h-12 w-full appearance-none rounded-2xl border border-[#E6E6E6] bg-white px-5 pr-14 text-[#2A2438] text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100">
                                                    {hasOwnerStudio ? null : (
                                                        <option value="">Bạn chưa có studio nào mà bạn làm chủ</option>
                                                    )}
                                                    {ownerStudios.map((s) => (
                                                        <option key={s.studioId} value={s.studioId}>
                                                            {s.studioName || "Untitled studio"}
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

                                {createMode === "single" ? (
                                    <Field label="Tên nhóm">
                                        <input
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                            placeholder="Nhập tên nhóm"
                                            disabled={loadingOptions || creating}
                                        />
                                    </Field>
                                ) : (
                                    <>
                                        <Field label="Tiền tố nhóm">
                                            <input
                                                value={groupPrefix}
                                                onChange={(e) => setGroupPrefix(e.target.value)}
                                                className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                placeholder="Ví dụ: Nhóm, Team, Class"
                                                disabled={loadingOptions || creating}
                                            />
                                            <p className="mt-2 text-[#6F6B99] text-xs">
                                                Các nhóm sẽ được đặt tên: {groupPrefix || "[Tiền tố]"} 1,{" "}
                                                {groupPrefix || "[Tiền tố]"} 2, ...
                                            </p>
                                        </Field>

                                        <Field label="Số lượng nhóm">
                                            <input
                                                type="number"
                                                min={1}
                                                max={remaining}
                                                value={groupCount}
                                                onChange={(e) => handleGroupCountChange(e.target.value)}
                                                className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                placeholder="Nhập số lượng"
                                                disabled={loadingOptions || creating || remaining === 0}
                                            />
                                            <p className="mt-2 text-[#6F6B99] text-xs">
                                                Tối đa: {remaining} nhóm (còn trống)
                                            </p>
                                        </Field>
                                    </>
                                )}

                                <Field label="Mô tả">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="min-h-[140px] w-full resize-none rounded-2xl border border-[#E6E6E6] px-5 py-4 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                        placeholder="Nhập mô tả nhóm (optional)"
                                        disabled={loadingOptions || creating}
                                    />
                                </Field>
                            </div>

                            <div className="min-h-0 min-w-0 overflow-y-auto pr-2">
                                <div className="mb-3">
                                    <div className="font-semibold text-[#2A2438] text-base">Mẫu tạo sẵn</div>
                                    <div className="mt-1 text-[#6F6B99] text-sm">
                                        (Tùy chọn) Chọn 1 mẫu để tạo cấu trúc nhóm nhanh
                                    </div>
                                </div>

                                {loadingOptions ? (
                                    <div className="rounded-2xl border border-[#E6E6E6] border-dashed bg-[#FAFAFF] p-6 text-[#6F6B99] text-sm">
                                        Đang tải template...
                                    </div>
                                ) : null}

                                {!loadingOptions && templates.length === 0 ? (
                                    <div className="rounded-2xl border border-[#E6E6E6] border-dashed bg-[#FAFAFF] p-6">
                                        <div className="flex items-start gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#6F6B99] shadow-sm">
                                                <ImageIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-[#2A2438] text-sm">
                                                    Chưa có template
                                                </div>
                                                <div className="mt-1 text-[#6F6B99] text-sm">
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
                                                className={`overflow-hidden rounded-2xl border text-left transition ${selected
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

                                                <div className={`px-5 py-4 ${selected ? "bg-[#F8EEDB]" : "bg-white"}`}>
                                                    <div className="line-clamp-2 font-semibold text-[#2A2438] text-sm">
                                                        {t.name}
                                                    </div>
                                                    <div className="mt-2 line-clamp-3 text-[#6F6B99] text-sm leading-6">
                                                        {t.desc || "Không có mô tả."}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 border-t bg-white px-8 py-5 sm:px-10">
                        <div className="flex items-center justify-end gap-5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="font-medium text-[#6F6B99] text-sm hover:text-[#2A2438]"
                                disabled={creating}>
                                Cancel
                            </button>

                            <Button
                                onClick={handleCreate}
                                disabled={!canCreate || loadingOptions || creating}
                                className="h-12 rounded-xl bg-orange-500 px-10 font-semibold text-sm hover:bg-orange-600 disabled:bg-gray-300">
                                {creating ? "Đang tạo..." : "Create"}
                            </Button>
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
            <div className="font-semibold text-[#2A2438] text-base">
                {label} {required ? <span className="text-red-500">*</span> : null}
            </div>
            <div className="mt-3">{children}</div>
        </div>
    );
}

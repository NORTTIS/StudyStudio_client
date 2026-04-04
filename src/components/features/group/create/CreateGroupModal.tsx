"use client";

import { Download, Image as ImageIcon, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGet, apiPost } from "@/api/api-client";
import { downloadBatchAssignTemplate } from "@/api/studios";
import type { components } from "@/api/types";
import { Button } from "@/components/common/Button";
import { BannerUpload } from "@/components/ui/banner-upload";
import { BRAND_COLORS, ColorPicker } from "@/components/ui/color-picker";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { BatchUploadModal } from "./BatchUploadModal";

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

const GROUP_NAME_MAX_LENGTH = 30;
const GROUP_DESCRIPTION_MAX_LENGTH = 200;
const GROUP_DESCRIPTION_MAX_LINES = 3;
const GROUP_DESCRIPTION_MAX_BREAKS = GROUP_DESCRIPTION_MAX_LINES - 1;

function buildApiUrl(path: string) {
    if (!API_BASE) return path;
    const p = path.startsWith("/") ? path : `/${path}`;
    if (API_BASE.endsWith("/api") && p.startsWith("/api/")) {
        return `${API_BASE}${p.replace(/^\/api/, "")}`;
    }
    return `${API_BASE}${p}`;
}

function getRandomBrandColor(): string {
    return BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
}

type CreateGroupModalVariant = "default" | "studio";
const countLineBreaks = (value: string) => (value.match(/\n/g) || []).length;

const isShortcutKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    e.ctrlKey || e.metaKey || e.altKey;

const isAllowedControlKey = (key: string) =>
    ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End", "Escape"].includes(
        key
    );

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
    const t = useTranslations("CreateGroupModal");
    const { toast } = useToast();
    const [createMode, setCreateMode] = useState<CreateMode>("single");
    const [type, setType] = useState<GroupType>("independent");
    const [studioId, setStudioId] = useState<string>("");
    const [groupName, setGroupName] = useState("");
    const [groupPrefix, setGroupPrefix] = useState("");
    const [groupCount, setGroupCount] = useState<number>(1);
    const [description, setDescription] = useState("");
    const [templateId, setTemplateId] = useState<string>("");
    const [colorHex, setColorHex] = useState(getRandomBrandColor());
    const [iconEmoji, setIconEmoji] = useState("");
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [tagline, setTagline] = useState("");
    const [alias, setAlias] = useState("");

    const [loadingOptions, setLoadingOptions] = useState(false);
    const [optionsError, setOptionsError] = useState("");

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [groupLimit, setGroupLimit] = useState<number>(5);
    const [groupCreated, setGroupCreated] = useState<number>(0);
    const [ownerStudios, setOwnerStudios] = useState<StudioResponse[]>([]);
    const [templates, setTemplates] = useState<Array<{ id: string; name: string; desc: string }>>([]);

    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const [batchUploadOpen, setBatchUploadOpen] = useState(false);

    const limitReached = useMemo(() => currentGroupCount >= groupLimit, [currentGroupCount, groupLimit]);

    const remaining = useMemo(() => {
        const r = groupLimit - groupCreated;
        return r > 0 ? r : 0;
    }, [groupLimit, groupCreated]);

    const needStudio = type === "managed";
    const hasOwnerStudio = ownerStudios.length > 0;

    const handleGroupCountChange = (raw: string) => {
        if (raw === "") {
            setGroupCount(0);
            return;
        }

        const next = Number.parseInt(raw, 10);
        if (Number.isNaN(next)) return;

        if (remaining <= 0) {
            setGroupCount(0);
            return;
        }

        if (next < 0) setGroupCount(0);
        else if (next > remaining) setGroupCount(remaining);
        else setGroupCount(next);
    };

    const handleGroupNameChange = (value: string) => {
        if (value.length > GROUP_NAME_MAX_LENGTH) return;
        setGroupName(value);
    };

    const handleGroupPrefixChange = (value: string) => {
        if (value.length > GROUP_NAME_MAX_LENGTH) return;
        setGroupPrefix(value);
    };

    const handleDescriptionChange = (value: string) => {
        if (value.length > GROUP_DESCRIPTION_MAX_LENGTH) return;
        if (countLineBreaks(value) > GROUP_DESCRIPTION_MAX_BREAKS) return;
        setDescription(value);
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
    }, [
        limitReached,
        createMode,
        variant,
        groupName,
        groupPrefix,
        groupCount,
        studioId,
        needStudio,
        hasOwnerStudio,
        remaining
    ]);

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
        setColorHex(getRandomBrandColor());
        setIconEmoji("");
        setBannerUrl(null);
        setTagline("");
        setAlias("");
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
                        throw new Error(profileRes.message || t("errors.loadUser"));
                    }
                    if (studiosRes.status !== "success") {
                        throw new Error(studiosRes.message || t("errors.loadStudios"));
                    }

                    userId = profileRes.data.userId;
                    const studios = studiosRes.data?.studios ?? [];
                    owner = studios.filter((s) => s.ownerId === userId);
                }

                // Always fetch templates (includes subscription info)
                const templatesRes = await apiGet<TemplateListDataResponse>(buildApiUrl("/templates"));
                if (!alive) return;
                if (templatesRes.status !== "success") {
                    throw new Error(templatesRes.message || t("errors.loadTemplates"));
                }

                // Parse subscription for user plan limits
                const subscription = templatesRes.data?.subscription;
                const groupLimitVal = subscription?.groupLimit ?? 5;
                const groupCreatedVal = subscription?.groupCreated ?? 0;
                setGroupLimit(groupLimitVal);
                setGroupCreated(groupCreatedVal);

                const tmps = templatesRes.data?.templates ?? [];
                const tlist = tmps
                    .filter((template) => !!template.templateId)
                    .map((template) => ({
                        id: template.templateId as string,
                        name: template.groupName || t("templateFallbackName"),
                        desc: template.groupDescription || ""
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
                setOptionsError(e instanceof Error ? e.message : t("errors.loadData"));
            } finally {
                if (!alive) return;
                setLoadingOptions(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, defaultStudioId, variant, t]);

    useEffect(() => {
        if (type !== "managed") {
            setStudioId("");
            return;
        }
        if (!studioId && ownerStudios.length > 0) setStudioId(ownerStudios[0].studioId ?? "");
    }, [type, ownerStudios, studioId]);

    useEffect(() => {
        if (remaining <= 0) {
            setGroupCount(0);
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
                    templateId: templateId ? templateId : null,
                    colorHex: colorHex || null,
                    iconEmoji: iconEmoji || null,
                    bannerUrl: bannerUrl || null,
                    tagline: tagline.trim() || null,
                    alias: alias.trim() || null
                };
                res = await apiPost(buildApiUrl("/api/group"), payload);
            }

            if (res.status !== "success") {
                throw new Error(res.message || t("errors.createFailed"));
            }

            await Promise.resolve(onCreate());
            toast({
                variant: "success",
                description: t("createSuccess")
            });
            onClose();
        } catch (e: unknown) {
            setCreateError(e instanceof Error ? e.message : t("errors.createFailed"));
        } finally {
            setCreating(false);
        }
    };

    const handleDownloadTemplate = async () => {
        if (!defaultStudioId) return;
        setDownloadingTemplate(true);
        try {
            const blob = await downloadBatchAssignTemplate(defaultStudioId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "mau-thanh-vien.csv";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Failed to download template", e);
        } finally {
            setDownloadingTemplate(false);
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
                            <h2 className="font-bold text-3xl text-[#2A2438] tracking-tight">{t("title")}</h2>
                            <p className="mt-2 text-[#6F6B99] text-sm">{t("subtitle")}</p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-200 text-[#2A2438] hover:bg-orange-50"
                            aria-label={t("close")}
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
                                        {t("limitReached", { limit: groupLimit })}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="grid min-h-0 flex-1 gap-8 md:grid-cols-[1.1fr_0.9fr]">
                            <div className="min-h-0 space-y-7 overflow-y-auto pr-2">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <div className="font-semibold text-[#2A2438] text-base">
                                            {t("createModeLabel")}
                                        </div>
                                        <Select
                                            value={createMode}
                                            onValueChange={(value) => setCreateMode(value as CreateMode)}>
                                            <SelectTrigger className="mt-3 h-12 w-full rounded-2xl border border-[#E6E6E6] bg-white px-5 text-left text-[#2A2438] text-sm shadow-[0_8px_24px_rgba(30,41,59,0.06)] transition hover:border-orange-300 hover:bg-[#FFFDFC] focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-100 data-[state=open]:border-orange-400 data-[state=open]:ring-2 data-[state=open]:ring-orange-100 [&>span]:truncate [&>svg]:text-[#6F6B99]">
                                                <SelectValue placeholder={t("createModeLabel")} />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                side="bottom"
                                                align="start"
                                                sideOffset={8}
                                                className="z-[70] min-w-[var(--radix-select-trigger-width)] rounded-2xl border border-[#F3DCC8] bg-white p-1 shadow-[0_18px_40px_rgba(41,30,56,0.18)]">
                                                <SelectItem
                                                    value="single"
                                                    className="cursor-pointer rounded-xl bg-white px-3 py-2.5 text-[#2A2438] text-sm data-[highlighted]:bg-[#FFF4EA] data-[state=checked]:bg-white">
                                                    {t("createModeSingle")}
                                                </SelectItem>
                                                <SelectItem
                                                    value="batch"
                                                    className="cursor-pointer rounded-xl bg-white px-3 py-2.5 text-[#2A2438] text-sm data-[highlighted]:bg-[#FFF4EA] data-[state=checked]:bg-white">
                                                    {t("createModeBatch")}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {variant !== "studio" ? (
                                        <div className="sm:col-span-2">
                                            <div className="font-semibold text-[#2A2438] text-base">
                                                {t("groupTypeLabel")}
                                            </div>
                                            <Select value={type} onValueChange={(value) => setType(value as GroupType)}>
                                                <SelectTrigger className="mt-3 h-12 w-full rounded-2xl border border-[#E6E6E6] bg-white px-5 text-left text-[#2A2438] text-sm shadow-[0_8px_24px_rgba(30,41,59,0.06)] transition hover:border-orange-300 hover:bg-[#FFFDFC] focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-100 data-[state=open]:border-orange-400 data-[state=open]:ring-2 data-[state=open]:ring-orange-100 [&>span]:truncate [&>svg]:text-[#6F6B99]">
                                                    <SelectValue placeholder={t("groupTypeLabel")} />
                                                </SelectTrigger>
                                                <SelectContent
                                                    position="popper"
                                                    side="bottom"
                                                    align="start"
                                                    sideOffset={8}
                                                    className="z-[70] min-w-[var(--radix-select-trigger-width)] rounded-2xl border border-[#F3DCC8] bg-white p-1 shadow-[0_18px_40px_rgba(41,30,56,0.18)]">
                                                    <SelectItem
                                                        value="independent"
                                                        className="cursor-pointer rounded-xl bg-white px-3 py-2.5 text-[#2A2438] text-sm data-[highlighted]:bg-[#FFF4EA] data-[state=checked]:bg-white">
                                                        {t("groupTypeIndependent")}
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="managed"
                                                        className="cursor-pointer rounded-xl bg-white px-3 py-2.5 text-[#2A2438] text-sm data-[highlighted]:bg-[#FFF4EA] data-[state=checked]:bg-white">
                                                        {t("groupTypeManaged")}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : null}

                                    {type === "managed" && variant !== "studio" ? (
                                        <div className="sm:col-span-2">
                                            <div className="flex items-center gap-2 font-semibold text-[#2A2438] text-base">
                                                {t("ownerStudiosLabel")}
                                            </div>

                                            <div className="relative mt-3">
                                                <Select
                                                    value={studioId || undefined}
                                                    onValueChange={setStudioId}
                                                    disabled={loadingOptions || creating || !hasOwnerStudio}>
                                                    <SelectTrigger className="h-12 w-full rounded-2xl border border-[#E6E6E6] bg-white px-5 text-left text-[#2A2438] text-sm shadow-[0_8px_24px_rgba(30,41,59,0.06)] transition hover:border-orange-300 hover:bg-[#FFFDFC] focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-100 data-[state=open]:border-orange-400 data-[state=open]:ring-2 data-[state=open]:ring-orange-100 disabled:bg-gray-100 disabled:text-[#9CA3AF] [&>span]:truncate [&>svg]:text-[#6F6B99]">
                                                        <SelectValue placeholder={t("noOwnerStudios")} />
                                                    </SelectTrigger>
                                                    <SelectContent
                                                        position="popper"
                                                        side="bottom"
                                                        align="start"
                                                        sideOffset={8}
                                                        className="z-[70] min-w-[var(--radix-select-trigger-width)] rounded-2xl border border-[#F3DCC8] bg-white p-1 shadow-[0_18px_40px_rgba(41,30,56,0.18)]">
                                                        {ownerStudios
                                                            .filter((s) => Boolean(s.studioId))
                                                            .map((s) => (
                                                                <SelectItem
                                                                    key={s.studioId}
                                                                    value={s.studioId as string}
                                                                    className="cursor-pointer rounded-xl bg-white px-3 py-2.5 text-[#2A2438] text-sm data-[highlighted]:bg-[#FFF4EA] data-[state=checked]:bg-white">
                                                                    {s.studioName || t("untitledStudio")}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {createMode === "single" ? (
                                    <>
                                        <Field label={t("groupNameLabel")} required>
                                            <div>
                                                <input
                                                    value={groupName}
                                                    onChange={(e) => handleGroupNameChange(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (isShortcutKey(e) || isAllowedControlKey(e.key)) return;

                                                        const input = e.currentTarget;
                                                        const hasSelection =
                                                            (input.selectionStart ?? 0) !== (input.selectionEnd ?? 0);

                                                        if (
                                                            !hasSelection &&
                                                            groupName.length >= GROUP_NAME_MAX_LENGTH
                                                        ) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        const pastedText = e.clipboardData.getData("text");
                                                        const input = e.currentTarget;
                                                        const start = input.selectionStart ?? 0;
                                                        const end = input.selectionEnd ?? 0;
                                                        const nextValue =
                                                            groupName.slice(0, start) +
                                                            pastedText +
                                                            groupName.slice(end);

                                                        if (nextValue.length > GROUP_NAME_MAX_LENGTH) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                    placeholder={t("groupNamePlaceholder")}
                                                    disabled={loadingOptions || creating}
                                                />
                                                <div className="mt-2 text-right text-[#6F6B99] text-xs">
                                                    {groupName.length}/{GROUP_NAME_MAX_LENGTH}
                                                </div>
                                            </div>
                                        </Field>
                                        <Field label={t("colorAndIconLabel")}>
                                            <div className="flex items-center gap-3">
                                                <EmojiPicker
                                                    value={iconEmoji}
                                                    onChange={setIconEmoji}
                                                    disabled={loadingOptions || creating}
                                                />
                                                <div className="flex-1">
                                                    <ColorPicker
                                                        value={colorHex}
                                                        onChange={setColorHex}
                                                        disabled={loadingOptions || creating}
                                                    />
                                                </div>
                                            </div>
                                        </Field>

                                        {/* Alias */}
                                        <Field label={t("aliasLabel") || "Biệt danh"}>
                                            <input
                                                value={alias}
                                                onChange={(e) => setAlias(e.target.value.slice(0, 50))}
                                                className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                placeholder={t("aliasPlaceholder") || "VD: THPT Hoang Dieu"}
                                                disabled={loadingOptions || creating}
                                            />
                                            {alias.length > 0 && (
                                                <div className="mt-2">
                                                    <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                                                        {alias}
                                                    </span>
                                                </div>
                                            )}
                                        </Field>

                                        {/* Tagline */}
                                        <Field label={t("taglineLabel") || "Slogan"}>
                                            <input
                                                value={tagline}
                                                onChange={(e) => setTagline(e.target.value.slice(0, 200))}
                                                className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                placeholder={t("taglinePlaceholder") || "Nhập slogan ngắn gọn"}
                                                disabled={loadingOptions || creating}
                                            />
                                        </Field>
                                    </>
                                ) : (
                                    <div>
                                        <Field label={t("groupPrefixLabel")} required>
                                            <div>
                                                <input
                                                    value={groupPrefix}
                                                    onChange={(e) => handleGroupPrefixChange(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (isShortcutKey(e) || isAllowedControlKey(e.key)) return;

                                                        const input = e.currentTarget;
                                                        const hasSelection =
                                                            (input.selectionStart ?? 0) !== (input.selectionEnd ?? 0);

                                                        if (
                                                            !hasSelection &&
                                                            groupPrefix.length >= GROUP_NAME_MAX_LENGTH
                                                        ) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        const pastedText = e.clipboardData.getData("text");
                                                        const input = e.currentTarget;
                                                        const start = input.selectionStart ?? 0;
                                                        const end = input.selectionEnd ?? 0;
                                                        const nextValue =
                                                            groupPrefix.slice(0, start) +
                                                            pastedText +
                                                            groupPrefix.slice(end);

                                                        if (nextValue.length > GROUP_NAME_MAX_LENGTH) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                    placeholder={t("groupPrefixPlaceholder")}
                                                    disabled={loadingOptions || creating}
                                                />
                                                <div className="mt-2 flex items-center justify-between gap-3">
                                                    <p className="text-[#6F6B99] text-xs">
                                                        {t("groupPrefixHint", {
                                                            prefix: groupPrefix || t("prefixFallback")
                                                        })}
                                                    </p>
                                                    <div className="shrink-0 text-[#6F6B99] text-xs">
                                                        {groupPrefix.length}/{GROUP_NAME_MAX_LENGTH}
                                                    </div>
                                                </div>
                                            </div>
                                        </Field>

                                        <Field label={t("groupCountLabel")} required>
                                            <div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={remaining}
                                                    value={groupCount === 0 ? "" : groupCount}
                                                    onChange={(e) => handleGroupCountChange(e.target.value)}
                                                    className="h-12 w-full rounded-2xl border border-[#E6E6E6] px-5 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                                    placeholder={t("groupCountPlaceholder")}
                                                    disabled={loadingOptions || creating || remaining === 0}
                                                />
                                                <p className="mt-2 text-[#6F6B99] text-xs">
                                                    {t("groupCountMaxHint", { remaining })}
                                                </p>
                                            </div>
                                        </Field>
                                    </div>
                                )}

                                <Field label={t("descriptionLabel")}>
                                    <div className="relative">
                                        <textarea
                                            value={description}
                                            onChange={(e) => {
                                                handleDescriptionChange(e.target.value);
                                            }}
                                            onKeyDown={(e) => {
                                                if (isShortcutKey(e) || isAllowedControlKey(e.key)) return;

                                                const textarea = e.currentTarget;
                                                const hasSelection =
                                                    (textarea.selectionStart ?? 0) !== (textarea.selectionEnd ?? 0);

                                                if (e.key === "Enter") {
                                                    const lineBreakCount = countLineBreaks(description);
                                                    if (
                                                        !hasSelection &&
                                                        lineBreakCount >= GROUP_DESCRIPTION_MAX_BREAKS
                                                    ) {
                                                        e.preventDefault();
                                                    }
                                                    return;
                                                }

                                                if (
                                                    !hasSelection &&
                                                    description.length >= GROUP_DESCRIPTION_MAX_LENGTH
                                                ) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onPaste={(e) => {
                                                const pastedText = e.clipboardData.getData("text");
                                                const textarea = e.currentTarget;
                                                const start = textarea.selectionStart ?? 0;
                                                const end = textarea.selectionEnd ?? 0;
                                                const nextValue =
                                                    description.slice(0, start) + pastedText + description.slice(end);

                                                if (nextValue.length > GROUP_DESCRIPTION_MAX_LENGTH) {
                                                    e.preventDefault();
                                                    return;
                                                }

                                                if (countLineBreaks(nextValue) > GROUP_DESCRIPTION_MAX_BREAKS) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="min-h-[140px] w-full resize-none rounded-2xl border border-[#E6E6E6] px-5 py-4 pb-10 text-[#2A2438] text-sm outline-none transition placeholder:text-[#A3A0C2] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                            placeholder={t("descriptionPlaceholder")}
                                            disabled={loadingOptions || creating}
                                        />

                                        <div className="pointer-events-none absolute right-4 bottom-3 text-[#6F6B99] text-xs">
                                            {description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
                                        </div>
                                    </div>
                                </Field>

                                {/* Batch upload section - studio variant only, batch mode only */}
                                {variant === "studio" && createMode === "batch" && (
                                    <div className="rounded-2xl border border-[#E6E6E6] border-dashed bg-[#FAFAFF] p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="font-semibold text-[#2A2438] text-sm">
                                                    {t("batchFromFileTitle")}
                                                </div>
                                                <div className="mt-1 text-[#6F6B99] text-xs">
                                                    {t("batchFromFileSubtitle")}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDownloadTemplate}
                                                    isLoading={downloadingTemplate}
                                                    className="h-9 gap-1.5 rounded-xl border-[#E6E6E6] px-3 font-medium text-[#2A2438] text-xs hover:bg-gray-50">
                                                    <Download className="h-4 w-4" />
                                                    {t("downloadTemplate")}
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setBatchUploadOpen(true)}
                                                    className="h-9 gap-1.5 rounded-xl border-2 border-[#FF5722] bg-white px-3 font-semibold text-[#FF5722] text-xs hover:bg-[#FFF3E0]">
                                                    <Upload className="h-4 w-4" />
                                                    {t("uploadFile")}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="min-h-0 min-w-0 overflow-y-auto pr-2">
                                <div className="mb-3">
                                    <div className="font-semibold text-[#2A2438] text-base">{t("templatesTitle")}</div>
                                    <div className="mt-1 text-[#6F6B99] text-sm">{t("templatesSubtitle")}</div>
                                </div>

                                {loadingOptions ? (
                                    <div className="rounded-2xl border border-[#E6E6E6] border-dashed bg-[#FAFAFF] p-6 text-[#6F6B99] text-sm">
                                        {t("loadingTemplates")}
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
                                                    {t("emptyTemplatesTitle")}
                                                </div>
                                                <div className="mt-1 text-[#6F6B99] text-sm">
                                                    {t("emptyTemplatesSubtitle")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
                                    {templates.map((template) => {
                                        const selected = templateId === template.id;
                                        return (
                                            <button
                                                key={template.id}
                                                type="button"
                                                onClick={() =>
                                                    setTemplateId((prev) => (prev === template.id ? "" : template.id))
                                                }
                                                disabled={creating}
                                                className={`overflow-hidden rounded-2xl border text-left transition ${selected
                                                    ? "border-orange-500 shadow-[0_10px_30px_rgba(255,122,0,0.18)]"
                                                    : "border-[#E6E6E6] hover:border-[#CFCFCF] hover:shadow-sm"
                                                    }`}
                                                title={`${template.name}\n\n${template.desc || ""}`}>
                                                <div className="flex items-center justify-center bg-white py-8">
                                                    <div className="grid h-14 w-14 place-items-center rounded-xl border border-[#E6E6E6] bg-white text-[#6F6B99]">
                                                        <ImageIcon className="h-6 w-6" />
                                                    </div>
                                                </div>

                                                <div className="h-px bg-[#E6E6E6]" />

                                                <div className={`px-5 py-4 ${selected ? "bg-[#F8EEDB]" : "bg-white"}`}>
                                                    <div className="line-clamp-2 font-semibold text-[#2A2438] text-sm">
                                                        {template.name}
                                                    </div>
                                                    <div className="mt-2 line-clamp-3 text-[#6F6B99] text-sm leading-6">
                                                        {template.desc || t("noDescription")}
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
                                {t("cancel")}
                            </button>

                            <Button
                                onClick={handleCreate}
                                disabled={!canCreate || loadingOptions || creating}
                                className="h-12 rounded-xl bg-orange-500 px-10 font-semibold text-sm hover:bg-orange-600 disabled:bg-gray-300">
                                {creating ? t("creating") : t("create")}
                            </Button>
                        </div>
                    </div>

                    {/* Batch Upload Modal */}
                    {batchUploadOpen && defaultStudioId && (
                        <BatchUploadModal
                            open={batchUploadOpen}
                            onClose={() => setBatchUploadOpen(false)}
                            studioId={defaultStudioId}
                            onSuccess={onCreate}
                        />
                    )}
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

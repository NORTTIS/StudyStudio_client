"use client";

import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    RotateCcw,
    Search,
    Trash2,
    Users,
    X
} from "lucide-react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import "react-day-picker/dist/style.css";
import { Container } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function parseDateString(value?: string) {
    if (!value) return undefined;
    const [y, m, d] = value.split("-").map(Number);
    if (!(y && m && d)) return undefined;
    return new Date(y, m - 1, d);
}

function formatDateToInputValue(date?: Date) {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateDisplay(value?: string, labels?: { selectDate: string; today: string; tomorrow: string }) {
    const date = parseDateString(value);
    if (!date) return labels?.selectDate || "Select a date";

    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return labels?.today || "Today";
    if (diffDays === 1) return labels?.tomorrow || "Tomorrow";

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    }).format(target);
}

type ApiResponse<T> = {
    status?: string;
    code?: string | null;
    message?: string | null;
    data?: T;
};

type TaskDeleteResponse = {
    deletedBy?: string;
    deletedOn?: string;
    deleteTaskId?: string;
    taskName?: string | null;
};

type GroupMemberDto = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
    joinedAt?: string;
};

type GroupMemberListResponse = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberDto[] | null;
    totalMembers?: number;
};

type TrashItem = {
    id: string;
    rowKey: string;
    name: string;
    type: "Task";
    deletedOn: string;
    deletedOnRaw?: string;
    deletedBy?: string | null;
    deletedByName?: string | null;
};

type DeletedByOption = {
    id: string;
    name: string;
    avatarUrl?: string | null;
};

type DeletedDateFilter = {
    startDate: string;
    endDate: string;
};

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

function parseMaybeJson(raw: string) {
    const text = (raw ?? "").toString().trim();
    if (!text) return { json: null as any, text: "" };
    try {
        const cleaned = text.replace(/^\uFEFF/, "");
        return { json: JSON.parse(cleaned), text };
    } catch {
        return { json: null as any, text };
    }
}

const okByJsonStatus = (obj: any) => {
    const s = String(obj?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: any) => {
    const msg = (json?.message ?? "").toString().trim();
    if (msg) return msg;
    const t = (text ?? "").toString().trim();
    return t || "UNKNOWN_ERROR";
};

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return String(raw).replace(/\/+$/, "");
}

function apiUrl(path: string) {
    const base = getApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!base) return cleanPath;
    if (base.endsWith("/api")) return `${base}${cleanPath}`;
    return `${base}/api${cleanPath}`;
}

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
}

async function apiFetchJson<T>(input: RequestInfo, init: RequestInit): Promise<ApiResponse<T> | null> {
    const res = await fetch(input, init);
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<T> | null;
}

async function apiPermanentDeleteTask(args: { groupId: string; taskId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("MISSING_API_BASE");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("INVALID_GROUP_ID");
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error("INVALID_TASK_ID");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}/permanent`);

    await apiFetchJson<unknown>(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    return true;
}

async function apiGetDeletedTasks(groupId: string) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("MISSING_API_BASE");
    if (!(groupId && isUuidLike(groupId))) throw new Error("INVALID_GROUP_ID");

    const url = apiUrl(`/Task/${encodeURIComponent(groupId)}/deleted-task`);

    return apiFetchJson<TaskDeleteResponse[]>(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
}

async function apiGetGroupMembers(groupId: string) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("MISSING_API_BASE");
    if (!(groupId && isUuidLike(groupId))) throw new Error("INVALID_GROUP_ID");

    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);

    return apiFetchJson<GroupMemberListResponse>(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
}

async function apiRestoreTask(args: { groupId: string; taskId: string }) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error("MISSING_API_BASE");
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error("INVALID_GROUP_ID");
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error("INVALID_TASK_ID");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}/restore`);

    await apiFetchJson<unknown>(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    return true;
}

function formatDeletedOn(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "--";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    }).format(d);
}

function buildFullName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
    const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    if (full) return full;
    return String(fallback ?? "").trim();
}

function getInitials(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return "?";
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function normalizeText(input?: string | null) {
    return String(input ?? "")
        .toLocaleLowerCase("vi-VN")
        .trim();
}

function normalizeMemberRole(raw?: string | null) {
    return String(raw ?? "")
        .trim()
        .replace(/^ROLE_/i, "")
        .replace(/^GROUP_/i, "")
        .replace(/^STUDIO_/i, "")
        .toLowerCase();
}

function matchDeletedDate(raw?: string | null, filter?: DeletedDateFilter | null) {
    if (!filter) return true;
    const { startDate, endDate } = filter;
    if (!(startDate || endDate)) return true;
    const s = String(raw ?? "").trim();
    if (!s) return false;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return false;
    const dateOnly = formatDateToInputValue(startOfDay(d));
    if (startDate && dateOnly < startDate) return false;
    if (endDate && dateOnly > endDate) return false;
    return true;
}

function dedupeTrashItems(items: TrashItem[]) {
    const latestById = new Map<string, TrashItem>();

    for (const item of items) {
        const id = String(item.id ?? "").trim();
        if (!id) continue;

        const existing = latestById.get(id);
        if (!existing) {
            latestById.set(id, item);
            continue;
        }

        const currentTime = new Date(item.deletedOnRaw || 0).getTime();
        const existingTime = new Date(existing.deletedOnRaw || 0).getTime();

        if (Number.isNaN(existingTime) || currentTime >= existingTime) {
            latestById.set(id, item);
        }
    }

    return Array.from(latestById.values()).sort((a, b) => {
        const aTime = new Date(a.deletedOnRaw || 0).getTime();
        const bTime = new Date(b.deletedOnRaw || 0).getTime();
        return bTime - aTime;
    });
}

const avatarTones = ["bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-cyan-500"];

function pickAvatarTone(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return avatarTones[Math.abs(hash) % avatarTones.length];
}

const monthOptions = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"] as const;

type PopupPosition = {
    top: number;
    left: number;
    width: number;
};

type TrelloDatePickerProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
};

function TrelloDatePicker({ label, value, onChange, min, max }: TrelloDatePickerProps) {
    const t = useTranslations("TrashedPage");
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(null);

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const selectedDate = React.useMemo(() => parseDateString(value), [value]);
    const minDate = React.useMemo(() => parseDateString(min), [min]);
    const maxDate = React.useMemo(() => parseDateString(max), [max]);

    const initialMonth = React.useMemo(() => selectedDate ?? minDate ?? new Date(), [selectedDate, minDate]);
    const [month, setMonth] = React.useState<Date>(initialMonth);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (open) {
            setMonth(selectedDate ?? minDate ?? new Date());
        }
    }, [open, selectedDate, minDate]);

    const updatePopupPosition = React.useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const popupWidth = 420;
        const popupHeight = 560;
        const gap = 8;
        const viewportPadding = 12;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUp = spaceBelow < popupHeight && spaceAbove > spaceBelow;

        let top = shouldOpenUp ? rect.top - popupHeight - gap : rect.bottom + gap;
        let left = rect.left;

        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }
        if (left < viewportPadding) left = viewportPadding;
        if (top < viewportPadding) top = viewportPadding;
        if (top + popupHeight > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, window.innerHeight - popupHeight - viewportPadding);
        }

        setPopupPosition({ top, left, width: popupWidth });
    }, []);

    React.useEffect(() => {
        if (!open) return;

        updatePopupPosition();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const popup = rootRef.current;
            const trigger = triggerRef.current;
            if (popup?.contains(target)) return;
            if (trigger?.contains(target)) return;
            setOpen(false);
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEsc);
        window.addEventListener("resize", updatePopupPosition);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEsc);
            window.removeEventListener("resize", updatePopupPosition);
        };
    }, [open, updatePopupPosition]);

    const pickDate = (date?: Date) => {
        if (!date) return;
        const normalized = startOfDay(date);
        if (minDate && normalized < startOfDay(minDate)) return;
        if (maxDate && normalized > startOfDay(maxDate)) return;
        onChange(formatDateToInputValue(normalized));
        setOpen(false);
    };

    const yearOptions = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = Math.min(minDate?.getFullYear() ?? currentYear - 5, currentYear - 5);
        const endYear = currentYear + 10;
        return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    }, [minDate]);

    const handleMonthChange = (value: string) => {
        setMonth(new Date(month.getFullYear(), Number(value), 1));
    };

    const handleYearChange = (value: string) => {
        setMonth(new Date(Number(value), month.getMonth(), 1));
    };

    const goPrevMonth = () => {
        const next = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        if (minDate) {
            const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            if (next < minMonth) return;
        }
        setMonth(next);
    };

    const goNextMonth = () => {
        setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    };

    const isPrevDisabled = React.useMemo(() => {
        if (!minDate) return false;
        const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        return prev < minMonth;
    }, [month, minDate]);

    const isNextDisabled = React.useMemo(() => {
        if (!maxDate) return false;
        const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        return next > maxMonth;
    }, [month, maxDate]);

    const popup =
        mounted && open && popupPosition
            ? createPortal(
                <div
                    ref={rootRef}
                    className="fixed z-[20000] rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                    style={{
                        top: popupPosition.top,
                        left: popupPosition.left,
                        width: popupPosition.width
                    }}>
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex-1">
                            <Select value={String(month.getMonth())} onValueChange={handleMonthChange}>
                                <SelectTrigger className="h-12 w-full font-semibold text-base">
                                    <SelectValue placeholder={t(`datePicker.month${month.getMonth() + 1}`)} />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((item, index) => (
                                        <SelectItem key={item} value={item}>
                                            {t(`datePicker.month${index + 1}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[140px]">
                            <Select value={String(month.getFullYear())} onValueChange={handleYearChange}>
                                <SelectTrigger className="h-12 w-full font-semibold text-base">
                                    <SelectValue placeholder={String(month.getFullYear())} />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((year) => (
                                        <SelectItem key={year} value={String(year)}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-[20px] border border-zinc-200 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goPrevMonth}
                                disabled={isPrevDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="font-bold text-[18px] text-zinc-900">
                                {t(`datePicker.month${month.getMonth() + 1}`)} {month.getFullYear()}
                            </div>

                            <button
                                type="button"
                                onClick={goNextMonth}
                                disabled={isNextDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        <DayPicker
                            mode="single"
                            month={month}
                            onMonthChange={setMonth}
                            selected={selectedDate}
                            onSelect={pickDate}
                            disabled={
                                maxDate && minDate
                                    ? { before: minDate, after: maxDate }
                                    : maxDate
                                        ? { after: maxDate }
                                        : minDate
                                            ? { before: minDate }
                                            : undefined
                            }
                            showOutsideDays
                            className="w-full"
                            styles={{
                                day: { outline: "none", boxShadow: "none" },
                                button: { outline: "none", boxShadow: "none" }
                            }}
                            classNames={{
                                months: "flex w-full flex-col",
                                month: "w-full space-y-3",
                                month_caption: "hidden",
                                caption: "hidden",
                                caption_label: "hidden",
                                nav: "hidden",
                                table: "w-full border-collapse",
                                month_grid: "w-full border-collapse",
                                tbody: "w-full",
                                weekdays: "flex w-full justify-between",
                                weekday: "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                head_row: "flex w-full justify-between",
                                head_cell: "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                weeks: "w-full",
                                week: "mt-2 flex w-full justify-between",
                                row: "mt-2 flex w-full justify-between",
                                day: "h-10 w-10 p-0 text-center",
                                cell: "h-10 w-10 p-0 text-center",
                                day_button:
                                    "h-10 w-10 rounded-xl border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 shadow-none outline-none ring-0 transition hover:bg-orange-50 focus:outline-none focus:ring-0",
                                selected: "!bg-orange-500 !text-white rounded-xl",
                                day_selected: "!bg-orange-500 !text-white hover:!bg-orange-500 hover:!text-white",
                                today: "text-orange-600 font-bold",
                                day_today: "text-orange-600 font-bold",
                                outside: "opacity-30",
                                day_outside: "opacity-30",
                                disabled: "opacity-30",
                                day_disabled: "opacity-30 cursor-not-allowed",
                                hidden: "invisible",
                                day_hidden: "invisible"
                            }}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => pickDate(new Date())}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                            {t("datePicker.today")}
                        </button>

                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 1))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                            {t("datePicker.tomorrow")}
                        </button>

                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 7))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                            {t("datePicker.nextWeek")}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-rose-500 hover:bg-rose-50">
                            {t("datePicker.noDate")}
                        </button>
                    </div>
                </div>,
                document.body
            )
            : null;

    return (
        <>
            <div className="relative">
                <div className="font-semibold text-sm text-zinc-600">{label}</div>

                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        open
                            ? "border-orange-400 bg-orange-50 text-zinc-900 ring-2 ring-orange-100"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                    )}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                open ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-500"
                            )}>
                            <CalendarDays className="h-4 w-4" />
                        </div>

                        <span
                            className={cn("truncate text-left", value ? "font-medium text-zinc-900" : "text-zinc-400")}>
                            {formatDateDisplay(value, {
                                selectDate: t("datePicker.selectDate"),
                                today: t("datePicker.today"),
                                tomorrow: t("datePicker.tomorrow")
                            })}
                        </span>
                    </div>
                </button>
            </div>

            {popup}
        </>
    );
}

function DeletedDateRangePicker({
    value,
    onChange
}: {
    value: DeletedDateFilter;
    onChange: (next: DeletedDateFilter) => void;
}) {
    const t = useTranslations("TrashedPage");

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
                <span className="font-medium text-sm text-zinc-600">{t("filters.dateRange.fromDate")}</span>
                <input
                    type="date"
                    value={value.startDate}
                    max={value.endDate || undefined}
                    onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-300"
                />
            </label>

            <label className="flex flex-col gap-1.5">
                <span className="font-medium text-sm text-zinc-600">{t("filters.dateRange.toDate")}</span>
                <input
                    type="date"
                    value={value.endDate}
                    min={value.startDate || undefined}
                    onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-300"
                />
            </label>
        </div>
    );
}

type ConfirmModalProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmTone?: "orange" | "indigo";
};

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    confirmTone = "indigo"
}: ConfirmModalProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onCancel]);

    if (!(open && mounted)) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <h2 className="font-bold text-base text-zinc-900">{title}</h2>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{description}</p>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        className={cn(
                            "rounded-xl px-4 py-2 font-semibold text-sm text-white",
                            confirmTone === "orange"
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-indigo-600 hover:bg-indigo-700"
                        )}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RowMenu({
    open,
    onClose,
    onRestore,
    onDelete
}: {
    open: boolean;
    onClose: () => void;
    onRestore: () => void;
    onDelete: () => void;
}) {
    const t = useTranslations("TrashedPage");

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const onPointerDown = () => onClose();

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointerdown", onPointerDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="absolute top-10 right-0 z-20 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={onRestore}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold text-sm text-zinc-800 hover:bg-zinc-100">
                <RotateCcw className="h-5 w-5" />
                {t("actions.restore")}
            </button>

            <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold text-red-500 text-sm hover:bg-red-50">
                <Trash2 className="h-5 w-5" />
                {t("actions.deletePermanently")}
            </button>
        </div>
    );
}

function DeletedByPicker({
    options,
    selectedId,
    onSelect
}: {
    options: DeletedByOption[];
    selectedId: string | null;
    onSelect: (value: string | null) => void;
}) {
    const t = useTranslations("TrashedPage");
    const locale = useLocale();
    const [query, setQuery] = React.useState("");

    const filteredOptions = React.useMemo(() => {
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return options;
        return options.filter((option) => normalizeText(option.name).includes(normalizedQuery));
    }, [options, query]);

    React.useEffect(() => {
        setQuery("");
    }, [options]);

    return (
        <div className="p-2">
            <div className="sticky top-0 z-10 bg-white pb-2">
                <div className="relative">
                    <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={locale === "vi" ? "Tìm người xóa..." : "Search deleted by..."}
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-3 pl-9 text-sm text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={() => onSelect(null)}
                className={cn(
                    "mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition",
                    selectedId === null
                        ? "bg-orange-50 font-semibold text-orange-600"
                        : "font-medium text-zinc-700 hover:bg-zinc-50"
                )}>
                {t("filters.deletedBy.all")}
            </button>

            <div className="max-h-[154px] overflow-y-auto pr-1">
                {filteredOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-500">
                        {locale === "vi" ? "Không tìm thấy người phù hợp" : "No matching people found"}
                    </div>
                ) : (
                    filteredOptions.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelect(option.id)}
                            className={cn(
                                "mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition",
                                selectedId === option.id
                                    ? "bg-orange-50 font-semibold text-orange-600"
                                    : "font-medium text-zinc-700 hover:bg-zinc-50"
                            )}>
                            <span className="truncate">{option.name}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

function DeletedByFilterPopover({
    open,
    deletedByOptions,
    deletedByFilter,
    onChangeDeletedBy,
    onClose
}: {
    open: boolean;
    deletedByOptions: DeletedByOption[];
    deletedByFilter: string | null;
    onChangeDeletedBy: (value: string | null) => void;
    onClose: () => void;
}) {
    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const onPointerDown = () => onClose();

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointerdown", onPointerDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="absolute top-[calc(100%+10px)] right-0 z-30 flex max-h-[calc(100vh-240px)] w-[320px] flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
            onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto">
                <DeletedByPicker
                    options={deletedByOptions}
                    selectedId={deletedByFilter}
                    onSelect={(value) => {
                        onChangeDeletedBy(value);
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}

function DeletedDateFilterPopover({
    open,
    deletedDateFilter,
    onChangeDeletedDate,
    onClose
}: {
    open: boolean;
    deletedDateFilter: DeletedDateFilter;
    onChangeDeletedDate: (next: DeletedDateFilter) => void;
    onClose: () => void;
}) {
    const t = useTranslations("TrashedPage");

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const onPointerDown = () => onClose();

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointerdown", onPointerDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="absolute top-[calc(100%+10px)] right-0 z-30 flex max-h-[calc(100vh-240px)] w-[360px] flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
            onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto px-4 py-3">
                <DeletedDateRangePicker value={deletedDateFilter} onChange={onChangeDeletedDate} />
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-zinc-200 border-t bg-white px-4 py-4">
                <button
                    type="button"
                    onClick={() => onChangeDeletedDate({ startDate: "", endDate: "" })}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                    {t("filters.deletedDate.clearSelection")}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 font-semibold text-sm text-white shadow-[0_10px_24px_rgba(249,115,22,0.20)] transition hover:from-orange-600 hover:to-orange-700">
                    {t("filters.deletedDate.apply")}
                </button>
            </div>
        </div>
    );
}

const ITEMS_PER_PAGE = 10;

export default function Trashed() {
    const t = useTranslations("TrashedPage");
    const mapErrorMessage = React.useCallback(
        (message?: string | null) => {
            const code = String(message ?? "").trim();
            if (!code) return t("errors.unknown");
            if (code === "MISSING_API_BASE") return t("errors.missingApiBase");
            if (code === "INVALID_GROUP_ID") return t("errors.invalidGroupId");
            if (code === "INVALID_TASK_ID") return t("errors.invalidTaskId");
            if (code === "UNKNOWN_ERROR") return t("errors.unknown");
            return code;
        },
        [t]
    );

    const params = useParams<{ groupId: string }>();
    const groupId = params?.groupId ? String(params.groupId) : "";

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [items, setItems] = React.useState<TrashItem[]>([]);
    const [search, setSearch] = React.useState("");
    const [openMenuKey, setOpenMenuKey] = React.useState<string | null>(null);
    const [processingId, setProcessingId] = React.useState<string | null>(null);
    const [page, setPage] = React.useState(1);

    const [memberNameMap, setMemberNameMap] = React.useState<Record<string, string>>({});
    const [memberAvatarMap, setMemberAvatarMap] = React.useState<Record<string, string | null>>({});
    const [groupMembers, setGroupMembers] = React.useState<DeletedByOption[]>([]);
    const [deletedByFilter, setDeletedByFilter] = React.useState<string | null>(null);
    const [deletedDateFilter, setDeletedDateFilter] = React.useState<DeletedDateFilter>({
        startDate: "",
        endDate: ""
    });

    const [openDeletedByFilter, setOpenDeletedByFilter] = React.useState(false);
    const [openDeletedDateFilter, setOpenDeletedDateFilter] = React.useState(false);

    const [confirmRestore, setConfirmRestore] = React.useState<{
        open: boolean;
        taskId: string | null;
        taskName: string;
    }>({ open: false, taskId: null, taskName: "" });

    const [confirmDelete, setConfirmDelete] = React.useState<{
        open: boolean;
        taskId: string | null;
        taskName: string;
    }>({ open: false, taskId: null, taskName: "" });

    const refresh = React.useCallback(async () => {
        if (!groupId) {
            setLoading(false);
            setError(t("errors.missingGroupId"));
            return;
        }

        if (!isUuidLike(groupId)) {
            setLoading(false);
            setError(t("errors.invalidGroupId"));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [trashRes, membersRes] = await Promise.all([
                apiGetDeletedTasks(groupId),
                apiGetGroupMembers(groupId).catch(() => null)
            ]);

            const members = membersRes?.data?.members ?? [];
            const nextMemberNameMap: Record<string, string> = {};
            const nextMemberAvatarMap: Record<string, string | null> = {};

            for (const member of members) {
                const userId = String(member?.userId ?? "").trim();
                if (!userId) continue;

                const role = normalizeMemberRole(member?.role);
                if (!role || !["owner", "moderator", "member"].includes(role)) continue;

                const fullName = buildFullName(member?.firstName, member?.lastName, member?.email);
                nextMemberNameMap[userId] = fullName || member?.email || t("fallbacks.unknown");
                nextMemberAvatarMap[userId] = member?.avatarUrl ?? null;
            }

            setMemberNameMap(nextMemberNameMap);
            setMemberAvatarMap(nextMemberAvatarMap);
            setGroupMembers(
                Object.entries(nextMemberNameMap)
                    .map(([id, name]) => ({
                        id,
                        name,
                        avatarUrl: nextMemberAvatarMap[id] ?? null
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
            );

            const list = trashRes?.data ?? [];

            const mapped: TrashItem[] = (list ?? []).map((x, index) => {
                const id = String(x.deleteTaskId ?? "").trim();
                const deletedOnRaw = x.deletedOn ?? "";
                const deletedBy = x.deletedBy ?? null;
                const name = String(x.taskName ?? "").trim() || t("fallbacks.untitledTask");
                const deletedByName = deletedBy
                    ? (nextMemberNameMap[String(deletedBy)] ?? `${t("fallbacks.unknown")} (${String(deletedBy).slice(0, 8)})`)
                    : null;

                return {
                    id,
                    rowKey: `${id || "empty"}-${deletedOnRaw || index}`,
                    name,
                    type: "Task",
                    deletedOn: formatDeletedOn(x.deletedOn),
                    deletedOnRaw,
                    deletedBy,
                    deletedByName
                };
            });

            setItems(dedupeTrashItems(mapped.filter((x) => x.id)));
        } catch (e: any) {
            setError(mapErrorMessage(e?.message) || t("errors.cannotLoadTrash"));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [groupId, t, mapErrorMessage]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    React.useEffect(() => {
        setPage(1);
    }, [search, deletedByFilter, deletedDateFilter.startDate, deletedDateFilter.endDate]);

    const deletedByOptions = React.useMemo<DeletedByOption[]>(() => {
        return groupMembers;
    }, [groupMembers]);

    const filteredItems = React.useMemo(() => {
        const q = normalizeText(search);

        return items.filter((item) => {
            const nameText = normalizeText(item.name);
            const typeText = normalizeText(item.type);
            const deletedOnText = normalizeText(item.deletedOn);
            const deletedByText = normalizeText(
                `${item.deletedByName ?? ""} ${memberNameMap[String(item.deletedBy ?? "")] ?? ""} ${item.deletedBy ?? ""}`
            );

            const matchesText =
                !q ||
                nameText.includes(q) ||
                typeText.includes(q) ||
                deletedOnText.includes(q) ||
                deletedByText.includes(q);

            const matchesDeletedBy = !deletedByFilter || String(item.deletedBy ?? "") === deletedByFilter;
            const matchesDeletedDate = matchDeletedDate(item.deletedOnRaw, deletedDateFilter);

            return matchesText && matchesDeletedBy && matchesDeletedDate;
        });
    }, [items, search, memberNameMap, deletedByFilter, deletedDateFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const paginatedItems = React.useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, page]);

    const selectedDeletedByName =
        deletedByOptions.find((x) => x.id === deletedByFilter)?.name ||
        (deletedByFilter ? memberNameMap[deletedByFilter] || t("fallbacks.unknown") : "");

    const deletedDateLabel = [
        deletedDateFilter.startDate &&
        t("filters.deletedDate.fromDate", {
            date: formatDateDisplay(deletedDateFilter.startDate, {
                selectDate: t("datePicker.selectDate"),
                today: t("datePicker.today"),
                tomorrow: t("datePicker.tomorrow")
            })
        }),
        deletedDateFilter.endDate &&
        t("filters.deletedDate.toDate", {
            date: formatDateDisplay(deletedDateFilter.endDate, {
                selectDate: t("datePicker.selectDate"),
                today: t("datePicker.today"),
                tomorrow: t("datePicker.tomorrow")
            })
        })
    ]
        .filter(Boolean)
        .join(" ");

    const deletedByButtonLabel = selectedDeletedByName || t("filters.deletedBy.all");
    const deletedDateButtonLabel = deletedDateLabel || t("filters.deletedDate.label");

    const handleAskRestore = (item: TrashItem) => {
        setOpenMenuKey(null);
        setConfirmRestore({
            open: true,
            taskId: item.id,
            taskName: item.name
        });
    };

    const handleAskDelete = (item: TrashItem) => {
        setOpenMenuKey(null);
        setConfirmDelete({
            open: true,
            taskId: item.id,
            taskName: item.name
        });
    };

    const handleConfirmRestore = async () => {
        const taskId = confirmRestore.taskId;
        setConfirmRestore({ open: false, taskId: null, taskName: "" });

        if (!taskId) return;

        const prev = items;
        setProcessingId(taskId);
        setItems((current) => current.filter((x) => x.id !== taskId));

        try {
            await apiRestoreTask({ groupId, taskId });
        } catch (e: any) {
            setItems(prev);
            setError(mapErrorMessage(e?.message) || t("errors.cannotRestoreTask"));
            setProcessingId(null);
            return;
        }

        try {
            await refresh();
        } catch (e: any) {
            setError(mapErrorMessage(e?.message) || t("errors.cannotRefreshList"));
        } finally {
            setProcessingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        const taskId = confirmDelete.taskId;
        setConfirmDelete({ open: false, taskId: null, taskName: "" });

        if (!taskId) return;

        const prev = items;
        setProcessingId(taskId);
        setItems((current) => current.filter((x) => x.id !== taskId));

        try {
            await apiPermanentDeleteTask({ groupId, taskId });
        } catch (e: any) {
            setItems(prev);
            setError(mapErrorMessage(e?.message) || t("errors.cannotDeleteTaskPermanently"));
            setProcessingId(null);
            return;
        }

        try {
            await refresh();
        } catch (e: any) {
            setError(mapErrorMessage(e?.message) || t("errors.cannotRefreshList"));
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-transparent px-8 py-6">
                <Container>
                    <div className="pt-8">
                        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
                            <div className="animate-pulse space-y-4">
                                <div className="h-10 w-48 rounded bg-zinc-200" />
                                <div className="h-11 w-full max-w-[680px] rounded-xl bg-zinc-200" />
                                <div className="h-64 rounded-2xl bg-zinc-100" />
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-zinc-50">
                <Container>
                    <div className="pt-8">
                        <div className="rounded-3xl border border-rose-200 bg-white p-6 text-rose-700 text-sm shadow-sm">
                            {error}
                        </div>
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => void refresh()}
                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-sm text-zinc-900 hover:bg-zinc-100">
                                {t("actions.reload")}
                            </button>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="bg-transparent px-8 py-6 pb-24">
            <ConfirmModal
                open={confirmRestore.open}
                title={t("confirm.restore.title")}
                description={t("confirm.restore.description", { taskName: confirmRestore.taskName })}
                confirmLabel={t("actions.restore")}
                cancelLabel={t("common.cancel")}
                confirmTone="orange"
                onConfirm={() => void handleConfirmRestore()}
                onCancel={() => setConfirmRestore({ open: false, taskId: null, taskName: "" })}
            />

            <ConfirmModal
                open={confirmDelete.open}
                title={t("confirm.delete.title")}
                description={t("confirm.delete.description", { taskName: confirmDelete.taskName })}
                confirmLabel={t("actions.deletePermanently")}
                cancelLabel={t("common.cancel")}
                confirmTone="orange"
                onConfirm={() => void handleConfirmDelete()}
                onCancel={() => setConfirmDelete({ open: false, taskId: null, taskName: "" })}
            />

            <Container className="rounded-3xl border border-[#F3E4D7]">
                <div className="pt-8 pb-8 ">
                    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
                        <h1 className="font-bold text-[40px] text-zinc-900 tracking-tight">{t("title")}</h1>

                        <div className="mt-8 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                            <div className="relative w-full">
                                <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t("search.placeholder")}
                                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50/70 pr-4 pl-11 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white"
                                />
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenDeletedByFilter((prev) => !prev);
                                        setOpenDeletedDateFilter(false);
                                    }}
                                    className={cn(
                                        "inline-flex h-12 min-w-[220px] items-center justify-between gap-3 rounded-2xl border bg-white px-4 font-medium text-sm transition",
                                        openDeletedByFilter
                                            ? "border-zinc-300 bg-zinc-50 text-zinc-900"
                                            : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                    )}
                                    aria-label={t("filters.deletedBy.label")}>
                                    <span className="truncate text-left">{deletedByButtonLabel}</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-indigo-400" />
                                </button>

                                <DeletedByFilterPopover
                                    open={openDeletedByFilter}
                                    deletedByOptions={deletedByOptions}
                                    deletedByFilter={deletedByFilter}
                                    onChangeDeletedBy={setDeletedByFilter}
                                    onClose={() => setOpenDeletedByFilter(false)}
                                />
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenDeletedDateFilter((prev) => !prev);
                                        setOpenDeletedByFilter(false);
                                    }}
                                    className={cn(
                                        "inline-flex h-12 min-w-[220px] items-center justify-between gap-3 rounded-2xl border bg-white px-4 font-medium text-sm transition",
                                        openDeletedDateFilter
                                            ? "border-zinc-300 bg-zinc-50 text-zinc-900"
                                            : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                    )}
                                    aria-label={t("filters.deletedDate.label")}>
                                    <span className="truncate text-left">{deletedDateButtonLabel}</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-indigo-400" />
                                </button>

                                <DeletedDateFilterPopover
                                    open={openDeletedDateFilter}
                                    deletedDateFilter={deletedDateFilter}
                                    onChangeDeletedDate={setDeletedDateFilter}
                                    onClose={() => setOpenDeletedDateFilter(false)}
                                />
                            </div>
                        </div>

                        <div className="mt-8 overflow-x-auto">
                            <table className="min-w-full table-fixed border-separate border-spacing-0">
                                <thead>
                                    <tr>
                                        <th className="w-[20%] border-zinc-200 border-b px-8 py-4 text-center font-bold text-xs text-zinc-500 uppercase tracking-wide">
                                            {t("table.headers.name")}
                                        </th>
                                        <th className="w-[10%] border-zinc-200 border-b px-4 py-4 text-center font-bold text-xs text-zinc-500 uppercase tracking-wide">
                                            {t("table.headers.type")}
                                        </th>
                                        <th className="w-[28%] border-zinc-200 border-b px-4 py-4 text-center font-bold text-xs text-zinc-500 uppercase tracking-wide">
                                            {t("table.headers.deletedTime")}
                                        </th>
                                        <th className="w-[34%] border-zinc-200 border-b px-4 py-4 text-center font-bold text-xs text-zinc-500 uppercase tracking-wide">
                                            {t("table.headers.deletedBy")}
                                        </th>
                                        <th className="w-[8%] border-zinc-200 border-b px-4 py-4" />
                                    </tr>
                                </thead>

                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                                                {t("table.noData")}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item) => {
                                            const displayDeletedBy =
                                                item.deletedByName ||
                                                memberNameMap[String(item.deletedBy ?? "")] ||
                                                t("fallbacks.unknown");

                                            const initials = getInitials(displayDeletedBy);
                                            const tone = pickAvatarTone(displayDeletedBy || item.rowKey);
                                            const avatarUrl = item.deletedBy
                                                ? memberAvatarMap[String(item.deletedBy)]
                                                : null;
                                            const hasAvatar = avatarUrl && String(avatarUrl).trim();

                                            return (
                                                <tr key={item.rowKey}>
                                                    <td className="border-zinc-100 border-b px-8 py-8 text-center align-middle">
                                                        <div className="mx-auto max-w-[150px] truncate font-semibold text-base text-zinc-900">
                                                            {item.name}
                                                        </div>
                                                    </td>

                                                    <td className="border-zinc-100 border-b px-4 py-8 text-center align-middle text-base text-zinc-500">
                                                        {item.type}
                                                    </td>

                                                    <td className="border-zinc-100 border-b px-4 py-8 text-center align-middle text-base text-zinc-500">
                                                        <div className="inline-flex items-center gap-2">
                                                            <CalendarDays className="h-4 w-4 text-zinc-400" />
                                                            <span>{item.deletedOn}</span>
                                                        </div>
                                                    </td>

                                                    <td className="border-zinc-100 border-b px-4 py-8 align-middle">
                                                        <div className="flex items-center justify-center gap-3">
                                                            {hasAvatar ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt={displayDeletedBy}
                                                                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className={cn(
                                                                        "grid h-12 w-12 shrink-0 place-items-center rounded-full font-bold text-base text-white",
                                                                        tone
                                                                    )}
                                                                    title={displayDeletedBy}>
                                                                    {initials}
                                                                </div>
                                                            )}
                                                            <div className="max-w-[220px] truncate font-medium text-base text-zinc-800">
                                                                {displayDeletedBy}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="border-zinc-100 border-b px-4 py-8 text-center align-middle">
                                                        <div className="relative flex justify-center">
                                                            <button
                                                                type="button"
                                                                disabled={processingId === item.id}
                                                                onClick={() =>
                                                                    setOpenMenuKey((prev) =>
                                                                        prev === item.rowKey ? null : item.rowKey
                                                                    )
                                                                }
                                                                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
                                                                aria-label={t("actions.moreOptions")}>
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </button>

                                                            <RowMenu
                                                                open={openMenuKey === item.rowKey}
                                                                onClose={() => setOpenMenuKey(null)}
                                                                onRestore={() => handleAskRestore(item)}
                                                                onDelete={() => handleAskDelete(item)}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={cn(paginatedItems.length === 0 ? "mt-5" : "mt-8")}>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page <= 1}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
                                    <ChevronLeft className="h-4 w-4" />
                                    {t("pagination.previous")}
                                </button>

                                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-center font-medium text-sm text-zinc-700 shadow-sm">
                                    {t("pagination.pageInfo", { page, totalPages, totalCount: filteredItems.length })}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={page >= totalPages}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
                                    {t("pagination.next")}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}

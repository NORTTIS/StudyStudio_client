"use client";

import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Loader2,
    MessageSquare,
    Paperclip,
    SendHorizontal,
    X
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { components } from "@/api/types";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type UserDto = {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
    progress?: number;
    taskDescription?: string | null;
    assignee?: UserDto | null;
    groupStatus?: { groupId?: string; statusId?: string; position?: number; statusName?: string | null } | null;
};

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
    taskList?: TaskItemResponse[] | null;
};

type StatusOption = {
    statusId: string;
    statusName: string;
};

type GroupMemberDto = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
};

type GroupMemberListResponse = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberDto[] | null;
    totalMembers?: number;
};

type UserProfileResponse = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type GroupDetailResponse = {
    groupId?: string;
    groupName?: string | null;
    taskStatuses?: TaskStatusDto[] | null;
};

export type TaskDetail = {
    id: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    assigneeAvatarUrl?: string | null;
    statusId?: string | null;
    statusName?: string | null;
    priorityValue: number;
    priorityLabel: string;
    severityValue: number;
    severityLabel: string;
    progressValue: number;
    progressLabel: string;
    startDateRaw?: string | null;
    dueDateRaw?: string | null;
    startDateFmt?: string | null;
    dueDateFmt?: string | null;
    raw?: unknown;
};

type TaskCommentDto = {
    commentId?: string;
    content?: string | null;
    createdAt?: string;
    updatedAt?: string | null;
    isDeleted?: boolean;
    user?: UserDto;
    userId?: string;
};

type TaskCommentListResponse = {
    taskId?: string;
    totalComments?: number;
    comments?: TaskCommentDto[] | null;
};

type UpdateTaskRequest = components["schemas"]["UpdateTaskRequest"];

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
    disabled?: boolean;
};

const monthOptions = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
] as const;

const TASK_TITLE_MAX_LENGTH = 25;
const PROGRESS_OPTIONS = [0, 25, 50, 75, 100] as const;

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

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

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

function parseMaybeJson(raw: string) {
    const text = (raw ?? "").toString().trim();
    if (!text) return { json: null as unknown, text: "" };
    try {
        const cleaned = text.replace(/^\uFEFF/, "");
        return { json: JSON.parse(cleaned), text };
    } catch {
        return { json: null as unknown, text };
    }
}

function getErrorMessage(e: unknown, fallback: string) {
    if (e instanceof Error && e.message.trim()) return e.message;
    return fallback;
}

function asObject(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

const okByJsonStatus = (obj: unknown) => {
    const value = asObject(obj)?.status;
    const s = String(value ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: unknown) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    if (msg) return msg;
    const t = (text ?? "").toString().trim();
    return t || "Đã xảy ra lỗi";
};

function formatDisplayDate(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    if (s.startsWith("0001-01-01")) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function initials(u?: UserDto) {
    const fn = (u?.firstName ?? "").trim();
    const ln = (u?.lastName ?? "").trim();
    const a = fn ? fn[0] : "";
    const b = ln ? ln[0] : "";
    const out = (a + b).toUpperCase();
    return out || "U";
}

function fullName(u?: UserDto | null) {
    if (!u) return null;
    const s = `${(u.firstName ?? "").trim()} ${(u.lastName ?? "").trim()}`.trim();
    return s || null;
}

function priorityLabelOf(n?: number) {
    if (n === 0) return "Low";
    if (n === 1) return "Medium";
    if (n === 2) return "High";
    return "Low";
}

function severityLabelOf(n?: number) {
    if (n === 0) return "Minor";
    if (n === 1) return "Moderate";
    if (n === 2) return "Major";
    if (n === 3) return "Critical";
    return "Minor";
}

function progressLabelOf(n?: number) {
    const value = normalizeProgressValue(n);
    if (value === 0) return "To do";
    if (value < 50) return "Started";
    if (value < 75) return "In progress";
    if (value < 100) return "Review";
    return "Done";
}

function normalizePriorityValue(n?: number) {
    if (n === 0 || n === 1 || n === 2) return n;
    return 0;
}

function normalizeSeverityValue(n?: number) {
    if (n === 0 || n === 1 || n === 2 || n === 3) return n;
    return 0;
}

function normalizeProgressValue(n?: number) {
    if (typeof n !== "number" || !Number.isFinite(n)) return 0;
    const value = Math.floor(n);
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function sanitizeProgressInput(value: string) {
    const digits = value.replace(/\D+/g, "");

    if (digits === "") return "";

    if (digits === "100") return "100";

    if (digits.startsWith("100")) return "100";

    return digits.slice(0, 2);
}

function clampProgressInput(value: string) {
    if (value === "") return "";

    if (value === "100") return "100";

    const n = Number(value);

    if (!Number.isFinite(n)) return "";

    return String(Math.min(Math.max(Math.floor(n), 0), 100));
}

function relativeTimeOf(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = d.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
    if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
    return rtf.format(Math.round(diffMs / day), "day");
}

function priorityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "high") return "text-rose-600";
    if (v === "medium") return "text-amber-700";
    if (v === "low") return "text-emerald-700";
    return "text-zinc-700";
}

function severityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "critical") return "text-red-600";
    if (v === "major") return "text-orange-600";
    if (v === "moderate") return "text-yellow-500";
    if (v === "minor") return "text-sky-600";
    return "text-zinc-700";
}

const selectItemClassName =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";

function toDateInputValue(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s || s.startsWith("0001-01-01")) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function safeAvatarUrl(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return "";
    return raw.replace("localhost", "127.0.0.1");
}

function buildInitials(name?: string | null) {
    const s = String(name ?? "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${a}${b}`.toUpperCase() || "U";
}

function parseDateString(value?: string) {
    if (!value) return undefined;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return undefined;
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

function formatDateDisplay(value?: string) {
    const date = parseDateString(value);
    if (!date) return "Select a date";
    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    }).format(target);
}

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return null;
}

function getGroupIdFromParams(params: Record<string, string | string[] | undefined>) {
    const direct = readParam(params, "groupId") || readParam(params, "id") || readParam(params, "slug") || null;
    if (direct) return direct;
    const firstKey = Object.keys(params).find((k) => {
        const value = params[k];
        return typeof value === "string" || (Array.isArray(value) && typeof value[0] === "string");
    });
    return firstKey ? readParam(params, firstKey) : null;
}

function TrelloDatePicker({ label, value, onChange, min, disabled = false }: TrelloDatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(null);
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const selectedDate = React.useMemo(() => parseDateString(value), [value]);
    const minDate = React.useMemo(() => parseDateString(min), [min]);
    const initialMonth = React.useMemo(() => selectedDate ?? minDate ?? new Date(), [selectedDate, minDate]);
    const [month, setMonth] = React.useState<Date>(initialMonth);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (open) {
            setMonth(selectedDate ?? minDate ?? new Date());
        }
    }, [open, selectedDate, minDate]);

    React.useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const updatePopupPosition = React.useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const popupWidth = 420;
        const viewportPadding = 16;
        const top = 20;

        let left = rect.left;
        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }
        if (left < viewportPadding) {
            left = viewportPadding;
        }

        setPopupPosition({
            top,
            left,
            width: Math.min(popupWidth, window.innerWidth - viewportPadding * 2)
        });
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

        const handleReposition = () => updatePopupPosition();

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEsc);
        window.addEventListener("resize", handleReposition);
        window.addEventListener("scroll", handleReposition, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEsc);
            window.removeEventListener("resize", handleReposition);
            window.removeEventListener("scroll", handleReposition, true);
        };
    }, [open, updatePopupPosition]);

    const pickDate = (date?: Date) => {
        if (!date) return;
        const normalized = startOfDay(date);
        if (minDate && normalized < startOfDay(minDate)) return;
        onChange(formatDateToInputValue(normalized));
        setOpen(false);
    };

    const yearOptions = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = Math.min(minDate?.getFullYear() ?? currentYear - 5, currentYear - 5);
        const endYear = currentYear + 10;
        return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    }, [minDate]);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextMonth = Number(e.target.value);
        setMonth(new Date(month.getFullYear(), nextMonth, 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextYear = Number(e.target.value);
        setMonth(new Date(nextYear, month.getMonth(), 1));
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

    const portalTarget = typeof document !== "undefined" ? document.body : null;

    const popup =
        mounted && open && popupPosition && portalTarget
            ? createPortal(
                <div
                    ref={rootRef}
                    className="fixed z-[20000] rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                    style={{
                        top: popupPosition.top,
                        left: popupPosition.left,
                        width: popupPosition.width,
                        maxHeight: "calc(100vh - 40px)",
                        overflowY: "auto"
                    }}
                >
                    <div className="mb-4 flex items-center gap-3">
                        <div className="relative flex-1">
                            <select
                                value={month.getMonth()}
                                onChange={handleMonthChange}
                                className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 text-base font-semibold text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400"
                            >
                                {monthOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
                        </div>
                        <div className="relative w-[140px]">
                            <select
                                value={month.getFullYear()}
                                onChange={handleYearChange}
                                className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 text-base font-semibold text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400"
                            >
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
                        </div>
                    </div>

                    <div className="rounded-[20px] border border-zinc-200 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goPrevMonth}
                                disabled={isPrevDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="text-[18px] font-bold text-zinc-900">
                                {monthOptions[month.getMonth()]?.label} {month.getFullYear()}
                            </div>
                            <button
                                type="button"
                                onClick={goNextMonth}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        <DayPicker
                            mode="single"
                            month={month}
                            onMonthChange={setMonth}
                            selected={selectedDate}
                            onSelect={pickDate}
                            disabled={minDate ? { before: minDate } : undefined}
                            showOutsideDays
                            className="w-full"
                            styles={{
                                day: {
                                    outline: "none",
                                    boxShadow: "none"
                                },
                                button: {
                                    outline: "none",
                                    boxShadow: "none"
                                }
                            }}
                            classNames={{
                                months: "flex w-full flex-col",
                                month: "w-full space-y-3",
                                caption: "hidden",
                                table: "w-full border-collapse",
                                tbody: "w-full",
                                head_row: "flex w-full justify-between",
                                head_cell: "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                row: "mt-2 flex w-full justify-between",
                                cell: "h-10 w-10 p-0 text-center",
                                day: "h-10 w-10 rounded-xl border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 shadow-none outline-none ring-0 transition hover:bg-orange-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                                day_button:
                                    "h-10 w-10 rounded-xl border-0 bg-transparent p-0 font-medium text-inherit shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                                selected: "!bg-orange-500 !text-white",
                                day_selected:
                                    "!bg-orange-500 !text-white hover:!bg-orange-500 hover:!text-white focus:!bg-orange-500 focus:!text-white focus-visible:!bg-orange-500 focus-visible:!text-white",
                                today: "text-orange-600 font-bold",
                                day_today: "text-orange-600 font-bold",
                                outside: "text-zinc-300",
                                day_outside: "text-zinc-300",
                                disabled: "text-zinc-300 opacity-40",
                                day_disabled: "text-zinc-300 opacity-40",
                                hidden: "invisible",
                                day_hidden: "invisible"
                            }}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => pickDate(new Date())}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 1))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Tomorrow
                        </button>
                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 7))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Next week
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-rose-500 hover:bg-rose-50"
                        >
                            No date
                        </button>
                    </div>
                </div>,
                portalTarget
            )
            : null;

    return (
        <>
            <div className="relative">
                <div className="text-sm font-semibold text-zinc-600">{label}</div>
                <button
                    ref={triggerRef}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        if (!disabled) setOpen((v) => !v);
                    }}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-500 opacity-70"
                            : open
                                ? "border-orange-400 bg-orange-50 text-zinc-900 ring-2 ring-orange-100"
                                : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                disabled
                                    ? "bg-zinc-100 text-zinc-400"
                                    : open
                                        ? "bg-orange-100 text-orange-600"
                                        : "bg-zinc-100 text-zinc-500"
                            )}
                        >
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <span
                            className={cn(
                                "truncate text-left",
                                value ? "font-medium text-zinc-900" : "text-zinc-400",
                                disabled && "text-zinc-500"
                            )}
                        >
                            {formatDateDisplay(value)}
                        </span>
                    </div>
                </button>
            </div>
            {popup}
        </>
    );
}

async function apiGetGroupDetail(groupId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/detail`);
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }
    return (json ?? null) as ApiResponse<GroupDetailResponse> | null;
}

function findTaskInGroupDetail(detail: GroupDetailResponse | null | undefined, taskId: string) {
    const statuses = detail?.taskStatuses ?? [];
    for (const st of statuses) {
        const list = st?.taskList ?? [];
        const found = list.find((t) => String(t?.taskId ?? "") === taskId);
        if (found) return { task: found, statusName: st?.statusName ?? null, statusId: st?.statusId ?? null };
    }
    return null;
}

function mapTaskDetailFromTaskItem(
    task: TaskItemResponse,
    taskId: string,
    fallbackStatusName?: string | null,
    fallbackStatusId?: string | null
): TaskDetail {
    const title = String(task?.taskTitle ?? "").trim() || "Task";
    const description = task?.taskDescription ?? null;
    const assigneeName = fullName(task?.assignee) ?? null;
    const statusFromTask = String(task?.groupStatus?.statusName ?? "").trim();
    const statusFromColumn = String(fallbackStatusName ?? "").trim();
    const statusName = statusFromTask || statusFromColumn || null;
    const statusId = String(task?.groupStatus?.statusId ?? fallbackStatusId ?? "").trim() || null;
    const priorityValue = normalizePriorityValue(task?.taskPriority);
    const severityValue = normalizeSeverityValue(task?.taskSeverity);
    const progressValue = normalizeProgressValue(task?.progress);
    const priorityLabel = priorityLabelOf(priorityValue);
    const severityLabel = severityLabelOf(severityValue);
    const progressLabel = progressLabelOf(progressValue);
    const startDateRaw = task?.startDate ?? null;
    const dueDateRaw = task?.dueDate ?? null;
    const startFmt = startDateRaw ? formatDisplayDate(String(startDateRaw)) : "";
    const dueFmt = dueDateRaw ? formatDisplayDate(String(dueDateRaw)) : "";

    return {
        id: String(task?.taskId ?? taskId),
        title,
        description: description != null ? String(description) : null,
        assigneeId: task?.assignee?.id ?? null,
        assigneeName,
        assigneeAvatarUrl: task?.assignee?.avatarUrl ?? null,
        statusId,
        statusName,
        priorityValue,
        priorityLabel,
        severityValue,
        severityLabel,
        progressValue,
        progressLabel,
        startDateRaw,
        dueDateRaw,
        startDateFmt: startFmt,
        dueDateFmt: dueFmt,
        raw: task
    };
}

function mapStatusOptions(detail: GroupDetailResponse | null | undefined): StatusOption[] {
    return (detail?.taskStatuses ?? [])
        .map((s) => {
            const statusId = String(s?.statusId ?? "").trim();
            const statusName = String(s?.statusName ?? "").trim();
            if (!statusId) return null;
            if (!statusName) return null;
            return { statusId, statusName };
        })
        .filter((s): s is StatusOption => s != null);
}

async function apiGetTaskDetailFromGroup(groupId: string, taskId: string) {
    const resp = await apiGetGroupDetail(groupId);
    const group = resp?.data ?? null;
    const hit = findTaskInGroupDetail(group, taskId);
    if (!hit) throw new Error("Không tìm thấy task trong group");
    return {
        task: mapTaskDetailFromTaskItem(hit.task, taskId, hit.statusName, hit.statusId),
        statusOptions: mapStatusOptions(group)
    };
}

async function apiGetGroupMembers(groupId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }
    return (json ?? null) as ApiResponse<GroupMemberListResponse> | null;
}

async function apiGetMyProfile() {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl("/user-profile");
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }
    return (json ?? null) as ApiResponse<UserProfileResponse> | null;
}

async function apiGetTaskComments(taskId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl(`/task-comments/${encodeURIComponent(taskId)}?limit=50&offset=0`);
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }
    return (json ?? null) as ApiResponse<TaskCommentListResponse> | null;
}

function toApiDateTimeOrNull(input: string) {
    const s = String(input ?? "").trim();
    if (!s) return null;
    return `${s}T00:00:00`;
}

async function apiUpdateTask(args: {
    groupId: string;
    taskId: string;
    payload: UpdateTaskRequest;
}) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");
    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}`);
    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(args.payload)
    });
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }
    return json;
}

export default function TaskDetailModal(props: {
    open: boolean;
    onClose: () => void;
    taskId: string | null;
    onDelete?: (taskId: string) => void;
    onSaved?: () => Promise<void> | void;
}) {
    const { open, onClose, taskId, onSaved } = props;
    const params = useParams<Record<string, string | string[] | undefined>>();
    const groupId = React.useMemo(() => getGroupIdFromParams(params ?? {}), [params]);

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [detailError, setDetailError] = React.useState<string | null>(null);
    const [task, setTask] = React.useState<TaskDetail | null>(null);

    const [loadingComments, setLoadingComments] = React.useState(false);
    const [comments, setComments] = React.useState<TaskCommentDto[]>([]);
    const [commentError, setCommentError] = React.useState<string | null>(null);
    const [commentDraft, setCommentDraft] = React.useState("");

    const [statusOptions, setStatusOptions] = React.useState<StatusOption[]>([]);
    const [members, setMembers] = React.useState<GroupMemberDto[]>([]);
    const [membersError, setMembersError] = React.useState<string | null>(null);
    const [myAvatarUrl, setMyAvatarUrl] = React.useState("");

    const [assigneeId, setAssigneeId] = React.useState("");
    const [statusId, setStatusId] = React.useState("");
    const [taskName, setTaskName] = React.useState("");
    const [priority, setPriority] = React.useState("");
    const [severity, setSeverity] = React.useState("");
    const [progress, setProgress] = React.useState("0");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [description, setDescription] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);

    const handleSendComment = () => {
        setCommentDraft("");
    };

    const handleProgressInputChange = (value: string) => {
        setProgress(sanitizeProgressInput(value));
    };

    const handleProgressInputBlur = () => {
        setProgress((prev) => clampProgressInput(prev));
    };

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    React.useEffect(() => {
        if (!open) return;
        setIsEditing(false);
    }, [open, taskId]);

    React.useEffect(() => {
        if (!open || !taskId) return;
        let alive = true;

        (async () => {
            setLoadingDetail(true);
            setDetailError(null);
            try {
                if (!groupId) throw new Error("Thiếu groupId từ route");
                const result = await apiGetTaskDetailFromGroup(groupId, taskId);
                if (!alive) return;
                setTask(result.task);
                setStatusOptions(result.statusOptions);
            } catch (e: unknown) {
                if (!alive) return;
                setDetailError(getErrorMessage(e, "Không tải được task detail"));
                setTask(null);
                setStatusOptions([]);
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId, groupId]);

    React.useEffect(() => {
        if (!open || !taskId) return;
        let alive = true;

        (async () => {
            setLoadingComments(true);
            setCommentError(null);
            try {
                const resp = await apiGetTaskComments(taskId);
                const list = (resp?.data?.comments ?? []) as TaskCommentDto[];
                if (!alive) return;
                setComments((list ?? []).filter((c) => !c?.isDeleted));
            } catch (e: unknown) {
                if (!alive) return;
                setCommentError(getErrorMessage(e, "Không tải được comments"));
                setComments([]);
            } finally {
                if (alive) setLoadingComments(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId]);

    React.useEffect(() => {
        if (!open || !groupId) return;
        let alive = true;

        (async () => {
            setMembersError(null);
            try {
                const resp = await apiGetGroupMembers(groupId);
                const list = resp?.data?.members ?? [];
                if (!alive) return;
                setMembers((list ?? []).filter((m) => !!String(m?.userId ?? "").trim()));
            } catch (e: unknown) {
                if (!alive) return;
                setMembersError(getErrorMessage(e, "Không tải được danh sách thành viên"));
                setMembers([]);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, groupId]);

    React.useEffect(() => {
        if (!open) return;
        let alive = true;

        (async () => {
            try {
                const resp = await apiGetMyProfile();
                if (!alive) return;
                setMyAvatarUrl(safeAvatarUrl(resp?.data?.avatarUrl ?? ""));
            } catch {
                if (!alive) return;
                setMyAvatarUrl("");
            }
        })();

        return () => {
            alive = false;
        };
    }, [open]);

    React.useEffect(() => {
        setTaskName(task?.title ?? "");
        setAssigneeId(task?.assigneeId ?? "");
        setStatusId(task?.statusId ?? "");
        setPriority(String(normalizePriorityValue(task?.priorityValue)));
        setSeverity(String(normalizeSeverityValue(task?.severityValue)));
        setProgress(String(normalizeProgressValue(task?.progressValue)));
        setStartDate(toDateInputValue(task?.startDateRaw));
        setDueDate(toDateInputValue(task?.dueDateRaw));
        setDescription(task?.description ?? "");
        setSaveError(null);
        setIsEditing(false);
    }, [task]);

    const assigneeOptions = React.useMemo(
        () =>
            members.map((m) => {
                const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
                return {
                    userId: String(m.userId ?? ""),
                    label: name || m.email || "Unnamed",
                    avatarUrl: safeAvatarUrl(m.avatarUrl)
                };
            }),
        [members]
    );

    const selectedAssignee = React.useMemo(
        () => assigneeOptions.find((m) => m.userId === assigneeId) ?? null,
        [assigneeOptions, assigneeId]
    );

    const selectedAssigneeDisplay = React.useMemo(() => {
        if (selectedAssignee) return selectedAssignee;
        if (task?.assigneeId && task.assigneeName) {
            return {
                userId: task.assigneeId,
                label: task.assigneeName,
                avatarUrl: safeAvatarUrl(task.assigneeAvatarUrl)
            };
        }
        return { userId: "", label: "Unassigned", avatarUrl: "" };
    }, [selectedAssignee, task?.assigneeAvatarUrl, task?.assigneeId, task?.assigneeName]);

    const selectedStatusName = React.useMemo(() => {
        const hit = statusOptions.find((s) => s.statusId === statusId);
        return hit?.statusName ?? task?.statusName ?? "—";
    }, [statusId, statusOptions, task?.statusName]);

    const selectedPriorityValue = React.useMemo(() => normalizePriorityValue(Number(priority)), [priority]);
    const selectedPriorityLabel = React.useMemo(() => priorityLabelOf(selectedPriorityValue), [selectedPriorityValue]);

    const selectedSeverityValue = React.useMemo(() => normalizeSeverityValue(Number(severity)), [severity]);
    const selectedSeverityLabel = React.useMemo(() => severityLabelOf(selectedSeverityValue), [selectedSeverityValue]);

    const selectedProgressValue = React.useMemo(() => {
        if (progress === "") return 0;
        return normalizeProgressValue(Number(progress));
    }, [progress]);

    const selectedProgressLabel = React.useMemo(() => progressLabelOf(selectedProgressValue), [selectedProgressValue]);

    const handleSave = async () => {
        setSaveError(null);

        const taskNameTrimmed = taskName.trim().slice(0, TASK_TITLE_MAX_LENGTH);
        if (!taskNameTrimmed) {
            setSaveError("Tên task là bắt buộc.");
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setSaveError("Start Date phải nhỏ hơn hoặc bằng Due Date.");
            return;
        }

        if (groupId == null || taskId == null) {
            setSaveError("Thiếu groupId hoặc taskId.");
            return;
        }

        const normalizedProgressValue =
            progress === "" ? 0 : normalizeProgressValue(Number(clampProgressInput(progress)));

        try {
            setSubmitting(true);

            await apiUpdateTask({
                groupId,
                taskId,
                payload: {
                    taskName: taskNameTrimmed,
                    taskDescription: description.trim() || null,
                    assigneeId: assigneeId || null,
                    groupStatusId: statusId || null,
                    startDate: toApiDateTimeOrNull(startDate),
                    dueDate: toApiDateTimeOrNull(dueDate),
                    taskPriority: selectedPriorityValue,
                    taskSeverity: selectedSeverityValue,
                    progress: normalizedProgressValue
                }
            });

            setTask((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    title: taskNameTrimmed,
                    assigneeId: assigneeId || null,
                    assigneeName: selectedAssignee?.label ?? null,
                    assigneeAvatarUrl: selectedAssignee?.avatarUrl ?? null,
                    statusId: statusId || null,
                    statusName: selectedStatusName,
                    priorityValue: selectedPriorityValue,
                    priorityLabel: selectedPriorityLabel,
                    severityValue: selectedSeverityValue,
                    severityLabel: selectedSeverityLabel,
                    progressValue: normalizedProgressValue,
                    progressLabel: progressLabelOf(normalizedProgressValue),
                    startDateRaw: startDate ? toApiDateTimeOrNull(startDate) : null,
                    dueDateRaw: dueDate ? toApiDateTimeOrNull(dueDate) : null,
                    startDateFmt: startDate ? formatDisplayDate(startDate) : "",
                    dueDateFmt: dueDate ? formatDisplayDate(dueDate) : "",
                    description: description.trim() || null
                };
            });

            setProgress(String(normalizedProgressValue));

            await onSaved?.();
            setIsEditing(false);
        } catch (e: unknown) {
            setSaveError(getErrorMessage(e, "Không cập nhật được task"));
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;
    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-zinc-200 px-7 py-5">
                    <div className="min-w-0 flex-1">
                        {loadingDetail ? (
                            <h2 className="min-w-0 truncate text-[30px] font-extrabold leading-none text-zinc-900">
                                Loading...
                            </h2>
                        ) : isEditing ? (
                            <input
                                value={taskName}
                                maxLength={TASK_TITLE_MAX_LENGTH}
                                onChange={(e) => setTaskName(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH))}
                                placeholder="Task name"
                                className="w-full max-w-[600px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[28px] font-extrabold leading-none text-zinc-900 outline-none"
                            />
                        ) : (
                            <h2 className="min-w-0 break-words text-[30px] font-extrabold leading-none text-zinc-900">
                                {taskName || "Task"}
                            </h2>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-5">
                    {detailError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                            {detailError}
                        </div>
                    ) : null}

                    {loadingDetail ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải…
                        </div>
                    ) : null}

                    {membersError ? (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                            {membersError}
                        </div>
                    ) : null}

                    {saveError ? (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                            {saveError}
                        </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <div className="text-sm font-semibold text-zinc-600">Assignee</div>
                            <Select
                                value={assigneeId || "unassigned"}
                                onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}
                                disabled={!isEditing}
                            >
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {selectedAssigneeDisplay.avatarUrl ? (
                                            <Image
                                                src={selectedAssigneeDisplay.avatarUrl}
                                                alt={selectedAssigneeDisplay.label}
                                                width={24}
                                                height={24}
                                                unoptimized
                                                className="h-6 w-6 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                                                {buildInitials(selectedAssigneeDisplay.label)}
                                            </div>
                                        )}
                                        <span className="truncate">{selectedAssigneeDisplay.label}</span>
                                    </div>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-[260px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl"
                                >
                                    <SelectItem value="unassigned" className={selectItemClassName}>
                                        <div className="flex items-center gap-2">
                                            <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                                                U
                                            </div>
                                            <span>Unassigned</span>
                                        </div>
                                    </SelectItem>

                                    {assigneeOptions.map((m) => (
                                        <SelectItem key={m.userId} value={m.userId} className={selectItemClassName}>
                                            <div className="flex items-center gap-2">
                                                {m.avatarUrl ? (
                                                    <Image
                                                        src={m.avatarUrl}
                                                        alt={m.label}
                                                        width={24}
                                                        height={24}
                                                        unoptimized
                                                        className="h-6 w-6 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                                                        {buildInitials(m.label)}
                                                    </div>
                                                )}
                                                <span className="truncate">{m.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="text-sm font-semibold text-zinc-600">Status</div>
                            <Select
                                value={statusId || "no-status"}
                                onValueChange={(v) => setStatusId(v === "no-status" ? "" : v)}
                                disabled={!isEditing}
                            >
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className="truncate">{selectedStatusName}</span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-[216px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl"
                                >
                                    <SelectItem value="no-status" className={selectItemClassName}>
                                        No status
                                    </SelectItem>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s.statusId} value={s.statusId} className={selectItemClassName}>
                                            {s.statusName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="text-sm font-semibold text-zinc-600">Priority</div>
                            <Select value={String(selectedPriorityValue)} onValueChange={setPriority} disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className={cn("inline-flex items-center gap-2", priorityTone(selectedPriorityLabel))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {selectedPriorityLabel}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-[168px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl"
                                >
                                    <SelectItem value="0" className={selectItemClassName}>
                                        Low
                                    </SelectItem>
                                    <SelectItem value="1" className={selectItemClassName}>
                                        Medium
                                    </SelectItem>
                                    <SelectItem value="2" className={selectItemClassName}>
                                        High
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <TrelloDatePicker label="Start Date" value={startDate} onChange={setStartDate} disabled={!isEditing} />

                        <TrelloDatePicker
                            label="Due Date"
                            value={dueDate}
                            onChange={setDueDate}
                            min={startDate || undefined}
                            disabled={!isEditing}
                        />

                        <div>
                            <div className="text-sm font-semibold text-zinc-600">Severity</div>
                            <Select value={String(selectedSeverityValue)} onValueChange={setSeverity} disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className={cn("inline-flex items-center gap-2", severityTone(selectedSeverityLabel))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {selectedSeverityLabel}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-[168px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl"
                                >
                                    <SelectItem value="0" className={selectItemClassName}>
                                        Minor
                                    </SelectItem>
                                    <SelectItem value="1" className={selectItemClassName}>
                                        Moderate
                                    </SelectItem>
                                    <SelectItem value="2" className={selectItemClassName}>
                                        Major
                                    </SelectItem>
                                    <SelectItem value="3" className={selectItemClassName}>
                                        Critical
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-2 xl:col-span-3">
                            <div className="text-sm font-semibold text-zinc-600">Progress</div>

                            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                                    <span className="font-medium text-zinc-800">{selectedProgressLabel}</span>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={progress}
                                            onChange={(e) => handleProgressInputChange(e.target.value)}
                                            onBlur={handleProgressInputBlur}
                                            disabled={!isEditing}
                                            placeholder="0"
                                            className="h-9 w-16 rounded-lg border border-zinc-200 px-0 text-center text-sm font-semibold leading-none text-zinc-900 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                                        />
                                        <span className="font-bold text-zinc-900">%</span>
                                    </div>
                                </div>

                                <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
                                    <div
                                        className="h-full rounded-full bg-orange-500 transition-all"
                                        style={{ width: `${selectedProgressValue}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    {PROGRESS_OPTIONS.map((value) => {
                                        const active = selectedProgressValue === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                disabled={!isEditing}
                                                onClick={() => setProgress(String(value))}
                                                className={cn(
                                                    "h-10 rounded-xl border text-sm font-semibold transition",
                                                    active
                                                        ? "border-orange-500 bg-orange-500 text-white"
                                                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                                                    !isEditing && "cursor-not-allowed opacity-70"
                                                )}
                                            >
                                                {value}%
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm font-semibold text-zinc-600">Description</div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="(No description)"
                            disabled={!isEditing}
                            className="mt-2 min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                        />
                    </div>

                    <div className="mt-6 border-t border-zinc-200 pt-5">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-zinc-700" />
                            <div className="text-2xl font-extrabold text-zinc-900">Comments</div>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                                {loadingComments ? "…" : comments.length}
                            </span>
                        </div>

                        {commentError ? (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                {commentError}
                            </div>
                        ) : null}

                        <div className="mt-4 space-y-4">
                            {loadingComments ? (
                                <div className="text-sm text-zinc-600">(Đang tải comments…)</div>
                            ) : comments.length === 0 ? (
                                <div className="text-sm text-zinc-500">(Chưa có comment)</div>
                            ) : (
                                comments.map((c) => {
                                    const u = c.user;
                                    const name = `${(u?.firstName ?? "").trim()} ${(u?.lastName ?? "").trim()}`.trim() || "User";
                                    const when = c.createdAt ? relativeTimeOf(c.createdAt) : "";

                                    return (
                                        <div
                                            key={c.commentId ?? `${c.userId ?? "u"}-${c.createdAt ?? "t"}`}
                                            className="flex items-start gap-3"
                                        >
                                            {safeAvatarUrl(u?.avatarUrl) ? (
                                                <Image
                                                    src={safeAvatarUrl(u?.avatarUrl)}
                                                    alt={name}
                                                    width={36}
                                                    height={36}
                                                    unoptimized
                                                    className="h-9 w-9 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-xs font-extrabold text-white">
                                                    {initials(u)}
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline gap-4">
                                                    <div className="font-bold text-zinc-900">{name}</div>
                                                    <div className="text-sm text-zinc-400">{when}</div>
                                                </div>
                                                <div className="mt-1 whitespace-pre-wrap text-base text-zinc-800">
                                                    {c.content ?? ""}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            {myAvatarUrl ? (
                                <Image
                                    src={myAvatarUrl}
                                    alt="Me"
                                    width={36}
                                    height={36}
                                    unoptimized
                                    className="h-9 w-9 rounded-full object-cover"
                                />
                            ) : (
                                <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                                    D
                                </div>
                            )}

                            <div className="flex-1 rounded-xl border border-zinc-200 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="w-full bg-transparent text-sm outline-none"
                                    />
                                    <button
                                        type="button"
                                        className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                                        aria-label="Attach"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendComment}
                                        className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                        aria-label="Send"
                                        disabled={!commentDraft.trim()}
                                    >
                                        <SendHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 rounded-xl border border-zinc-300 bg-white px-8 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                    >
                        Cancel
                    </button>

                    {isEditing ? (
                        <button
                            type="button"
                            onClick={() => {
                                void handleSave();
                            }}
                            disabled={submitting}
                            className="h-11 rounded-xl bg-orange-500 px-8 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                        >
                            {submitting ? "Saving..." : "Save change"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            disabled={loadingDetail || !!detailError || !task}
                            className="h-11 rounded-xl bg-orange-500 px-8 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
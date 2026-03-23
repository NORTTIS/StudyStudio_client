"use client";

import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Search,
    SlidersHorizontal,
    Sparkles,
    X,
    FolderKanban,
    Clock3,
    ArrowUpRight,
    Filter,
    LayoutGrid
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import "react-day-picker/dist/style.css";

import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";

type HomeTaskListResponse = components["schemas"]["HomeTaskListResponse"];
type HomeTaskListResponseApiResponse = components["schemas"]["HomeTaskListResponseApiResponse"];
type HomeTaskListItemResponse = components["schemas"]["HomeTaskListItemResponse"];
type UserGroupDto = components["schemas"]["UserGroupDto"];

const PAGE_SIZE = 5;
const FETCH_ALL_SIZE = 1000;

type SourceFilterValue = "all" | string;
type SortValue = "none" | "deadline" | "priority" | "severity" | "status";

type DeadlineFilter = {
    startDate: string;
    endDate: string;
};

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

type GroupPreviewItem = {
    groupId: string;
    groupName: string;
    taskCount: number;
    highestSeverity?: components["schemas"]["TaskSeverity"];
    highestPriority?: components["schemas"]["TaskPriority"];
};

type TaskListDetailLayerProps = {
    open: boolean;
    onClose: () => void;
    isLoading: boolean;
    groups: UserGroupDto[];
    paginatedItems: HomeTaskListItemResponse[];
    page: number;
    totalPages: number;
    paginationItems: Array<number | "...">;
    selectedSource: SourceFilterValue;
    setSelectedSource: React.Dispatch<React.SetStateAction<SourceFilterValue>>;
    sortBy: SortValue;
    setSortBy: React.Dispatch<React.SetStateAction<SortValue>>;
    sortFilterValue: string;
    setSortFilterValue: React.Dispatch<React.SetStateAction<string>>;
    deadlineFilter: DeadlineFilter;
    setDeadlineFilter: React.Dispatch<React.SetStateAction<DeadlineFilter>>;
    openDeadlineFilter: boolean;
    setOpenDeadlineFilter: React.Dispatch<React.SetStateAction<boolean>>;
    searchInput: string;
    setSearchInput: React.Dispatch<React.SetStateAction<string>>;
    statusOptions: string[];
    hasDeadlineFilter: boolean;
    deadlineFilterLabel: string;
    showExtraFilter: boolean;
    showDeadlineFilter: boolean;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    handleTaskClick: (item: HomeTaskListItemResponse) => void;
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

function formatFilterDateLabel(value?: string) {
    const date = parseDateString(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function matchDeadlineDate(raw?: string | null, filter?: DeadlineFilter | null) {
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

function buildTaskListUrl(params: { page: number; pageSize: number; search?: string; sortBy?: string }) {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const base = rawBase.replace(/\/+$/, "");
    if (!base) return "";

    const endpoint = /\/api$/i.test(base) ? `${base}/Home/TaskList` : `${base}/api/Home/TaskList`;
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params.page));
    searchParams.set("pageSize", String(params.pageSize));

    if (params.search?.trim()) searchParams.set("search", params.search.trim());
    if (params.sortBy && params.sortBy !== "none") searchParams.set("sortBy", params.sortBy);

    return `${endpoint}?${searchParams.toString()}`;
}

function extractTaskListData(payload: unknown): HomeTaskListResponse | null {
    const source = payload as
        | HomeTaskListResponseApiResponse
        | { status?: string; data?: HomeTaskListResponseApiResponse | HomeTaskListResponse | null }
        | null
        | undefined;

    const firstLayer = source?.data;

    if (firstLayer && typeof firstLayer === "object" && "items" in firstLayer && "page" in firstLayer && "pageSize" in firstLayer) {
        return firstLayer as HomeTaskListResponse;
    }

    if (firstLayer && typeof firstLayer === "object" && "data" in firstLayer && (firstLayer as HomeTaskListResponseApiResponse).data) {
        return (firstLayer as HomeTaskListResponseApiResponse).data ?? null;
    }

    if (source && typeof source === "object" && "data" in source && (source as HomeTaskListResponseApiResponse).data) {
        return (source as HomeTaskListResponseApiResponse).data ?? null;
    }

    return null;
}

function getSeverityLabel(value?: components["schemas"]["TaskSeverity"]) {
    switch (value) {
        case 0:
            return "Thấp";
        case 1:
            return "Bình thường";
        case 2:
            return "Quan trọng";
        case 3:
            return "Khẩn cấp";
        default:
            return "-";
    }
}

function getPriorityLabel(value?: components["schemas"]["TaskPriority"]) {
    switch (value) {
        case 0:
            return "Low";
        case 1:
            return "Medium";
        case 2:
            return "High";
        default:
            return "-";
    }
}

function priorityTone(value?: components["schemas"]["TaskPriority"]) {
    if (value === 2) return "border-rose-200 bg-rose-50 text-rose-700";
    if (value === 1) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function severityTone(value?: components["schemas"]["TaskSeverity"]) {
    if (value === 3) return "border-red-200 bg-red-50 text-red-700";
    if (value === 2) return "border-orange-200 bg-orange-50 text-orange-700";
    if (value === 1) return "border-yellow-200 bg-yellow-50 text-yellow-700";
    return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatDueDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const currentYear = new Date().getFullYear();
    const year = date.getFullYear();
    if (year !== currentYear) {
        return `${year}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    }

    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function getSourceLabel(item: HomeTaskListItemResponse) {
    return item.groupName || item.sourceName || "Nhóm";
}

function buildTaskDetailHref(item: HomeTaskListItemResponse) {
    const taskId = item.taskId ?? "";
    if (!taskId || !item.groupId) return "#";

    return `/group/${item.groupId}?taskId=${taskId}&openTaskDetail=1`;
}

function TaskStatusBadge({ label }: { label?: string | null }) {
    return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
            {label || "-"}
        </span>
    );
}

function FilterField({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(248,250,252,0.82))] shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl",
                className
            )}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_32%)]" />
            <div className="relative">{children}</div>
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-3 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
                <div
                    key={index}
                    className="h-20 animate-pulse rounded-[22px] border border-slate-200/70 bg-[linear-gradient(180deg,#F8FAFC_0%,#F1F5F9_100%)]"
                />
            ))}
        </div>
    );
}

function TrelloDatePicker({ label, value, onChange, min, max }: TrelloDatePickerProps) {
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
        if (open) setMonth(selectedDate ?? minDate ?? new Date());
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

        if (left + popupWidth > window.innerWidth - viewportPadding) left = window.innerWidth - popupWidth - viewportPadding;
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

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
        setMonth(new Date(month.getFullYear(), Number(e.target.value), 1));

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
        setMonth(new Date(Number(e.target.value), month.getMonth(), 1));

    const goPrevMonth = () => {
        const next = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        if (minDate) {
            const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            if (next < minMonth) return;
        }
        setMonth(next);
    };

    const goNextMonth = () => {
        const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        if (maxDate) {
            const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
            if (next > maxMonth) return;
        }
        setMonth(next);
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
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    ref={rootRef}
                    className="fixed z-[20000] rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
                    style={{ top: popupPosition.top, left: popupPosition.left, width: popupPosition.width }}
                >
                    <div className="mb-4 flex items-center gap-3">
                        <div className="relative flex-1">
                            <select
                                value={month.getMonth()}
                                onChange={handleMonthChange}
                                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white/80 px-4 pr-10 text-base font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-violet-400"
                            >
                                {monthOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-500" />
                        </div>

                        <div className="relative w-[140px]">
                            <select
                                value={month.getFullYear()}
                                onChange={handleYearChange}
                                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white/80 px-4 pr-10 text-base font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-violet-400"
                            >
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-500" />
                        </div>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goPrevMonth}
                                disabled={isPrevDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="text-[18px] font-bold text-slate-900">
                                {monthOptions[month.getMonth()]?.label} {month.getFullYear()}
                            </div>

                            <button
                                type="button"
                                onClick={goNextMonth}
                                disabled={isNextDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                            styles={{ day: { outline: "none", boxShadow: "none" }, button: { outline: "none", boxShadow: "none" } }}
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
                                weekday: "h-10 w-10 text-center text-[13px] font-semibold text-slate-500",
                                weeks: "w-full",
                                week: "mt-2 flex w-full justify-between",
                                day: "h-10 w-10 p-0 text-center",
                                cell: "h-10 w-10 p-0 text-center",
                                day_button:
                                    "h-10 w-10 rounded-xl border-0 bg-transparent p-0 text-sm font-medium text-slate-800 shadow-none outline-none ring-0 transition hover:bg-violet-50 focus:outline-none focus:ring-0",
                                selected: "!rounded-xl !bg-violet-500 !text-white",
                                day_selected: "!rounded-xl !bg-violet-500 !text-white hover:!bg-violet-500",
                                today: "font-bold text-violet-600",
                                day_today: "font-bold text-violet-600",
                                outside: "opacity-30",
                                day_outside: "opacity-30",
                                disabled: "cursor-not-allowed opacity-30",
                                day_disabled: "cursor-not-allowed opacity-30",
                                hidden: "invisible",
                                day_hidden: "invisible"
                            }}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => pickDate(new Date())}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 1))}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Tomorrow
                        </button>
                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 7))}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Next week
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-rose-500 hover:bg-rose-50"
                        >
                            No date
                        </button>
                    </div>
                </motion.div>,
                document.body
            )
            : null;

    return (
        <>
            <div className="relative">
                <div className="text-sm font-semibold text-slate-600">{label}</div>
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        open
                            ? "border-violet-400 bg-violet-50 text-slate-900 ring-2 ring-violet-100"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                open ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500"
                            )}
                        >
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <span className={cn("truncate text-left", value ? "font-medium text-slate-900" : "text-slate-400")}>
                            {formatDateDisplay(value)}
                        </span>
                    </div>
                </button>
            </div>
            {popup}
        </>
    );
}

function DeadlineRangePicker({ value, onChange }: { value: DeadlineFilter; onChange: (next: DeadlineFilter) => void }) {
    return (
        <div className="grid min-w-[360px] grid-cols-1 gap-4 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <TrelloDatePicker
                label="Từ ngày"
                value={value.startDate}
                onChange={(v) => onChange({ ...value, startDate: v })}
                max={value.endDate || undefined}
            />
            <TrelloDatePicker
                label="Đến ngày"
                value={value.endDate}
                onChange={(v) => onChange({ ...value, endDate: v })}
                min={value.startDate || undefined}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => onChange({ startDate: "", endDate: "" })}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                    Xóa chọn
                </button>
            </div>
        </div>
    );
}

function DeadlineFilterPopover({
    open,
    value,
    onChange,
    onClose
}: {
    open: boolean;
    value: DeadlineFilter;
    onChange: (next: DeadlineFilter) => void;
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
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-[calc(100%+12px)] z-30"
            onPointerDown={(e) => e.stopPropagation()}
        >
            <DeadlineRangePicker value={value} onChange={onChange} />
        </motion.div>
    );
}

function TaskListDetailLayer({
    open,
    onClose,
    isLoading,
    groups,
    paginatedItems,
    page,
    totalPages,
    paginationItems,
    selectedSource,
    setSelectedSource,
    sortBy,
    setSortBy,
    sortFilterValue,
    setSortFilterValue,
    deadlineFilter,
    setDeadlineFilter,
    openDeadlineFilter,
    setOpenDeadlineFilter,
    searchInput,
    setSearchInput,
    statusOptions,
    hasDeadlineFilter,
    deadlineFilterLabel,
    showExtraFilter,
    showDeadlineFilter,
    setPage,
    handleTaskClick
}: TaskListDetailLayerProps) {
    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[3px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.20)]"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 md:px-8">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Danh sách công việc chi tiết
                                </div>

                                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                    Công việc từ các nhóm
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[#FBFBFD] px-6 py-6 md:px-8">
                            <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                                <FilterField className="w-full xl:max-w-[720px]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="Tìm kiếm công việc"
                                            className="h-[72px] w-full rounded-[24px] border-0 bg-transparent pl-14 pr-5 text-[18px] text-slate-900 outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                </FilterField>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:w-[560px]">
                                    <FilterField>
                                        <div className="relative">
                                            <select
                                                value={selectedSource}
                                                onChange={(event) => {
                                                    setSelectedSource(event.target.value);
                                                    setPage(1);
                                                }}
                                                className="h-[72px] w-full appearance-none rounded-[24px] border-0 bg-transparent px-7 pr-14 text-[18px] text-slate-900 outline-none"
                                            >
                                                <option value="all">Tất cả</option>
                                                {groups.map((group) => (
                                                    <option key={group.groupId ?? group.groupName} value={group.groupId ?? ""}>
                                                        {group.groupName}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronsUpDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                        </div>
                                    </FilterField>

                                    <FilterField>
                                        <div className="relative">
                                            <select
                                                value={sortBy}
                                                onChange={(event) => {
                                                    const nextSort = event.target.value as SortValue;
                                                    setSortBy(nextSort);
                                                    setSortFilterValue("");
                                                    setDeadlineFilter({ startDate: "", endDate: "" });
                                                    setOpenDeadlineFilter(false);
                                                    setPage(1);
                                                }}
                                                className="h-[72px] w-full appearance-none rounded-[24px] border-0 bg-transparent px-7 pr-14 text-[18px] text-slate-900 outline-none"
                                            >
                                                <option value="none">Không sắp xếp</option>
                                                <option value="deadline">Sắp xếp theo hạn chót</option>
                                                <option value="priority">Sắp xếp theo độ ưu tiên</option>
                                                <option value="severity">Sắp xếp theo độ khẩn cấp</option>
                                                <option value="status">Sắp xếp theo trạng thái</option>
                                            </select>
                                            <ChevronsUpDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                        </div>
                                    </FilterField>

                                    <AnimatePresence initial={false}>
                                        {showExtraFilter && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="sm:col-span-2"
                                            >
                                                <FilterField>
                                                    <div className="relative">
                                                        <select
                                                            value={sortFilterValue}
                                                            onChange={(event) => setSortFilterValue(event.target.value)}
                                                            className="h-[72px] w-full appearance-none rounded-[24px] border-0 bg-transparent px-7 pr-14 text-[18px] text-slate-900 outline-none"
                                                        >
                                                            <option value="">Chọn bộ lọc</option>
                                                            {sortBy === "priority" && (
                                                                <>
                                                                    <option value="Low">Low</option>
                                                                    <option value="Medium">Medium</option>
                                                                    <option value="High">High</option>
                                                                </>
                                                            )}
                                                            {sortBy === "severity" && (
                                                                <>
                                                                    <option value="Thấp">Thấp</option>
                                                                    <option value="Bình thường">Bình thường</option>
                                                                    <option value="Quan trọng">Quan trọng</option>
                                                                    <option value="Khẩn cấp">Khẩn cấp</option>
                                                                </>
                                                            )}
                                                            {sortBy === "status" &&
                                                                statusOptions.map((status) => (
                                                                    <option key={status} value={status}>
                                                                        {status}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                        <ChevronsUpDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                                    </div>
                                                </FilterField>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence initial={false}>
                                        {showDeadlineFilter && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="relative sm:col-span-2"
                                            >
                                                <FilterField>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenDeadlineFilter((prev) => !prev)}
                                                        className="flex h-[72px] w-full items-center justify-between rounded-[24px] px-7 text-[18px] text-slate-900 transition"
                                                    >
                                                        <span className={cn("truncate", !hasDeadlineFilter && "text-slate-400")}>
                                                            {hasDeadlineFilter ? deadlineFilterLabel : "Chọn khoảng ngày"}
                                                        </span>
                                                        <CalendarDays className="h-5 w-5 text-slate-500" />
                                                    </button>
                                                </FilterField>

                                                <DeadlineFilterPopover
                                                    open={openDeadlineFilter}
                                                    value={deadlineFilter}
                                                    onChange={setDeadlineFilter}
                                                    onClose={() => setOpenDeadlineFilter(false)}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm">
                                    <Filter className="h-4 w-4 text-violet-600" />
                                    <span>
                                        Nguồn:{" "}
                                        {selectedSource === "all"
                                            ? "Tất cả"
                                            : groups.find((g) => g.groupId === selectedSource)?.groupName ?? "Nhóm"}
                                    </span>
                                </div>

                                {sortBy !== "none" && (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm">
                                        <SlidersHorizontal className="h-4 w-4 text-sky-600" />
                                        <span>Sắp xếp: {sortBy}</span>
                                    </div>
                                )}

                                {showDeadlineFilter && hasDeadlineFilter && (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700 shadow-sm">
                                        <Clock3 className="h-4 w-4" />
                                        <span>{deadlineFilterLabel}</span>
                                        <button
                                            type="button"
                                            onClick={() => setDeadlineFilter({ startDate: "", endDate: "" })}
                                            className="rounded-full p-0.5 hover:bg-violet-100"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(248,250,252,0.88))] shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#F8FAFC_0%,#F1F5F9_100%)]">
                                                <th className="px-6 py-5 text-center text-[16px] font-semibold text-slate-500">Công việc</th>
                                                <th className="px-6 py-5 text-center text-[16px] font-semibold text-slate-500">Nguồn</th>
                                                <th className="px-6 py-5 text-center text-[16px] font-semibold text-slate-500">Độ khẩn cấp</th>
                                                <th className="px-6 py-5 text-center text-[16px] font-semibold text-slate-500">Độ ưu tiên</th>
                                                <th className="px-6 py-5 text-center text-[16px] font-semibold text-slate-500">Trạng thái</th>
                                                <th className="px-6 py-5 text-center text-[16px] font-semibold text-slate-500">Thời hạn đến</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-0 py-4">
                                                        <TableSkeleton />
                                                    </td>
                                                </tr>
                                            ) : paginatedItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-16 text-center">
                                                        <div className="mx-auto flex max-w-md flex-col items-center">
                                                            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-violet-50 text-violet-600 shadow-sm">
                                                                <FolderKanban className="h-8 w-8" />
                                                            </div>
                                                            <p className="mt-4 text-lg font-semibold text-slate-800">Không có công việc nào</p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem thêm kết quả.
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedItems.map((item, index) => (
                                                    <motion.tr
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.25, delay: index * 0.03 }}
                                                        key={item.taskId}
                                                        onClick={() => handleTaskClick(item)}
                                                        className="group cursor-pointer border-b border-slate-200/70 transition last:border-b-0 hover:bg-[linear-gradient(180deg,#FCFCFF_0%,#F8FAFC_100%)]"
                                                    >
                                                        <td className="px-6 py-6 text-center text-[18px] font-semibold text-slate-900">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTaskClick(item);
                                                                }}
                                                                className="inline-flex items-center gap-2 hover:text-violet-700"
                                                            >
                                                                <span className="hover:underline">{item.taskTitle || "-"}</span>
                                                                <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                                                            </button>
                                                        </td>

                                                        <td className="px-6 py-6 text-center text-[16px] font-medium text-slate-600">
                                                            {getSourceLabel(item)}
                                                        </td>

                                                        <td className="px-6 py-6 text-center">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex rounded-full border px-3 py-1.5 text-[14px] font-semibold shadow-sm",
                                                                    severityTone(item.taskSeverity)
                                                                )}
                                                            >
                                                                {getSeverityLabel(item.taskSeverity)}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-6 text-center">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex rounded-full border px-3 py-1.5 text-[14px] font-semibold shadow-sm",
                                                                    priorityTone(item.taskPriority)
                                                                )}
                                                            >
                                                                {getPriorityLabel(item.taskPriority)}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-6 text-center">
                                                            <div className="flex justify-center">
                                                                <TaskStatusBadge label={item.statusName} />
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-6 text-center text-[16px] font-medium text-slate-500">
                                                            {formatDueDate(item.dueDate)}
                                                        </td>
                                                    </motion.tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {!isLoading && totalPages > 1 && (
                                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={page === 1}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#FED7AA] bg-white px-4 py-2 text-[15px] font-medium text-[#9A3412] shadow-sm hover:bg-[#FFF7ED] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" /> Previous
                                    </button>

                                    {paginationItems.map((item, index) => {
                                        if (item === "...") {
                                            return (
                                                <span
                                                    key={`ellipsis-${index}`}
                                                    className="flex h-12 min-w-12 items-center justify-center px-2 text-[16px] font-medium text-slate-400"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }

                                        const isActive = item === page;
                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setPage(item)}
                                                className={cn(
                                                    "h-12 min-w-12 rounded-xl border px-4 text-[15px] font-medium transition",
                                                    isActive
                                                        ? "border-[#F97316] bg-[#F97316] text-white shadow-[0_10px_20px_rgba(249,115,22,0.22)]"
                                                        : "border-[#E2E8F0] bg-white/80 text-[#261E33] hover:border-[#FDBA74] hover:bg-[#FFF7ED]"
                                                )}
                                            >
                                                {item}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={page === totalPages}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#FED7AA] bg-white px-4 py-2 text-[15px] font-medium text-[#9A3412] shadow-sm hover:bg-[#FFF7ED] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default function HomeTaskList() {
    const router = useRouter();
    const [data, setData] = React.useState<HomeTaskListResponse | null>(null);
    const [allGroups, setAllGroups] = React.useState<UserGroupDto[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchInput, setSearchInput] = React.useState("");
    const [searchValue, setSearchValue] = React.useState("");
    const [selectedSource, setSelectedSource] = React.useState<SourceFilterValue>("all");
    const [sortBy, setSortBy] = React.useState<SortValue>("none");
    const [sortFilterValue, setSortFilterValue] = React.useState("");
    const [deadlineFilter, setDeadlineFilter] = React.useState<DeadlineFilter>({ startDate: "", endDate: "" });
    const [openDeadlineFilter, setOpenDeadlineFilter] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [openDetail, setOpenDetail] = React.useState(false);

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearchValue(searchInput);
            setPage(1);
        }, 400);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    React.useEffect(() => {
        let isMounted = true;

        const fetchTaskList = async () => {
            try {
                setIsLoading(true);

                const url = buildTaskListUrl({
                    page: 1,
                    pageSize: FETCH_ALL_SIZE,
                    search: searchValue,
                    sortBy: sortBy === "none" ? undefined : sortBy
                });

                if (!url) {
                    if (isMounted) {
                        setData(null);
                        setIsLoading(false);
                    }
                    return;
                }

                const response = await apiFetch<HomeTaskListResponseApiResponse>(url, { method: "GET" });
                if (!isMounted) return;

                const nextData = extractTaskListData(response);
                if (nextData) {
                    setData(nextData);

                    const nextGroups = nextData.userGroups ?? [];
                    if (nextGroups.length > 0) {
                        setAllGroups((prev) => {
                            if (prev.length >= nextGroups.length) return prev;
                            return nextGroups;
                        });
                    }
                } else {
                    console.error("Home task list response format unexpected:", response);
                    setData(null);
                }
            } catch (error) {
                console.error("Failed to fetch home task list:", error);
                if (isMounted) setData(null);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void fetchTaskList();
        return () => {
            isMounted = false;
        };
    }, [searchValue, sortBy]);

    const rawItems = data?.items ?? [];

    const groups = React.useMemo(() => {
        const sourceGroups: UserGroupDto[] = allGroups.length ? allGroups : data?.userGroups ?? [];
        return sourceGroups.filter((group) => !!group.groupId);
    }, [allGroups, data?.userGroups]);

    const validGroupIds = React.useMemo(
        () => new Set(groups.map((group) => group.groupId).filter(Boolean)),
        [groups]
    );

    const sanitizedItems = React.useMemo(
        () => rawItems.filter((item) => !!item.groupId && validGroupIds.has(item.groupId)),
        [rawItems, validGroupIds]
    );

    const groupsWithTasks = React.useMemo(() => {
        const groupIdsWithTasks = new Set(
            sanitizedItems.map((item) => item.groupId).filter(Boolean)
        );

        return groups.filter((group) => group.groupId && groupIdsWithTasks.has(group.groupId));
    }, [groups, sanitizedItems]);

    React.useEffect(() => {
        if (selectedSource !== "all" && !groupsWithTasks.some((group) => group.groupId === selectedSource)) {
            setSelectedSource("all");
            setPage(1);
        }
    }, [selectedSource, groupsWithTasks]);

    const sourceFilteredItems = React.useMemo(() => {
        if (selectedSource !== "all") {
            return sanitizedItems.filter((item) => item.groupId === selectedSource);
        }
        return sanitizedItems;
    }, [sanitizedItems, selectedSource]);

    const displayItems = React.useMemo(() => {
        let result = [...sourceFilteredItems];

        if (sortBy === "priority" && sortFilterValue) {
            result = result.filter((item) => getPriorityLabel(item.taskPriority) === sortFilterValue);
        }
        if (sortBy === "severity" && sortFilterValue) {
            result = result.filter((item) => getSeverityLabel(item.taskSeverity) === sortFilterValue);
        }
        if (sortBy === "status" && sortFilterValue) {
            result = result.filter((item) => (item.statusName ?? "") === sortFilterValue);
        }
        if (sortBy === "deadline") {
            result = result.filter((item) => matchDeadlineDate(item.dueDate, deadlineFilter));
        }

        return result;
    }, [sourceFilteredItems, sortBy, sortFilterValue, deadlineFilter]);

    const statusOptions = React.useMemo(
        () =>
            Array.from(
                new Set(
                    sanitizedItems
                        .map((item) => (item.statusName ?? "").trim())
                        .filter(Boolean)
                )
            ),
        [sanitizedItems]
    );

    React.useEffect(() => {
        setPage(1);
    }, [selectedSource, sortBy, sortFilterValue, deadlineFilter.startDate, deadlineFilter.endDate, searchValue]);

    const totalPages = Math.max(Math.ceil(displayItems.length / PAGE_SIZE), 1);

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const paginatedItems = React.useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return displayItems.slice(start, start + PAGE_SIZE);
    }, [displayItems, page]);

    const paginationItems = React.useMemo<(number | "...")[]>(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
        if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
        if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, "...", page - 1, page, page + 1, "...", totalPages];
    }, [page, totalPages]);

    const previewGroups = React.useMemo<GroupPreviewItem[]>(() => {
        const groupMap = new Map<string, GroupPreviewItem>();

        sanitizedItems.forEach((item) => {
            if (!item.groupId) return;

            const groupId = item.groupId;
            const groupName = item.groupName || item.sourceName || "Nhóm";

            const existing = groupMap.get(groupId);

            if (!existing) {
                groupMap.set(groupId, {
                    groupId,
                    groupName,
                    taskCount: 1,
                    highestSeverity: item.taskSeverity,
                    highestPriority: item.taskPriority
                });
                return;
            }

            existing.taskCount += 1;

            if ((item.taskSeverity ?? -1) > (existing.highestSeverity ?? -1)) {
                existing.highestSeverity = item.taskSeverity;
            }

            if ((item.taskPriority ?? -1) > (existing.highestPriority ?? -1)) {
                existing.highestPriority = item.taskPriority;
            }
        });

        return Array.from(groupMap.values())
            .sort((a, b) => {
                if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount;
                return a.groupName.localeCompare(b.groupName, "vi");
            })
            .slice(0, 3);
    }, [sanitizedItems]);

    const handleTaskClick = (item: HomeTaskListItemResponse) => {
        const href = buildTaskDetailHref(item);
        if (href !== "#") router.push(href);
    };

    const handleOpenDetail = () => {
        setSelectedSource("all");
        setPage(1);
        setOpenDetail(true);
    };

    const handleOpenDetailByGroup = (groupId: string) => {
        setSelectedSource(groupId);
        setPage(1);
        setOpenDetail(true);
    };

    const handleCloseDetail = () => {
        setOpenDetail(false);
        setSelectedSource("all");
        setPage(1);
    };

    const showExtraFilter = sortBy === "priority" || sortBy === "severity" || sortBy === "status";
    const showDeadlineFilter = sortBy === "deadline";

    const deadlineFilterLabel = [
        deadlineFilter.startDate && `Từ ${formatFilterDateLabel(deadlineFilter.startDate)}`,
        deadlineFilter.endDate && `Đến ${formatFilterDateLabel(deadlineFilter.endDate)}`
    ]
        .filter(Boolean)
        .join(" • ");

    const hasDeadlineFilter = !!(deadlineFilter.startDate || deadlineFilter.endDate);

    return (
        <>
            <div
                id="home-group-task-section"
                className="relative overflow-hidden scroll-mt-24 bg-[linear-gradient(180deg,#F8FAFC_0%,#F7F7FF_36%,#F3F7FB_100%)]"
            >
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[-80px] top-[-30px] h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
                    <div className="absolute right-[-60px] top-[20%] h-80 w-80 rounded-full bg-sky-200/18 blur-3xl" />
                    <div className="absolute bottom-[-100px] left-[20%] h-96 w-96 rounded-full bg-orange-100/16 blur-3xl" />
                </div>

                <Container className="py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.68))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-8"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.08),transparent_30%)]" />

                        <div className="relative">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Danh sách công việc
                                    </div>

                                    <h2 className="mt-4 bg-[linear-gradient(135deg,#0F172A_0%,#4338CA_55%,#0F766E_100%)] bg-clip-text text-[32px] font-bold leading-tight tracking-[-0.02em] text-transparent md:text-[40px]">
                                        Công việc từ các nhóm
                                    </h2>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Tổng công việc</p>
                                        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            <FolderKanban className="h-4 w-4 text-violet-600" />
                                            {displayItems.length}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Nhóm khả dụng</p>
                                        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            <LayoutGrid className="h-4 w-4 text-sky-600" />
                                            {groupsWithTasks.length}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-sm"
                                        >
                                            <div className="animate-pulse space-y-3">
                                                <div className="h-5 w-3/4 rounded bg-slate-200" />
                                                <div className="h-4 w-1/2 rounded bg-slate-100" />
                                                <div className="flex gap-2">
                                                    <div className="h-7 w-20 rounded-full bg-slate-100" />
                                                    <div className="h-7 w-20 rounded-full bg-slate-100" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : previewGroups.length === 0 ? (
                                    <div className="md:col-span-3 rounded-[24px] border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
                                        <div className="mx-auto flex max-w-md flex-col items-center">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-violet-50 text-violet-600 shadow-sm">
                                                <FolderKanban className="h-8 w-8" />
                                            </div>
                                            <p className="mt-4 text-lg font-semibold text-slate-800">Không có nhóm nào</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Chưa có dữ liệu nhóm để hiển thị trong phần xem nhanh.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    previewGroups.map((group) => (
                                        <button
                                            key={group.groupId}
                                            type="button"
                                            onClick={() => handleOpenDetailByGroup(group.groupId)}
                                            className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                        >
                                            <p className="line-clamp-1 text-xl font-semibold text-slate-900">
                                                {group.groupName}
                                            </p>

                                            <p className="mt-3 text-sm font-medium text-slate-500">
                                                {group.taskCount} công việc
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                                    Top nhóm
                                                </span>

                                                {typeof group.highestSeverity !== "undefined" ? (
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                            severityTone(group.highestSeverity)
                                                        )}
                                                    >
                                                        {getSeverityLabel(group.highestSeverity)}
                                                    </span>
                                                ) : null}

                                                {typeof group.highestPriority !== "undefined" ? (
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                            priorityTone(group.highestPriority)
                                                        )}
                                                    >
                                                        {getPriorityLabel(group.highestPriority)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    onClick={handleOpenDetail}
                                    className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
                                >
                                    Xem chi tiết
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </Container>
            </div>

            <TaskListDetailLayer
                open={openDetail}
                onClose={handleCloseDetail}
                isLoading={isLoading}
                groups={groupsWithTasks}
                paginatedItems={paginatedItems}
                page={page}
                totalPages={totalPages}
                paginationItems={paginationItems}
                selectedSource={selectedSource}
                setSelectedSource={setSelectedSource}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortFilterValue={sortFilterValue}
                setSortFilterValue={setSortFilterValue}
                deadlineFilter={deadlineFilter}
                setDeadlineFilter={setDeadlineFilter}
                openDeadlineFilter={openDeadlineFilter}
                setOpenDeadlineFilter={setOpenDeadlineFilter}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                statusOptions={statusOptions}
                hasDeadlineFilter={hasDeadlineFilter}
                deadlineFilterLabel={deadlineFilterLabel}
                showExtraFilter={showExtraFilter}
                showDeadlineFilter={showDeadlineFilter}
                setPage={setPage}
                handleTaskClick={handleTaskClick}
            />
        </>
    );
}
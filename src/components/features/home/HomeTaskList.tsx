"use client";

import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Search,
    Sparkles,
    X,
    FolderKanban,
    Clock3,
    ArrowUpRight,
    Filter,
    LayoutGrid
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import "react-day-picker/dist/style.css";

import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type HomeTaskListResponse = components["schemas"]["HomeTaskListResponse"];
type HomeTaskListResponseApiResponse = components["schemas"]["HomeTaskListResponseApiResponse"];
type HomeTaskListItemResponse = components["schemas"]["HomeTaskListItemResponse"];
type UserGroupDto = components["schemas"]["UserGroupDto"];

const PAGE_SIZE = 5;
const FETCH_ALL_SIZE = 1000;
const OVERDUE_FILTER_VALUE = "__overdue__";

type SourceFilterValue = "all" | string;
type TaskFilterValue = "all" | string;

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
    t?: (key: string) => string;
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
    priorityFilterValue: TaskFilterValue;
    setPriorityFilterValue: React.Dispatch<React.SetStateAction<TaskFilterValue>>;
    severityFilterValue: TaskFilterValue;
    setSeverityFilterValue: React.Dispatch<React.SetStateAction<TaskFilterValue>>;
    statusFilterValue: TaskFilterValue;
    setStatusFilterValue: React.Dispatch<React.SetStateAction<TaskFilterValue>>;
    deadlineFilter: DeadlineFilter;
    setDeadlineFilter: React.Dispatch<React.SetStateAction<DeadlineFilter>>;
    openDeadlineFilter: boolean;
    setOpenDeadlineFilter: React.Dispatch<React.SetStateAction<boolean>>;
    searchInput: string;
    setSearchInput: React.Dispatch<React.SetStateAction<string>>;
    statusOptions: string[];
    hasDeadlineFilter: boolean;
    deadlineFilterLabel: string;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    handleTaskClick: (item: HomeTaskListItemResponse) => void;
    t: (key: string) => string;
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

function formatDateDisplay(value?: string, t?: (key: string) => string) {
    const date = parseDateString(value);
    if (!date) return t ? t("selectDate") : "Select a date";

    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return t ? t("today") : "Today";
    if (diffDays === 1) return t ? t("tomorrow") : "Tomorrow";

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

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "items" in firstLayer &&
        "page" in firstLayer &&
        "pageSize" in firstLayer
    ) {
        return firstLayer as HomeTaskListResponse;
    }

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "data" in firstLayer &&
        (firstLayer as HomeTaskListResponseApiResponse).data
    ) {
        return (firstLayer as HomeTaskListResponseApiResponse).data ?? null;
    }

    if (source && typeof source === "object" && "data" in source && (source as HomeTaskListResponseApiResponse).data) {
        return (source as HomeTaskListResponseApiResponse).data ?? null;
    }

    return null;
}

function getSeverityLabel(value?: components["schemas"]["TaskSeverity"], t?: (key: string) => string) {
    switch (value) {
        case 0:
            return t ? t("severityLow") : "Low";
        case 1:
            return t ? t("severityNormal") : "Normal";
        case 2:
            return t ? t("severityImportant") : "Important";
        case 3:
            return t ? t("severityCritical") : "Critical";
        default:
            return "-";
    }
}

function getPriorityLabel(value?: components["schemas"]["TaskPriority"], t?: (key: string) => string) {
    switch (value) {
        case 0:
            return t ? t("priorityLow") : "Low";
        case 1:
            return t ? t("priorityMedium") : "Medium";
        case 2:
            return t ? t("priorityHigh") : "High";
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

function normalizeStatusName(value?: string | null) {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase();
}

function normalizeProgressValue(n?: number | null) {
    if (typeof n !== "number" || !Number.isFinite(n)) return 0;
    const value = Math.floor(n);
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function isOverdueTask(dueDate?: string | null, progress?: number | null) {
    if (!dueDate) return false;
    if (normalizeProgressValue(progress) >= 100) return false;

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;

    const dueDay = startOfDay(due);
    const today = startOfDay(new Date());
    return dueDay < today;
}

function getSourceLabel(item: HomeTaskListItemResponse, t?: (key: string) => string) {
    return item.groupName || item.sourceName || (t ? t("groupSource") : "Nhóm");
}

function buildTaskDetailHref(item: HomeTaskListItemResponse) {
    const taskId = item.taskId ?? "";
    if (!taskId || !item.groupId) return "#";

    return `/group/${item.groupId}?taskId=${taskId}&openTaskDetail=1`;
}

function TaskStatusBadge({
    label,
    overdue = false,
    overdueLabel = "Overdue"
}: {
    label?: string | null;
    overdue?: boolean;
    overdueLabel?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm",
                overdue
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-700"
            )}>
            {overdue ? "!" : null}
            <span className={cn(overdue && "ml-1")}>{overdue ? overdueLabel : label || "-"}</span>
        </span>
    );
}

function FilterTriggerLabel(params: {
    t: (key: string) => string;
    priorityFilterValue: TaskFilterValue;
    severityFilterValue: TaskFilterValue;
    statusFilterValue: TaskFilterValue;
}) {
    const activeCount = [params.priorityFilterValue, params.severityFilterValue, params.statusFilterValue].filter(
        (value) => value !== "all"
    ).length;

    if (!activeCount) return params.t("selectFilter");
    return `${params.t("selectFilter")} (${activeCount})`;
}

function FilterField({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]",
                className
            )}>
            <div className="relative">{children}</div>
        </div>
    );
}

/** Same height & radius as SelectTrigger (detail modal filter row). */
const FILTER_ROW_INNER_CLASS =
    "h-11 min-h-11 w-full rounded-xl border-0 bg-transparent px-4 text-sm font-medium leading-none text-slate-900 shadow-none";

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

function TrelloDatePicker({ label, value, onChange, min, max, t }: TrelloDatePickerProps) {
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
        const popupWidth = 380;
        const popupHeight = 500;
        const gap = 8;
        const viewportPadding = 12;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUp = spaceBelow < popupHeight && spaceAbove > spaceBelow;

        let top = shouldOpenUp ? rect.top - popupHeight - gap : rect.bottom + gap;
        let left = rect.left;

        if (left + popupWidth > window.innerWidth - viewportPadding)
            left = window.innerWidth - popupWidth - viewportPadding;
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

    const handleMonthChange = (nextValue: string) => {
        setMonth(new Date(month.getFullYear(), Number(nextValue), 1));
    };

    const handleYearChange = (nextValue: string) => {
        setMonth(new Date(Number(nextValue), month.getMonth(), 1));
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
                    className="fixed z-[20000] rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                    style={{ top: popupPosition.top, left: popupPosition.left, width: popupPosition.width }}>
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex-1">
                            <Select value={String(month.getMonth())} onValueChange={handleMonthChange}>
                                <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-sm font-semibold text-slate-800 leading-none">
                                    <div className="flex min-h-0 flex-1 items-center overflow-hidden">
                                        <SelectValue placeholder={monthOptions[month.getMonth()]?.label} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="z-[20001] rounded-xl border-slate-200 bg-white">
                                    {monthOptions.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[140px]">
                            <Select value={String(month.getFullYear())} onValueChange={handleYearChange}>
                                <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-sm font-semibold text-slate-800 leading-none">
                                    <div className="flex min-h-0 flex-1 items-center overflow-hidden">
                                        <SelectValue placeholder={String(month.getFullYear())} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="z-[20001] rounded-xl border-slate-200 bg-white">
                                    {yearOptions.map((year) => (
                                        <SelectItem key={year} value={String(year)}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-slate-200 bg-white p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goPrevMonth}
                                disabled={isPrevDisabled}
                                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="text-base font-bold text-slate-900">
                                {monthOptions[month.getMonth()]?.label} {month.getFullYear()}
                            </div>

                            <button
                                type="button"
                                onClick={goNextMonth}
                                disabled={isNextDisabled}
                                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ChevronRight className="h-4 w-4" />
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
                                weekday: "h-9 w-9 text-center text-xs font-semibold text-slate-500",
                                weeks: "w-full",
                                week: "mt-2 flex w-full justify-between",
                                day: "h-9 w-9 p-0 text-center",
                                cell: "h-9 w-9 p-0 text-center",
                                day_button:
                                    "h-9 w-9 rounded-lg border-0 bg-transparent p-0 text-xs font-medium text-slate-800 shadow-none outline-none ring-0 transition hover:bg-violet-50 focus:outline-none focus:ring-0",
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

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => pickDate(new Date())}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            {t ? t("today") : "Today"}
                        </button>
                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 1))}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            {t ? t("tomorrow") : "Tomorrow"}
                        </button>
                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 7))}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            {t ? t("nextWeek") : "Next week"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50">
                            {t ? t("noDate") : "No date"}
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
                        "mt-2 flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        open
                            ? "border-violet-400 bg-violet-50 text-slate-900 ring-2 ring-violet-100"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                    )}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                open ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500"
                            )}>
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <span className={cn("truncate text-left", value ? "font-medium text-slate-900" : "text-slate-400")}>
                            {formatDateDisplay(value, t)}
                        </span>
                    </div>
                </button>
            </div>
            {popup}
        </>
    );
}

function DeadlineRangePicker({
    value,
    onChange,
    t
}: {
    value: DeadlineFilter;
    onChange: (next: DeadlineFilter) => void;
    t?: (key: string) => string;
}) {
    return (
        <div className="grid min-w-[320px] grid-cols-1 gap-3 rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_20px_48px_rgba(15,23,42,0.16)]">
            <TrelloDatePicker
                label={t ? t("fromDate") : "From date"}
                value={value.startDate}
                onChange={(v) => onChange({ ...value, startDate: v })}
                max={value.endDate || undefined}
                t={t}
            />
            <TrelloDatePicker
                label={t ? t("toDate") : "To date"}
                value={value.endDate}
                onChange={(v) => onChange({ ...value, endDate: v })}
                min={value.startDate || undefined}
                t={t}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => onChange({ startDate: "", endDate: "" })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {t ? t("clearSelection") : "Clear selection"}
                </button>
            </div>
        </div>
    );
}

function DeadlineFilterPopover({
    open,
    value,
    onChange,
    onClose,
    t
}: {
    open: boolean;
    value: DeadlineFilter;
    onChange: (next: DeadlineFilter) => void;
    onClose: () => void;
    t?: (key: string) => string;
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
            className="absolute right-0 top-[calc(100%+8px)] z-[120]"
            onPointerDown={(e) => e.stopPropagation()}>
            <DeadlineRangePicker value={value} onChange={onChange} t={t} />
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
    priorityFilterValue,
    setPriorityFilterValue,
    severityFilterValue,
    setSeverityFilterValue,
    statusFilterValue,
    setStatusFilterValue,
    deadlineFilter,
    setDeadlineFilter,
    openDeadlineFilter,
    setOpenDeadlineFilter,
    searchInput,
    setSearchInput,
    statusOptions,
    hasDeadlineFilter,
    deadlineFilterLabel,
    setPage,
    handleTaskClick,
    t
}: TaskListDetailLayerProps) {
    const overdueStatusLabel = t("overdue");

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
                    exit={{ opacity: 0 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:px-8">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                                    {t("detailedSubtitle")}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[#FBFBFD] px-6 py-6 md:px-8">
                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-center">
                                <FilterField className="w-full">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder={t("searchPlaceholder")}
                                            className={cn(
                                                FILTER_ROW_INNER_CLASS,
                                                "pl-10 pr-3 font-normal outline-none placeholder:text-slate-400"
                                            )}
                                        />
                                    </div>
                                </FilterField>

                                <FilterField>
                                    <div className="relative">
                                        <Select
                                            value={selectedSource}
                                            onValueChange={(value) => {
                                                setSelectedSource(value);
                                                setPage(1);
                                            }}>
                                            <SelectTrigger
                                                className={cn(
                                                    FILTER_ROW_INNER_CLASS,
                                                    "items-center gap-2 [&_svg]:text-slate-500"
                                                )}>
                                                <SelectValue placeholder={t("allGroups")} />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                className="z-[140] rounded-xl border-slate-200 bg-white">
                                                <SelectItem value="all" className="leading-none">
                                                    {t("allGroups")}
                                                </SelectItem>
                                                {groups
                                                    .filter((group) => Boolean(group.groupId))
                                                    .map((group) => (
                                                        <SelectItem
                                                            key={group.groupId ?? group.groupName}
                                                            value={group.groupId as string}
                                                            className="leading-none">
                                                            {group.groupName}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </FilterField>

                                <FilterField>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className={cn(
                                                    FILTER_ROW_INNER_CLASS,
                                                    "flex items-center justify-between text-left transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
                                                )}>
                                                <span className="truncate leading-normal">
                                                    {FilterTriggerLabel({
                                                        t,
                                                        priorityFilterValue,
                                                        severityFilterValue,
                                                        statusFilterValue
                                                    })}
                                                </span>
                                                <Filter className="h-4 w-4 text-slate-500" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="z-[150] w-64 rounded-xl border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>{t("tableHeaderPriority")}</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="z-[151] w-52 rounded-xl border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                                    <DropdownMenuItem onClick={() => setPriorityFilterValue("all")}>
                                                        {t("allPriorities")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setPriorityFilterValue(t("priorityLow"))}>
                                                        {t("priorityLow")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setPriorityFilterValue(t("priorityMedium"))}>
                                                        {t("priorityMedium")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setPriorityFilterValue(t("priorityHigh"))}>
                                                        {t("priorityHigh")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>

                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>{t("tableHeaderSeverity")}</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="z-[151] w-52 rounded-xl border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                                    <DropdownMenuItem onClick={() => setSeverityFilterValue("all")}>
                                                        {t("allSeverities")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSeverityFilterValue(t("severityLow"))}>
                                                        {t("severityLow")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSeverityFilterValue(t("severityNormal"))}>
                                                        {t("severityNormal")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setSeverityFilterValue(t("severityImportant"))}>
                                                        {t("severityImportant")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setSeverityFilterValue(t("severityCritical"))}>
                                                        {t("severityCritical")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>

                                            <DropdownMenuItem onClick={() => setStatusFilterValue(OVERDUE_FILTER_VALUE)}>
                                                {overdueStatusLabel}
                                            </DropdownMenuItem>

                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>{t("tableHeaderStatus")}</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="z-[151] w-52 rounded-xl border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                                    <DropdownMenuItem onClick={() => setStatusFilterValue("all")}>
                                                        {t("allStatuses")}
                                                    </DropdownMenuItem>
                                                    {statusOptions.map((status) => (
                                                        <DropdownMenuItem
                                                            key={status}
                                                            onClick={() => setStatusFilterValue(status)}>
                                                            {status}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>

                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setPriorityFilterValue("all");
                                                    setSeverityFilterValue("all");
                                                    setStatusFilterValue("all");
                                                    setPage(1);
                                                }}>
                                                {t("clearSelection")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </FilterField>

                                <motion.div layout initial={false} className="relative sm:col-span-2 xl:col-span-1">
                                    <FilterField>
                                        <button
                                            type="button"
                                            onClick={() => setOpenDeadlineFilter((prev) => !prev)}
                                            className={cn(
                                                FILTER_ROW_INNER_CLASS,
                                                "flex items-center justify-between text-left transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
                                            )}>
                                            <span
                                                className={cn(
                                                    "flex min-h-0 min-w-0 flex-1 items-center text-left font-normal leading-normal",
                                                    !hasDeadlineFilter ? "text-slate-400" : "text-slate-900"
                                                )}>
                                                {hasDeadlineFilter ? deadlineFilterLabel : t("selectDateRange")}
                                            </span>
                                            <CalendarDays className="h-4 w-4 text-slate-500" />
                                        </button>
                                    </FilterField>

                                    <DeadlineFilterPopover
                                        open={openDeadlineFilter}
                                        value={deadlineFilter}
                                        onChange={setDeadlineFilter}
                                        onClose={() => setOpenDeadlineFilter(false)}
                                        t={t}
                                    />
                                </motion.div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                {priorityFilterValue !== "all" && (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700 shadow-sm">
                                        <span>
                                            {t("tableHeaderPriority")}: {priorityFilterValue}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPriorityFilterValue("all")}
                                            className="rounded-full p-0.5 hover:bg-orange-100">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                {severityFilterValue !== "all" && (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 shadow-sm">
                                        <span>
                                            {t("tableHeaderSeverity")}: {severityFilterValue}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSeverityFilterValue("all")}
                                            className="rounded-full p-0.5 hover:bg-rose-100">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                {statusFilterValue !== "all" && (
                                    <div
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm",
                                            statusFilterValue === OVERDUE_FILTER_VALUE
                                                ? "border border-rose-200 bg-rose-50 text-rose-700"
                                                : "border border-sky-200 bg-sky-50 text-sky-700"
                                        )}>
                                        <span>
                                            {t("tableHeaderStatus")}:{" "}
                                            {statusFilterValue === OVERDUE_FILTER_VALUE
                                                ? overdueStatusLabel
                                                : statusFilterValue}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilterValue("all")}
                                            className={cn(
                                                "rounded-full p-0.5",
                                                statusFilterValue === OVERDUE_FILTER_VALUE
                                                    ? "hover:bg-rose-100"
                                                    : "hover:bg-sky-100"
                                            )}>
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                {hasDeadlineFilter && (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700 shadow-sm">
                                        <Clock3 className="h-4 w-4" />
                                        <span>
                                            {t("filterDeadline")}: {deadlineFilterLabel}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setDeadlineFilter({ startDate: "", endDate: "" })}
                                            className="rounded-full p-0.5 hover:bg-violet-100">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(248,250,252,0.88))] shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200/80 bg-slate-50">
                                                <th className="px-5 py-4 text-center text-sm font-semibold text-slate-500">
                                                    {t("tableHeaderTask")}
                                                </th>
                                                <th className="px-5 py-4 text-center text-sm font-semibold text-slate-500">
                                                    {t("tableHeaderSource")}
                                                </th>
                                                <th className="px-5 py-4 text-center text-sm font-semibold text-slate-500">
                                                    {t("tableHeaderSeverity")}
                                                </th>
                                                <th className="px-5 py-4 text-center text-sm font-semibold text-slate-500">
                                                    {t("tableHeaderPriority")}
                                                </th>
                                                <th className="px-5 py-4 text-center text-sm font-semibold text-slate-500">
                                                    {t("tableHeaderStatus")}
                                                </th>
                                                <th className="px-5 py-4 text-center text-sm font-semibold text-slate-500">
                                                    {t("tableHeaderDueDate")}
                                                </th>
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
                                                            <p className="mt-4 text-lg font-semibold text-slate-800">
                                                                {t("noTasks")}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {t("noTasksHint")}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedItems.map((item, index) => {
                                                    const overdue = isOverdueTask(item.dueDate, item.progress);

                                                    return (
                                                        <motion.tr
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.25, delay: index * 0.03 }}
                                                            key={item.taskId}
                                                            onClick={() => handleTaskClick(item)}
                                                            className={cn(
                                                                "group cursor-pointer border-b border-slate-200/70 transition last:border-b-0 hover:bg-slate-50",
                                                                overdue && "bg-rose-50/30"
                                                            )}>
                                                            <td className="px-5 py-4 text-center text-base font-semibold text-slate-900">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleTaskClick(item);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 hover:text-violet-700">
                                                                    <span className="hover:underline">
                                                                        {item.taskTitle || "-"}
                                                                    </span>
                                                                    <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                                                                </button>
                                                            </td>

                                                            <td className="px-5 py-4 text-center text-sm font-medium text-slate-600">
                                                                {getSourceLabel(item, t)}
                                                            </td>

                                                            <td className="px-5 py-4 text-center">
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm",
                                                                        severityTone(item.taskSeverity)
                                                                    )}>
                                                                    {getSeverityLabel(item.taskSeverity, t)}
                                                                </span>
                                                            </td>

                                                            <td className="px-5 py-4 text-center">
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm",
                                                                        priorityTone(item.taskPriority)
                                                                    )}>
                                                                    {getPriorityLabel(item.taskPriority, t)}
                                                                </span>
                                                            </td>

                                                            <td className="px-5 py-4 text-center">
                                                                <div className="flex justify-center">
                                                                    <TaskStatusBadge
                                                                        label={item.statusName}
                                                                        overdue={overdue}
                                                                        overdueLabel={overdueStatusLabel}
                                                                    />
                                                                </div>
                                                            </td>

                                                            <td className="px-5 py-4 text-center text-sm font-medium text-slate-500">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    {overdue ? (
                                                                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                                                            {overdueStatusLabel}
                                                                        </span>
                                                                    ) : null}
                                                                    <span>{formatDueDate(item.dueDate)}</span>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })
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
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#FED7AA] bg-white px-4 py-2 text-[15px] font-medium text-[#9A3412] shadow-sm hover:bg-[#FFF7ED] disabled:cursor-not-allowed disabled:opacity-50">
                                        <ChevronLeft className="h-5 w-5" /> {t("previous")}
                                    </button>

                                    {paginationItems.map((item, index) => {
                                        if (item === "...") {
                                            return (
                                                <span
                                                    key={`ellipsis-${index}`}
                                                    className="flex h-12 min-w-12 items-center justify-center px-2 text-[16px] font-medium text-slate-400">
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
                                                )}>
                                                {item}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={page === totalPages}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#FED7AA] bg-white px-4 py-2 text-[15px] font-medium text-[#9A3412] shadow-sm hover:bg-[#FFF7ED] disabled:cursor-not-allowed disabled:opacity-50">
                                        {t("next")} <ChevronRight className="h-5 w-5" />
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
    const t = useTranslations("HomeTaskList");
    const [data, setData] = React.useState<HomeTaskListResponse | null>(null);
    const [allGroups, setAllGroups] = React.useState<UserGroupDto[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchInput, setSearchInput] = React.useState("");
    const [searchValue, setSearchValue] = React.useState("");
    const [selectedSource, setSelectedSource] = React.useState<SourceFilterValue>("all");
    const [priorityFilterValue, setPriorityFilterValue] = React.useState<TaskFilterValue>("all");
    const [severityFilterValue, setSeverityFilterValue] = React.useState<TaskFilterValue>("all");
    const [statusFilterValue, setStatusFilterValue] = React.useState<TaskFilterValue>("all");
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
                    search: searchValue
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
    }, [searchValue]);

    const rawItems = data?.items ?? [];

    const groups = React.useMemo(() => {
        const sourceGroups: UserGroupDto[] = allGroups.length ? allGroups : (data?.userGroups ?? []);
        return sourceGroups.filter((group) => !!group.groupId);
    }, [allGroups, data?.userGroups]);

    const validGroupIds = React.useMemo(() => new Set(groups.map((group) => group.groupId).filter(Boolean)), [groups]);

    const sanitizedItems = React.useMemo(
        () => rawItems.filter((item) => !!item.groupId && validGroupIds.has(item.groupId)),
        [rawItems, validGroupIds]
    );

    React.useEffect(() => {
        if (selectedSource !== "all" && !groups.some((group) => group.groupId === selectedSource)) {
            setSelectedSource("all");
            setPage(1);
        }
    }, [selectedSource, groups]);

    const sourceFilteredItems = React.useMemo(() => {
        if (selectedSource !== "all") {
            return sanitizedItems.filter((item) => item.groupId === selectedSource);
        }
        return sanitizedItems;
    }, [sanitizedItems, selectedSource]);

    const displayItems = React.useMemo(() => {
        let result = [...sourceFilteredItems];

        if (priorityFilterValue !== "all") {
            result = result.filter((item) => getPriorityLabel(item.taskPriority, t) === priorityFilterValue);
        }
        if (severityFilterValue !== "all") {
            result = result.filter((item) => getSeverityLabel(item.taskSeverity, t) === severityFilterValue);
        }
        if (statusFilterValue !== "all") {
            result = result.filter((item) =>
                statusFilterValue === OVERDUE_FILTER_VALUE
                    ? isOverdueTask(item.dueDate, item.progress)
                    : (item.statusName ?? "") === statusFilterValue
            );
        }
        if (deadlineFilter.startDate || deadlineFilter.endDate) {
            result = result.filter((item) => matchDeadlineDate(item.dueDate, deadlineFilter));
        }

        return result;
    }, [sourceFilteredItems, priorityFilterValue, severityFilterValue, statusFilterValue, deadlineFilter, t]);

    const statusOptions = React.useMemo(() => {
        const overdueAliases = new Set([
            normalizeStatusName(t("overdue")),
            normalizeStatusName("Overdue"),
            normalizeStatusName("Quá hạn")
        ]);
        const values = new Set(sanitizedItems.map((item) => (item.statusName ?? "").trim()).filter(Boolean));
        return Array.from(values).filter((status) => !overdueAliases.has(normalizeStatusName(status)));
    }, [sanitizedItems, t]);

    React.useEffect(() => {
        setPage(1);
    }, [
        selectedSource,
        priorityFilterValue,
        severityFilterValue,
        statusFilterValue,
        deadlineFilter.startDate,
        deadlineFilter.endDate,
        searchValue
    ]);

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
        if (page >= totalPages - 3)
            return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, "...", page - 1, page, page + 1, "...", totalPages];
    }, [page, totalPages]);

    const previewGroups = React.useMemo<GroupPreviewItem[]>(() => {
        const groupMap = new Map<string, GroupPreviewItem>();

        sanitizedItems.forEach((item) => {
            if (!item.groupId) return;

            const groupId = item.groupId;
            const groupName = item.groupName || item.sourceName || t("groupSource");

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
    }, [sanitizedItems, t]);

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

    const deadlineFilterLabel = [
        deadlineFilter.startDate && `${t("fromDate")} ${formatFilterDateLabel(deadlineFilter.startDate)}`,
        deadlineFilter.endDate && `${t("toDate")} ${formatFilterDateLabel(deadlineFilter.endDate)}`
    ]
        .filter(Boolean)
        .join(" • ");

    const hasDeadlineFilter = !!(deadlineFilter.startDate || deadlineFilter.endDate);

    return (
        <>
            <div
                id="home-group-task-section"
                className="relative overflow-hidden scroll-mt-24 bg-[linear-gradient(180deg,#F8FAFC_0%,#F7F7FF_36%,#F3F7FB_100%)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[-80px] top-[-30px] h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
                    <div className="absolute right-[-60px] top-[20%] h-80 w-80 rounded-full bg-sky-200/18 blur-3xl" />
                    <div className="absolute bottom-[-100px] left-[20%] h-96 w-96 rounded-full bg-orange-100/16 blur-3xl" />
                </div>

                <Container className="py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.68))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.08),transparent_30%)]" />

                        <div className="relative">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <h2 className="mt-4 bg-[linear-gradient(135deg,#0F172A_0%,#4338CA_55%,#0F766E_100%)] bg-clip-text text-[32px] font-bold leading-tight tracking-[-0.02em] text-transparent md:text-[40px]">
                                        {t("title")}
                                    </h2>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                            {t("totalTasks")}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            <FolderKanban className="h-4 w-4 text-violet-600" />
                                            {displayItems.length}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                            {t("availableGroups")}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            <LayoutGrid className="h-4 w-4 text-sky-600" />
                                            {groups.length}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
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
                                            <p className="mt-4 text-lg font-semibold text-slate-800">
                                                {t("noAssignedTasks")}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">{t("noAssignedTasksHint")}</p>
                                        </div>
                                    </div>
                                ) : (
                                    previewGroups.map((group) => (
                                        <button
                                            key={group.groupId}
                                            type="button"
                                            onClick={() => handleOpenDetailByGroup(group.groupId)}
                                            className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                                            <p className="line-clamp-1 text-xl font-semibold text-slate-900">
                                                {group.groupName}
                                            </p>

                                            <p className="mt-3 text-sm font-medium text-slate-500">
                                                {group.taskCount} {t("taskCountLabel")}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {typeof group.highestSeverity !== "undefined" ? (
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                            severityTone(group.highestSeverity)
                                                        )}>
                                                        {getSeverityLabel(group.highestSeverity, t)}
                                                    </span>
                                                ) : null}

                                                {typeof group.highestPriority !== "undefined" ? (
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                            priorityTone(group.highestPriority)
                                                        )}>
                                                        {getPriorityLabel(group.highestPriority, t)}
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
                                    className="h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4">
                                    {t("viewDetails")}
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
                groups={groups}
                paginatedItems={paginatedItems}
                page={page}
                totalPages={totalPages}
                paginationItems={paginationItems}
                selectedSource={selectedSource}
                setSelectedSource={setSelectedSource}
                priorityFilterValue={priorityFilterValue}
                setPriorityFilterValue={setPriorityFilterValue}
                severityFilterValue={severityFilterValue}
                setSeverityFilterValue={setSeverityFilterValue}
                statusFilterValue={statusFilterValue}
                setStatusFilterValue={setStatusFilterValue}
                deadlineFilter={deadlineFilter}
                setDeadlineFilter={setDeadlineFilter}
                openDeadlineFilter={openDeadlineFilter}
                setOpenDeadlineFilter={setOpenDeadlineFilter}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                statusOptions={statusOptions}
                hasDeadlineFilter={hasDeadlineFilter}
                deadlineFilterLabel={deadlineFilterLabel}
                setPage={setPage}
                handleTaskClick={handleTaskClick}
                t={t}
            />
        </>
    );
}

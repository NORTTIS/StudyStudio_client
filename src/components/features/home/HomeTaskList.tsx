"use client";

import * as React from "react";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Search,
    X
} from "lucide-react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { useRouter } from "next/navigation";
import "react-day-picker/dist/style.css";

import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";

type HomeTaskListResponse = components["schemas"]["HomeTaskListResponse"];
type HomeTaskListResponseApiResponse =
    components["schemas"]["HomeTaskListResponseApiResponse"];
type HomeTaskListItemResponse =
    components["schemas"]["HomeTaskListItemResponse"];
type UserGroupDto = components["schemas"]["UserGroupDto"];

const PAGE_SIZE = 20;

type SourceFilterValue = "all" | "personal" | string;
type SortValue = "deadline" | "priority" | "severity" | "status";

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
    const diffDays = Math.round(
        (target.getTime() - today.getTime()) / 86400000
    );

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
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function matchDeadlineDate(
    raw?: string | null,
    filter?: DeadlineFilter | null
) {
    if (!filter) return true;
    const { startDate, endDate } = filter;

    if (!startDate && !endDate) return true;

    const s = String(raw ?? "").trim();
    if (!s) return false;

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return false;

    const dateOnly = formatDateToInputValue(startOfDay(d));

    if (startDate && dateOnly < startDate) return false;
    if (endDate && dateOnly > endDate) return false;

    return true;
}

function buildTaskListUrl(params: {
    groupId?: string;
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
}) {
    const rawBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "";
    const base = rawBase.replace(/\/+$/, "");

    if (!base) return "";

    const endpoint = /\/api$/i.test(base)
        ? `${base}/Home/TaskList`
        : `${base}/api/Home/TaskList`;

    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params.page));
    searchParams.set("pageSize", String(params.pageSize));

    if (params.groupId) searchParams.set("groupId", params.groupId);
    if (params.search?.trim()) searchParams.set("search", params.search.trim());
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);

    return `${endpoint}?${searchParams.toString()}`;
}

function extractTaskListData(payload: unknown): HomeTaskListResponse | null {
    const source = payload as
        | HomeTaskListResponseApiResponse
        | {
            status?: string;
            data?: HomeTaskListResponseApiResponse | HomeTaskListResponse | null;
        }
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

    if (
        source &&
        typeof source === "object" &&
        "data" in source &&
        (source as HomeTaskListResponseApiResponse).data
    ) {
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
    if (value === 2) return "text-rose-600";
    if (value === 1) return "text-amber-700";
    return "text-emerald-700";
}

function severityTone(value?: components["schemas"]["TaskSeverity"]) {
    if (value === 3) return "text-red-600";
    if (value === 2) return "text-orange-600";
    if (value === 1) return "text-yellow-500";
    return "text-sky-600";
}

function formatDueDate(value?: string | null) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const currentYear = new Date().getFullYear();
    const year = date.getFullYear();

    if (year !== currentYear) {
        return `${year}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
            date.getDate()
        ).padStart(2, "0")}`;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric"
    }).format(date);
}

function getSourceLabel(item: HomeTaskListItemResponse) {
    if (item.groupName) return item.groupName;
    if (item.sourceName) return item.sourceName;
    if (item.sourceType?.toLowerCase() === "personal") return "Personal";
    return "Personal";
}

function isPersonalTask(item: HomeTaskListItemResponse) {
    return !item.groupId || item.sourceType?.toLowerCase() === "personal";
}

function buildTaskDetailHref(item: HomeTaskListItemResponse) {
    const taskId = item.taskId ?? "";
    if (!taskId) return "#";

    if (isPersonalTask(item)) {
        return `/home/personal-task?taskId=${taskId}&openTaskDetail=1`;
    }

    if (item.groupId) {
        return `/group/${item.groupId}?taskId=${taskId}&openTaskDetail=1`;
    }

    return "#";
}

function TaskStatusBadge({ label }: { label?: string | null }) {
    return (
        <span className="inline-flex min-h-11 items-center rounded-2xl border border-[#D9E1EC] bg-white px-4 py-2 text-[15px] font-medium text-[#261E33]">
            {label || "-"}
        </span>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white"
                />
            ))}
        </div>
    );
}

function TrelloDatePicker({
    label,
    value,
    onChange,
    min,
    max
}: TrelloDatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(
        null
    );

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const selectedDate = React.useMemo(() => parseDateString(value), [value]);
    const minDate = React.useMemo(() => parseDateString(min), [min]);
    const maxDate = React.useMemo(() => parseDateString(max), [max]);

    const initialMonth = React.useMemo(
        () => selectedDate ?? minDate ?? new Date(),
        [selectedDate, minDate]
    );
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

        let top = shouldOpenUp
            ? rect.top - popupHeight - gap
            : rect.bottom + gap;
        let left = rect.left;

        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }
        if (left < viewportPadding) left = viewportPadding;
        if (top < viewportPadding) top = viewportPadding;
        if (top + popupHeight > window.innerHeight - viewportPadding) {
            top = Math.max(
                viewportPadding,
                window.innerHeight - popupHeight - viewportPadding
            );
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
        const startYear = Math.min(
            minDate?.getFullYear() ?? currentYear - 5,
            currentYear - 5
        );
        const endYear = currentYear + 10;
        return Array.from(
            { length: endYear - startYear + 1 },
            (_, i) => startYear + i
        );
    }, [minDate]);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(new Date(month.getFullYear(), Number(e.target.value), 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(new Date(Number(e.target.value), month.getMonth(), 1));
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
                            <ChevronRight className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
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
                            <ChevronRight className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
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
                                {monthOptions[month.getMonth()]?.label}{" "}
                                {month.getFullYear()}
                            </div>

                            <button
                                type="button"
                                onClick={goNextMonth}
                                disabled={isNextDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                                weekday:
                                    "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                weeks: "w-full",
                                week: "mt-2 flex w-full justify-between",
                                day: "h-10 w-10 p-0 text-center",
                                cell: "h-10 w-10 p-0 text-center",
                                day_button:
                                    "h-10 w-10 rounded-xl border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 shadow-none outline-none ring-0 transition hover:bg-orange-50 focus:outline-none focus:ring-0",
                                selected: "!bg-orange-500 !text-white rounded-xl",
                                day_selected:
                                    "!bg-orange-500 !text-white hover:!bg-orange-500 hover:!text-white",
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
                document.body
            )
            : null;

    return (
        <>
            <div className="relative">
                <div className="text-sm font-semibold text-zinc-600">{label}</div>

                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        open
                            ? "border-orange-400 bg-orange-50 text-zinc-900 ring-2 ring-orange-100"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                open
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-zinc-100 text-zinc-500"
                            )}
                        >
                            <CalendarDays className="h-4 w-4" />
                        </div>

                        <span
                            className={cn(
                                "truncate text-left",
                                value ? "font-medium text-zinc-900" : "text-zinc-400"
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

function DeadlineRangePicker({
    value,
    onChange
}: {
    value: DeadlineFilter;
    onChange: (next: DeadlineFilter) => void;
}) {
    return (
        <div className="grid min-w-[360px] grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
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
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
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
        <div
            className="absolute top-[calc(100%+12px)] right-0 z-30"
            onPointerDown={(e) => e.stopPropagation()}
        >
            <DeadlineRangePicker value={value} onChange={onChange} />
        </div>
    );
}

export default function HomeTaskList() {
    const router = useRouter();

    const [data, setData] = React.useState<HomeTaskListResponse | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchInput, setSearchInput] = React.useState("");
    const [searchValue, setSearchValue] = React.useState("");
    const [selectedSource, setSelectedSource] =
        React.useState<SourceFilterValue>("all");
    const [sortBy, setSortBy] = React.useState<SortValue>("deadline");
    const [sortFilterValue, setSortFilterValue] = React.useState("all");
    const [deadlineFilter, setDeadlineFilter] = React.useState<DeadlineFilter>({
        startDate: "",
        endDate: ""
    });
    const [openDeadlineFilter, setOpenDeadlineFilter] = React.useState(false);
    const [page, setPage] = React.useState(1);

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1);
            setSearchValue(searchInput);
        }, 400);

        return () => window.clearTimeout(timer);
    }, [searchInput]);

    React.useEffect(() => {
        let isMounted = true;

        const fetchTaskList = async () => {
            try {
                setIsLoading(true);

                const groupId =
                    selectedSource !== "all" && selectedSource !== "personal"
                        ? selectedSource
                        : undefined;

                const url = buildTaskListUrl({
                    groupId,
                    page,
                    pageSize: PAGE_SIZE,
                    search: searchValue,
                    sortBy
                });

                if (!url) {
                    setIsLoading(false);
                    return;
                }

                const response = await apiFetch<HomeTaskListResponseApiResponse>(
                    url,
                    {
                        method: "GET"
                    }
                );

                if (!isMounted) return;

                const nextData = extractTaskListData(response);

                if (nextData) {
                    setData(nextData);
                } else {
                    console.error(
                        "Home task list response format unexpected:",
                        response
                    );
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
    }, [page, searchValue, selectedSource, sortBy]);

    const groups = data?.userGroups ?? [];
    const rawItems = data?.items ?? [];

    const sourceFilteredItems = React.useMemo(() => {
        if (selectedSource === "personal") {
            return rawItems.filter((item) => isPersonalTask(item));
        }
        return rawItems;
    }, [rawItems, selectedSource]);

    const displayItems = React.useMemo(() => {
        let result = [...sourceFilteredItems];

        if (sortBy === "priority" && sortFilterValue !== "all") {
            result = result.filter(
                (item) => getPriorityLabel(item.taskPriority) === sortFilterValue
            );
        }

        if (sortBy === "severity" && sortFilterValue !== "all") {
            result = result.filter(
                (item) => getSeverityLabel(item.taskSeverity) === sortFilterValue
            );
        }

        if (sortBy === "status" && sortFilterValue !== "all") {
            result = result.filter(
                (item) => (item.statusName ?? "") === sortFilterValue
            );
        }

        if (sortBy === "deadline") {
            result = result.filter((item) =>
                matchDeadlineDate(item.dueDate, deadlineFilter)
            );
        }

        return result;
    }, [sourceFilteredItems, sortBy, sortFilterValue, deadlineFilter]);

    const statusOptions = React.useMemo(() => {
        const unique = Array.from(
            new Set(
                rawItems
                    .map((item) => (item.statusName ?? "").trim())
                    .filter(Boolean)
            )
        );
        return unique;
    }, [rawItems]);

    const totalPages = Math.max(Math.ceil(displayItems.length / 4), 1);

    const paginatedItems = React.useMemo(() => {
        const start = (page - 1) * 4;
        return displayItems.slice(start, start + 4);
    }, [displayItems, page]);

    React.useEffect(() => {
        setPage(1);
    }, [sortFilterValue, deadlineFilter.startDate, deadlineFilter.endDate]);

    const pageNumbers = React.useMemo(() => {
        if (totalPages <= 3) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (page <= 2) return [1, 2, 3];
        if (page >= totalPages - 1)
            return [totalPages - 2, totalPages - 1, totalPages];

        return [page - 1, page, page + 1];
    }, [page, totalPages]);

    const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setPage(1);
        setSelectedSource(event.target.value);
    };

    const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setPage(1);
        const nextSort = event.target.value as SortValue;
        setSortBy(nextSort);
        setSortFilterValue("all");
        setOpenDeadlineFilter(false);
    };

    const handleTaskClick = (item: HomeTaskListItemResponse) => {
        const href = buildTaskDetailHref(item);
        if (href !== "#") {
            router.push(href);
        }
    };

    const showExtraFilter =
        sortBy === "priority" || sortBy === "severity" || sortBy === "status";
    const showDeadlineFilter = sortBy === "deadline";

    const deadlineFilterLabel = [
        deadlineFilter.startDate &&
        `Từ ${formatFilterDateLabel(deadlineFilter.startDate)}`,
        deadlineFilter.endDate &&
        `Đến ${formatFilterDateLabel(deadlineFilter.endDate)}`
    ]
        .filter(Boolean)
        .join(" • ");

    const hasDeadlineFilter = !!(
        deadlineFilter.startDate || deadlineFilter.endDate
    );

    return (
        <div className="bg-[radial-gradient(circle_at_top,#f8fafc_0%,#f8fafc_35%,#f3f4f6_100%)]">
            <Container className="pt-8 pb-8">
                <div className="rounded-[32px] border border-[#D9E1EC] bg-white p-6 shadow-sm md:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-[#261E33]">
                        Công việc từ các nhóm
                    </h2>

                    <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full xl:max-w-[820px]">
                            <Search className="pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                            <input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search tasks"
                                className="h-14 w-full rounded-2xl border border-[#D9E1EC] bg-white pr-4 pl-14 text-lg text-[#261E33] outline-none transition focus:border-[#B8C6DB]"
                            />
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="relative">
                                <select
                                    value={selectedSource}
                                    onChange={handleSourceChange}
                                    className="h-14 min-w-[180px] appearance-none rounded-2xl border border-[#D9E1EC] bg-white px-6 pr-12 text-lg text-[#261E33] outline-none"
                                >
                                    <option value="all">All</option>
                                    <option value="personal">Personal</option>
                                    {groups.map((group: UserGroupDto) => (
                                        <option
                                            key={group.groupId ?? group.groupName}
                                            value={group.groupId ?? ""}
                                        >
                                            {group.groupName}
                                        </option>
                                    ))}
                                </select>
                                <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
                            </div>

                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={handleSortChange}
                                    className="h-14 min-w-[240px] appearance-none rounded-2xl border border-[#D9E1EC] bg-white px-6 pr-12 text-lg text-[#261E33] outline-none"
                                >
                                    <option value="deadline">Sort by Deadline</option>
                                    <option value="priority">Sort by Priority</option>
                                    <option value="severity">Sort by Severity</option>
                                    <option value="status">Sort by Status</option>
                                </select>
                                <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
                            </div>

                            {showExtraFilter && (
                                <div className="relative">
                                    <select
                                        value={sortFilterValue}
                                        onChange={(event) =>
                                            setSortFilterValue(event.target.value)
                                        }
                                        className="h-14 min-w-[220px] appearance-none rounded-2xl border border-[#D9E1EC] bg-white px-6 pr-12 text-lg text-[#261E33] outline-none"
                                    >
                                        <option value="all">All</option>

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
                                                <option value="Bình thường">
                                                    Bình thường
                                                </option>
                                                <option value="Quan trọng">
                                                    Quan trọng
                                                </option>
                                                <option value="Khẩn cấp">
                                                    Khẩn cấp
                                                </option>
                                            </>
                                        )}

                                        {sortBy === "status" &&
                                            statusOptions.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                    </select>
                                    <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
                                </div>
                            )}

                            {showDeadlineFilter && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenDeadlineFilter((prev) => !prev)
                                        }
                                        className="flex h-14 min-w-[240px] items-center justify-between rounded-2xl border border-[#D9E1EC] bg-white px-6 text-lg text-[#261E33]"
                                    >
                                        <span
                                            className={cn(
                                                !hasDeadlineFilter && "text-[#64748B]"
                                            )}
                                        >
                                            {hasDeadlineFilter
                                                ? deadlineFilterLabel
                                                : "Chọn khoảng ngày"}
                                        </span>
                                        <CalendarDays className="h-5 w-5 text-[#64748B]" />
                                    </button>

                                    <DeadlineFilterPopover
                                        open={openDeadlineFilter}
                                        value={deadlineFilter}
                                        onChange={setDeadlineFilter}
                                        onClose={() => setOpenDeadlineFilter(false)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {showDeadlineFilter && hasDeadlineFilter && (
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700">
                                <span>{deadlineFilterLabel}</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDeadlineFilter({
                                            startDate: "",
                                            endDate: ""
                                        })
                                    }
                                    className="rounded-full p-0.5 hover:bg-zinc-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[#3F3F46]">
                                    <th className="px-6 py-5 text-center text-[18px] font-semibold text-[#71829E]">
                                        Công việc
                                    </th>
                                    <th className="px-6 py-5 text-center text-[18px] font-semibold text-[#71829E]">
                                        Nguồn
                                    </th>
                                    <th className="px-6 py-5 text-center text-[18px] font-semibold text-[#71829E]">
                                        Độ khẩn cấp
                                    </th>
                                    <th className="px-6 py-5 text-center text-[18px] font-semibold text-[#71829E]">
                                        Độ ưu tiên
                                    </th>
                                    <th className="px-6 py-5 text-center text-[18px] font-semibold text-[#71829E]">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-5 text-center text-[18px] font-semibold text-[#71829E]">
                                        Thời hạn đến
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
                                        <td
                                            colSpan={6}
                                            className="px-6 py-12 text-center text-lg text-[#71829E]"
                                        >
                                            Không có công việc nào
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedItems.map((item) => (
                                        <tr
                                            key={item.taskId}
                                            onClick={() => handleTaskClick(item)}
                                            className="cursor-pointer border-b border-[#3F3F46] transition hover:bg-[#F8FAFC] last:border-b"
                                        >
                                            <td className="px-6 py-8 text-center text-[20px] font-semibold text-[#261E33]">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTaskClick(item);
                                                    }}
                                                    className="cursor-pointer hover:underline"
                                                >
                                                    {item.taskTitle || "-"}
                                                </button>
                                            </td>

                                            <td className="px-6 py-8 text-center text-[18px] font-medium text-[#261E33]">
                                                {getSourceLabel(item)}
                                            </td>

                                            <td className="px-6 py-8 text-center text-[18px] font-semibold">
                                                <span className={severityTone(item.taskSeverity)}>
                                                    {getSeverityLabel(item.taskSeverity)}
                                                </span>
                                            </td>

                                            <td className="px-6 py-8 text-center text-[18px] font-semibold">
                                                <span className={priorityTone(item.taskPriority)}>
                                                    {getPriorityLabel(item.taskPriority)}
                                                </span>
                                            </td>

                                            <td className="px-6 py-8 text-center">
                                                <div className="flex justify-center">
                                                    <TaskStatusBadge
                                                        label={item.statusName}
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-6 py-8 text-center text-[18px] font-medium text-[#71829E]">
                                                {formatDueDate(item.dueDate)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && totalPages > 1 && (
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[#261E33]">
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((prev) => Math.max(prev - 1, 1))
                                }
                                disabled={page === 1}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[18px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                Previous
                            </button>

                            {pageNumbers[0] > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setPage(1)}
                                        className="h-14 min-w-14 rounded-xl px-4 text-[18px] font-medium"
                                    >
                                        1
                                    </button>
                                    {pageNumbers[0] > 2 && (
                                        <span className="px-2 text-[24px]">...</span>
                                    )}
                                </>
                            )}

                            {pageNumbers.map((pageNumber) => {
                                const isActive = pageNumber === page;

                                return (
                                    <button
                                        key={pageNumber}
                                        type="button"
                                        onClick={() => setPage(pageNumber)}
                                        className={[
                                            "h-14 min-w-14 rounded-xl border px-4 text-[18px] font-medium transition",
                                            isActive
                                                ? "border-[#3F3F46] bg-[#F3F4F6] text-[#261E33]"
                                                : "border-transparent bg-transparent text-[#261E33]"
                                        ].join(" ")}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}

                            {pageNumbers[pageNumbers.length - 1] < totalPages && (
                                <>
                                    {pageNumbers[pageNumbers.length - 1] <
                                        totalPages - 1 && (
                                            <span className="px-2 text-[24px]">...</span>
                                        )}
                                    <button
                                        type="button"
                                        onClick={() => setPage(totalPages)}
                                        className="h-14 min-w-14 rounded-xl px-4 text-[18px] font-medium"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    setPage((prev) => Math.min(prev + 1, totalPages))
                                }
                                disabled={page === totalPages}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[18px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </Container>
        </div>
    );
}
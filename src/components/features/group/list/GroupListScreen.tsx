"use client";

import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Search,
    AlertTriangle,
    ListTodo,
    CalendarDays
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { createPortal } from "react-dom";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import TaskDetailModal from "@/components/features/group/task/TaskDetailModal";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type GroupTaskListResponse = components["schemas"]["GroupTaskListResponse"];
type UserDto = components["schemas"]["UserDto"];
type TaskPriority = components["schemas"]["TaskPriority"];
type TaskSeverity = components["schemas"]["TaskSeverity"];

type TaskRow = {
    id: string;
    title: string;
    statusId: string;
    assigneeId: string;
    assigneeName: string;
    assigneeAvatarUrl: string | null;
    assigneeInitials: string;
    severityLabel: string;
    severityClass: string;
    taskSeverity: TaskSeverity;
    priorityLabel: string;
    priorityClass: string;
    taskPriority: TaskPriority;
    statusName: string;
    startLabel: string;
    dueLabel: string;
    dueDate: string | null;
    progress: number;
};

type DateFilterValues = {
    startDate: string;
    dueDate: string;
};

type DropdownOption = {
    value: string;
    label: string;
    avatarUrl?: string | null;
    initials?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function asObject(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
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
        return { json: JSON.parse(cleaned) as unknown, text };
    } catch {
        return { json: null as unknown, text };
    }
}

const okByJsonStatus = (obj: unknown) => {
    const s = String(asObject(obj)?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: unknown, fallback: string) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    return msg || text.trim() || fallback;
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

function formatShortDate(input: string | null | undefined, locale: string) {
    const raw = String(input ?? "").trim();
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "-";
    const dateLocale = locale.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
    return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
}

function normalizeDateInput(value: string) {
    return String(value).trim();
}

function formatFilterDate(input: string, locale: string) {
    const raw = String(input).trim();
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat(locale.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function severityClassOf(v?: TaskSeverity) {
    if (v === 3) return "text-red-600";
    if (v === 2) return "text-orange-600";
    if (v === 1) return "text-amber-600";
    return "text-sky-600";
}

function priorityLabelOf(v: TaskPriority | undefined, t: (key: string) => string) {
    if (v === 2) return t("high");
    if (v === 1) return t("medium");
    return t("low");
}

function severityLabelOf(v: TaskSeverity | undefined, t: (key: string) => string) {
    if (v === 3) return t("critical");
    if (v === 2) return t("major");
    if (v === 1) return t("moderate");
    return t("minor");
}

function priorityClassOf(v?: TaskPriority) {
    if (v === 2) return "text-rose-600";
    if (v === 1) return "text-amber-700";
    return "text-emerald-700";
}

function buildInitials(name: string) {
    const s = String(name).trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${first}${last}`.toUpperCase() || "U";
}

function buildAssignee(user: UserDto | null | undefined, unassignedText: string) {
    const fullName = `${String(user?.firstName ?? "").trim()} ${String(user?.lastName ?? "").trim()}`.trim();
    const assigneeName = fullName || unassignedText;

    return {
        name: assigneeName,
        avatarUrl: String(user?.avatarUrl ?? "").trim() || null,
        initials: buildInitials(assigneeName)
    };
}

function mergeStatusOptions(
    current: Array<{ id: string; name: string }>,
    incoming: Array<{ id: string; name: string }>
) {
    const merged = new Map<string, { id: string; name: string }>();
    [...current, ...incoming].forEach((option) => {
        if (!option.id || !option.name) return;
        merged.set(option.id, option);
    });
    return Array.from(merged.values());
}

function mergeDropdownOptions(current: DropdownOption[], incoming: DropdownOption[]) {
    const merged = new Map<string, DropdownOption>();
    [...current, ...incoming].forEach((option) => {
        if (!option.value || !option.label) return;
        merged.set(option.value, option);
    });
    return Array.from(merged.values());
}

function isOverdueTask(dueDate: string | null | undefined, progress: number | undefined) {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    const notDone = (progress ?? 100) < 100;
    return due < now && notDone;
}

async function apiGetGroupTasks(args: {
    groupId: string;
    search?: string;
    statusId?: string;
    startDateFrom?: string;
    startDateTo?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    sortBy?: string;
    sortAscending?: boolean;
    page?: number;
    pageSize?: number;
    fallbackMessage: string;
    missingApiBaseMessage: string;
}) {
    const base = getApiBase();
    const token = getAccessTokenOrNull();
    if (!base) throw new Error(args.missingApiBaseMessage);

    const query = new URLSearchParams();
    if (args.search) query.set("search", args.search);
    if (args.statusId) query.set("statusId", args.statusId);
    if (args.startDateFrom) query.set("startDateFrom", args.startDateFrom);
    if (args.startDateTo) query.set("startDateTo", args.startDateTo);
    if (args.dueDateFrom) query.set("dueDateFrom", args.dueDateFrom);
    if (args.dueDateTo) query.set("dueDateTo", args.dueDateTo);
    if (args.sortBy) query.set("sortBy", args.sortBy);
    query.set("sortAscending", String(Boolean(args.sortAscending)));
    query.set("page", String(args.page ?? 1));
    query.set("pageSize", String(args.pageSize ?? 100));

    const suffix = query.toString();
    const url = apiUrl(`/group/${encodeURIComponent(args.groupId)}/tasks${suffix ? `?${suffix}` : ""}`);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json, args.fallbackMessage));
    }

    return (json ?? null) as ApiResponse<GroupTaskListResponse> | null;
}

function FilterChip({
    active,
    label,
    onClick,
    icon
}: {
    active?: boolean;
    label: string;
    onClick?: () => void;
    icon?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold transition-all duration-200",
                active
                    ? "border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/80 text-orange-700 shadow-[0_10px_24px_rgba(251,146,60,0.14)]"
                    : "border-zinc-200/80 bg-white/90 text-zinc-700 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:-translate-y-[1px] hover:border-orange-200 hover:bg-white hover:shadow-[0_10px_24px_rgba(251,146,60,0.10)]"
            )}>
            {icon ? <span className="flex shrink-0 items-center justify-center">{icon}</span> : null}
            <span className="truncate text-center">{label}</span>
        </button>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="h-20 animate-pulse rounded-[24px] border border-zinc-200/70 bg-gradient-to-r from-white via-zinc-50 to-orange-50/30"
                />
            ))}
        </div>
    );
}

function DateFilterModal(props: {
    open: boolean;
    values: DateFilterValues;
    t: (key: string) => string;
    onChange: (patch: Partial<DateFilterValues>) => void;
    onClose: () => void;
    onClear: () => void;
    onSubmit: () => void;
}) {
    const { open, values, t, onChange, onClose, onClear, onSubmit } = props;
    if (!open) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
                onPointerDown={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}>
                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.20)]"
                    onPointerDown={(e) => e.stopPropagation()}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-100/60 via-amber-50/50 to-sky-100/40" />

                    <div className="relative">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg">
                                    <CalendarDays className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-xl text-zinc-900">{t("dateFilterTitle")}</h3>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">
                                {t("cancel")}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="group flex flex-col gap-2">
                                <span className="font-semibold text-sm text-zinc-700">{t("startDate")}</span>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-1 transition group-focus-within:border-orange-300 group-focus-within:bg-white group-focus-within:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]">
                                    <input
                                        type="date"
                                        value={values.startDate}
                                        onChange={(e) => onChange({ startDate: normalizeDateInput(e.target.value) })}
                                        className="h-11 w-full rounded-xl bg-transparent px-3 text-sm text-zinc-800 outline-none"
                                    />
                                </div>
                            </label>

                            <label className="group flex flex-col gap-2">
                                <span className="font-semibold text-sm text-zinc-700">{t("dueDate")}</span>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-1 transition group-focus-within:border-orange-300 group-focus-within:bg-white group-focus-within:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]">
                                    <input
                                        type="date"
                                        value={values.dueDate}
                                        onChange={(e) => onChange({ dueDate: normalizeDateInput(e.target.value) })}
                                        className="h-11 w-full rounded-xl bg-transparent px-3 text-sm text-zinc-800 outline-none"
                                    />
                                </div>
                            </label>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClear}
                                className="h-11 rounded-2xl border border-zinc-200 bg-white px-4 font-semibold text-sm text-zinc-700 transition hover:bg-zinc-50">
                                {t("clearFilter")}
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                className="h-11 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 px-5 font-semibold text-sm text-white shadow-[0_12px_24px_rgba(24,24,27,0.16)] transition hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(24,24,27,0.20)]">
                                {t("applyFilter")}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

function FancyDropdown({
    value,
    options,
    onChange,
    ariaLabel,
    emptyValue,
    emptyLabel
}: {
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    emptyValue?: string;
    emptyLabel?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [portalReady, setPortalReady] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);

    const isEmptyState = emptyValue !== undefined && emptyLabel && value === emptyValue;
    const activeOption = options.find((option) => option.value === value);
    const activeLabel = activeOption?.label ?? options[0]?.label ?? "";
    const triggerText = isEmptyState ? emptyLabel : activeLabel;

    React.useEffect(() => {
        setPortalReady(typeof document !== "undefined");
    }, []);

    React.useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const dropdownStyle: React.CSSProperties = {
        position: "fixed",
        top: triggerRect ? triggerRect.bottom + 10 : 0,
        left: triggerRect ? triggerRect.left : 0,
        minWidth: triggerRect ? triggerRect.width : "auto"
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className={cn(
                    "group flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border px-3.5 text-left outline-none transition-all duration-200",
                    "border-zinc-200/80 bg-white/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)]",
                    "hover:-translate-y-[1px] hover:border-orange-200 hover:bg-white hover:shadow-[0_10px_24px_rgba(251,146,60,0.10)]",
                    "focus:border-orange-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]"
                )}>
                <span className="flex min-w-0 items-center gap-2.5">
                    {!isEmptyState && activeOption?.avatarUrl ? (
                        <Image
                            src={activeOption.avatarUrl}
                            alt={activeOption.label}
                            width={28}
                            height={28}
                            className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-white"
                        />
                    ) : null}

                    {!isEmptyState && !activeOption?.avatarUrl && activeOption?.initials ? (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-amber-100 text-[10px] font-bold text-orange-700">
                            {activeOption.initials}
                        </span>
                    ) : null}

                    <span
                        className={cn(
                            "min-w-0 truncate text-sm leading-normal",
                            isEmptyState ? "font-normal text-zinc-500" : "font-semibold text-zinc-800"
                        )}>
                        {triggerText}
                    </span>
                </span>

                <ChevronDown
                    className={cn(
                        "h-4 w-4 shrink-0 text-zinc-400 transition-all duration-200 group-hover:text-orange-500",
                        open && "rotate-180 text-orange-500"
                    )}
                />
            </button>

            {open &&
                portalReady &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            style={dropdownStyle}
                            className="z-[9999] overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur">
                            <div className="max-h-[320px] overflow-y-auto p-2">
                                {options.map((option) => {
                                    const isActive = option.value === value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChange(option.value);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition-all duration-150",
                                                isActive
                                                    ? "bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/70 font-semibold text-orange-700 shadow-sm"
                                                    : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                                            )}>
                                            {option.avatarUrl ? (
                                                <Image
                                                    src={option.avatarUrl}
                                                    alt={option.label}
                                                    width={28}
                                                    height={28}
                                                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                                                />
                                            ) : null}

                                            {!option.avatarUrl && option.initials ? (
                                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700">
                                                    {option.initials}
                                                </span>
                                            ) : null}

                                            <span className="truncate">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
}

export function GroupListScreen() {
    const locale = useLocale();
    const t = useTranslations("GroupTaskListPage");
    const allAssigneesLabel = t("allAssignees");
    const selectAssigneeLabel = t("selectAssignee");

    const params = useParams<{ groupId: string }>();
    const groupId = params?.groupId ? String(params.groupId) : "";
    const pageSize = 10;

    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [rows, setRows] = React.useState<TaskRow[]>([]);
    const [statusOptions, setStatusOptions] = React.useState<Array<{ id: string; name: string }>>([]);
    const [assigneeOptions, setAssigneeOptions] = React.useState<DropdownOption[]>([]);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalCount, setTotalCount] = React.useState(0);

    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null);

    const [searchInput, setSearchInput] = React.useState("");
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [assigneeFilter, setAssigneeFilter] = React.useState("all");
    const [severityFilter, setSeverityFilter] = React.useState("all");
    const [priorityFilter, setPriorityFilter] = React.useState("all");
    const [overdueOnly, setOverdueOnly] = React.useState(false);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [draftDateFilter, setDraftDateFilter] = React.useState<DateFilterValues>({
        startDate: "",
        dueDate: ""
    });
    const [appliedDateFilter, setAppliedDateFilter] = React.useState<DateFilterValues>({
        startDate: "",
        dueDate: ""
    });

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearchKeyword(searchInput.trim());
        }, 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const refresh = React.useCallback(async () => {
        if (!groupId) {
            setLoading(false);
            setLoadError(t("missingGroupId"));
            return;
        }
        if (!isUuidLike(groupId)) {
            setLoading(false);
            setLoadError(t("invalidGroupId"));
            return;
        }
        if (!getApiBase()) {
            setLoading(false);
            setLoadError(t("missingApiBase"));
            return;
        }

        setLoading(true);
        setLoadError(null);

        try {
            const res = await apiGetGroupTasks({
                groupId,
                search: searchKeyword || undefined,
                statusId: statusFilter !== "all" ? statusFilter : undefined,
                startDateFrom: appliedDateFilter.startDate || undefined,
                startDateTo: appliedDateFilter.startDate || undefined,
                dueDateFrom: appliedDateFilter.dueDate || undefined,
                dueDateTo: appliedDateFilter.dueDate || undefined,
                sortBy: "dueDate",
                sortAscending: false,
                page,
                pageSize,
                fallbackMessage: t("cannotLoad"),
                missingApiBaseMessage: t("missingApiBase")
            });

            const data = res?.data;
            const nextStatuses = (data?.groupStatuses ?? [])
                .map((s) => ({
                    id: String(s?.statusId ?? "").trim(),
                    name: String(s?.statusName ?? "").trim()
                }))
                .filter((s) => s.id && s.name);

            const nextRows = (data?.items ?? []).map((item, index) => {
                const id = String(item.taskId ?? "").trim() || `task_${index}`;
                const title = String(item.taskTitle ?? "").trim() || t("untitledTask");
                const statusId = String(item.statusId ?? "").trim();
                const statusName = String(item.statusName ?? "").trim() || "-";
                const primaryAssignee = item.assignees?.[0] ?? null;
                const assignee = buildAssignee(primaryAssignee, t("unassigned"));
                const assigneeId = String(primaryAssignee?.id ?? "").trim() || "__unassigned__";

                return {
                    id,
                    title,
                    statusId,
                    assigneeId,
                    assigneeName: assignee.name,
                    assigneeAvatarUrl: assignee.avatarUrl,
                    assigneeInitials: assignee.initials,
                    severityLabel: severityLabelOf(item.taskSeverity, t),
                    severityClass: severityClassOf(item.taskSeverity),
                    taskSeverity: item.taskSeverity ?? 0,
                    priorityLabel: priorityLabelOf(item.taskPriority, t),
                    priorityClass: priorityClassOf(item.taskPriority),
                    taskPriority: item.taskPriority ?? 0,
                    statusName,
                    startLabel: formatShortDate(item.startDate ?? null, locale),
                    dueLabel: formatShortDate(item.dueDate ?? null, locale),
                    dueDate: item.dueDate ?? null,
                    progress: item.progress ?? 0
                } satisfies TaskRow;
            });

            const nextAssignees = nextRows.map((row) => ({
                value: row.assigneeId,
                label: row.assigneeName,
                avatarUrl: row.assigneeAvatarUrl,
                initials: row.assigneeInitials
            }));

            setStatusOptions((prev) => mergeStatusOptions(prev, nextStatuses));
            setAssigneeOptions((prev) => mergeDropdownOptions(prev, nextAssignees));
            setRows(nextRows);
            setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
            setTotalCount(Math.max(0, Number(data?.totalCount ?? 0)));
        } catch (e: unknown) {
            setLoadError(e instanceof Error ? e.message : t("cannotLoad"));
        } finally {
            setLoading(false);
        }
    }, [appliedDateFilter, groupId, locale, page, searchKeyword, statusFilter, t]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    const filteredRows = React.useMemo(() => {
        return rows.filter((row) => {
            if (assigneeFilter !== "all" && row.assigneeId !== assigneeFilter) return false;
            if (statusFilter !== "all" && row.statusId !== statusFilter) return false;
            if (severityFilter !== "all" && row.taskSeverity !== Number(severityFilter)) return false;
            if (priorityFilter !== "all" && row.taskPriority !== Number(priorityFilter)) return false;
            if (overdueOnly && !isOverdueTask(row.dueDate, row.progress)) return false;
            return true;
        });
    }, [rows, assigneeFilter, statusFilter, severityFilter, priorityFilter, overdueOnly]);

    const showPagination = !loading && loadError === null;

    const appliedDateFilterLabel = [
        appliedDateFilter.startDate
            ? `${t("startDate")}: ${formatFilterDate(appliedDateFilter.startDate, locale)}`
            : "",
        appliedDateFilter.dueDate ? `${t("dueDate")}: ${formatFilterDate(appliedDateFilter.dueDate, locale)}` : ""
    ]
        .filter(Boolean)
        .join(" • ");

    const activeFilterCount =
        Number(assigneeFilter !== "all") +
        Number(statusFilter !== "all") +
        Number(severityFilter !== "all") +
        Number(priorityFilter !== "all") +
        Number(overdueOnly) +
        Number(Boolean(appliedDateFilter.startDate || appliedDateFilter.dueDate)) +
        Number(Boolean(searchKeyword));

    const openTaskDetail = (taskId: string) => {
        setDetailTaskId(taskId);
        setDetailOpen(true);
    };

    const closeTaskDetail = () => {
        setDetailOpen(false);
        setDetailTaskId(null);
    };

    const clearAllFilters = () => {
        setSearchInput("");
        setSearchKeyword("");
        setStatusFilter("all");
        setAssigneeFilter("all");
        setSeverityFilter("all");
        setPriorityFilter("all");
        setOverdueOnly(false);
        setDraftDateFilter({ startDate: "", dueDate: "" });
        setAppliedDateFilter({ startDate: "", dueDate: "" });
        setPage(1);
    };

    return (
        <div className="pb-8">
            <TaskDetailModal open={detailOpen} onClose={closeTaskDetail} taskId={detailTaskId} onSaved={refresh} />

            <Container className="bg-transparent">
                <section className="mt-6 space-y-5">
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-white via-white to-orange-50/40 p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
                        <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-orange-200/20 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-28 w-28 rounded-full bg-amber-200/20 blur-3xl" />

                        <div className="relative space-y-3">
                            <div className="flex justify-end">
                                {activeFilterCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={clearAllFilters}
                                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
                                        {t("clearFilter")}
                                    </button>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                                <label className="group relative min-w-0">
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-orange-500" />
                                    <input
                                        value={searchInput}
                                        onChange={(e) => {
                                            setSearchInput(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder={t("searchPlaceholder")}
                                        className="h-12 w-full rounded-2xl border border-zinc-200/80 bg-white/90 py-0 pr-4 pl-10 text-sm text-zinc-800 outline-none shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-200 placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]"
                                    />
                                </label>

                                <FancyDropdown
                                    value={assigneeFilter}
                                    options={[{ value: "all", label: allAssigneesLabel }, ...assigneeOptions]}
                                    onChange={(nextValue) => {
                                        setAssigneeFilter(nextValue);
                                        setPage(1);
                                    }}
                                    ariaLabel={selectAssigneeLabel}
                                    emptyValue="all"
                                    emptyLabel={selectAssigneeLabel}
                                />

                                <FancyDropdown
                                    value={statusFilter}
                                    options={[
                                        { value: "all", label: t("allStatus") },
                                        ...statusOptions.map((s) => ({ value: s.id, label: s.name }))
                                    ]}
                                    onChange={(nextValue) => {
                                        setStatusFilter(nextValue);
                                        setPage(1);
                                    }}
                                    ariaLabel={t("selectStatusPlaceholder")}
                                    emptyValue="all"
                                    emptyLabel={t("selectStatusPlaceholder")}
                                />

                                <FancyDropdown
                                    value={severityFilter}
                                    options={[
                                        { value: "all", label: t("allSeverities") },
                                        { value: "0", label: t("minor") },
                                        { value: "1", label: t("moderate") },
                                        { value: "2", label: t("major") },
                                        { value: "3", label: t("critical") }
                                    ]}
                                    onChange={(nextValue) => {
                                        setSeverityFilter(nextValue);
                                        setPage(1);
                                    }}
                                    ariaLabel={t("selectSeverity")}
                                    emptyValue="all"
                                    emptyLabel={t("selectSeverity")}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <FancyDropdown
                                    value={priorityFilter}
                                    options={[
                                        { value: "all", label: t("allPriorities") },
                                        { value: "0", label: t("low") },
                                        { value: "1", label: t("medium") },
                                        { value: "2", label: t("high") }
                                    ]}
                                    onChange={(nextValue) => {
                                        setPriorityFilter(nextValue);
                                        setPage(1);
                                    }}
                                    ariaLabel={t("selectPriority")}
                                    emptyValue="all"
                                    emptyLabel={t("selectPriority")}
                                />

                                <FilterChip
                                    active={overdueOnly}
                                    onClick={() => {
                                        setOverdueOnly((v) => !v);
                                        setPage(1);
                                    }}
                                    label={t("overdueTasks")}
                                    icon={<AlertTriangle className="h-4 w-4" />}
                                />

                                <FilterChip
                                    active={Boolean(appliedDateFilterLabel)}
                                    onClick={() => setFilterOpen(true)}
                                    label={appliedDateFilterLabel || t("dateFilterButton")}
                                    icon={<CalendarDays className="h-4 w-4" />}
                                />
                            </div>
                        </div>
                    </motion.div>

                    <div className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                        <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-orange-50/30 px-5 py-4">
                            <div className="grid grid-cols-7 gap-4 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <div>{t("taskName")}</div>
                                <div>{t("assignee")}</div>
                                <div>{t("severity")}</div>
                                <div>{t("priority")}</div>
                                <div>{t("status")}</div>
                                <div>{t("startDate")}</div>
                                <div>{t("dueDate")}</div>
                            </div>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <TableSkeleton />
                            ) : loadError ? (
                                <div className="rounded-[24px] border border-rose-200 bg-rose-50/80 px-6 py-10 text-center">
                                    <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
                                    <p className="mt-3 text-sm text-rose-700">{loadError}</p>
                                    <button
                                        type="button"
                                        onClick={() => void refresh()}
                                        className="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-xs text-rose-700 hover:bg-rose-50">
                                        {t("reload")}
                                    </button>
                                </div>
                            ) : filteredRows.length === 0 ? (
                                <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-14 text-center">
                                    <ListTodo className="mx-auto h-9 w-9 text-zinc-400" />
                                    <p className="mt-4 font-medium text-zinc-600">{t("noData")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredRows.map((row, index) => (
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22, delay: index * 0.02 }}
                                            key={row.id}
                                            type="button"
                                            onClick={() => openTaskDetail(row.id)}
                                            className="grid w-full grid-cols-7 gap-4 rounded-[24px] border border-zinc-200/80 bg-gradient-to-r from-white via-zinc-50/40 to-orange-50/20 px-5 py-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-zinc-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                                            <div className="flex items-center justify-center">
                                                <p className="line-clamp-2 font-semibold text-[15px] text-zinc-900">
                                                    {row.title}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <div className="flex items-center gap-2">
                                                    {row.assigneeAvatarUrl ? (
                                                        <Image
                                                            src={row.assigneeAvatarUrl}
                                                            alt={row.assigneeName}
                                                            width={32}
                                                            height={32}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-200 font-bold text-[11px] text-zinc-700">
                                                            {row.assigneeInitials}
                                                        </span>
                                                    )}
                                                    <span className="font-medium text-sm text-zinc-800">
                                                        {row.assigneeName}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <span
                                                    className={cn(
                                                        "inline-flex min-h-11 items-center justify-center rounded-full border px-4 font-semibold text-sm shadow-sm",
                                                        row.severityClass === "text-red-600" &&
                                                        "border-red-200 bg-red-50 text-red-600",
                                                        row.severityClass === "text-orange-600" &&
                                                        "border-orange-200 bg-orange-50 text-orange-600",
                                                        row.severityClass === "text-amber-600" &&
                                                        "border-amber-200 bg-amber-50 text-amber-600",
                                                        row.severityClass === "text-sky-600" &&
                                                        "border-sky-200 bg-sky-50 text-sky-600"
                                                    )}>
                                                    {row.severityLabel}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <span
                                                    className={cn(
                                                        "inline-flex min-h-11 items-center justify-center rounded-full border px-4 font-semibold text-sm shadow-sm",
                                                        row.priorityClass === "text-rose-600" &&
                                                        "border-rose-200 bg-rose-50 text-rose-600",
                                                        row.priorityClass === "text-amber-700" &&
                                                        "border-amber-200 bg-amber-50 text-amber-700",
                                                        row.priorityClass === "text-emerald-700" &&
                                                        "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    )}>
                                                    {row.priorityLabel}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 shadow-sm">
                                                    {row.statusName}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-center font-medium text-sm text-slate-600">
                                                {row.startLabel}
                                            </div>

                                            <div className="flex items-center justify-center font-medium text-sm text-slate-600">
                                                {row.dueLabel}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {showPagination ? (
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
                                <ChevronLeft className="h-4 w-4" />
                                {t("previous")}
                            </button>

                            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-center font-medium text-sm text-zinc-700 shadow-sm">
                                {t("pageInfo", { page, totalPages, totalCount })}
                            </div>

                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
                                {t("next")}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    ) : null}
                </section>
            </Container>

            <DateFilterModal
                open={filterOpen}
                values={draftDateFilter}
                t={t}
                onChange={(patch) => setDraftDateFilter((prev) => ({ ...prev, ...patch }))}
                onClose={() => setFilterOpen(false)}
                onClear={() => {
                    const emptyFilter = {
                        startDate: "",
                        dueDate: ""
                    };
                    setDraftDateFilter(emptyFilter);
                    setAppliedDateFilter(emptyFilter);
                    setPage(1);
                    setFilterOpen(false);
                }}
                onSubmit={() => {
                    setAppliedDateFilter(draftDateFilter);
                    setPage(1);
                    setFilterOpen(false);
                }}
            />
        </div>
    );
}

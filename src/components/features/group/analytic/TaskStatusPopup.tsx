"use client";

import { Search, X, ChevronLeft, ChevronRight, ListTodo } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { createPortal } from "react-dom";
import { env } from "@/env";
import type { components } from "@/api/types";
import AssigneeAvatar from "@/components/features/group/task/AssigneeAvatar";

// ==================== Types ====================

type GroupTaskListResponse = components["schemas"]["GroupTaskListResponse"];
type GroupTaskItemResponse = components["schemas"]["GroupTaskItemResponse"];
type UserDto = components["schemas"]["UserDto"];
type TaskPriority = components["schemas"]["TaskPriority"];
type TaskSeverity = components["schemas"]["TaskSeverity"];

type StatusFilterType = "notstarted" | "inprogress" | "completed" | "overdue";

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

type DropdownOption = {
    value: string;
    label: string;
    avatarUrl?: string | null;
    initials?: string;
    unassigned?: boolean;
    textClassName?: string;
};

// ==================== Helpers ====================

function getApiBase() {
    if (typeof window === "undefined") return "";
    return String(env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
}

function apiUrl(path: string) {
    const base = getApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!base) return cleanPath;
    if (base.endsWith("/api")) return `${base}${cleanPath}`;
    return `${base}/api${cleanPath}`;
}

function getAccessTokenOrNull(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem("accessToken");
    } catch {
        return null;
    }
}

function parseMaybeJson(raw: string): { json: unknown; ok: boolean } {
    try {
        const parsed = JSON.parse(raw);
        return { json: parsed, ok: true };
    } catch {
        return { json: null, ok: false };
    }
}

function okByJsonStatus(json: unknown): boolean {
    if (typeof json !== "object" || json === null) return false;
    const obj = json as Record<string, unknown>;
    return obj["status"] === "success" || obj["status"] === "ok" || obj["code"] === "0";
}

function extractApiMessage(raw: string, json: unknown, fallback: string): string {
    if (typeof json === "object" && json !== null) {
        const obj = json as Record<string, unknown>;
        if (typeof obj["message"] === "string") return obj["message"];
        if (typeof obj["msg"] === "string") return obj["msg"];
    }
    if (typeof raw === "string" && raw.length < 200) return raw;
    return fallback;
}

async function apiGetGroupTasks(args: {
    groupId: string;
    search?: string;
    statusId?: string;
    assigneeId?: string;
    priority?: number;
    severity?: number;
    startDateFrom?: string;
    startDateTo?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    statusCategory?: string;
    hasNoAssignee?: boolean;
    hasNoDueDate?: boolean;
    overdue?: boolean;
    sortBy?: string;
    sortAscending?: boolean;
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
    fallbackMessage: string;
    missingApiBaseMessage: string;
}) {
    const base = getApiBase();
    const token = getAccessTokenOrNull();
    if (!base) throw new Error(args.missingApiBaseMessage);

    const query = new URLSearchParams();
    if (args.search) query.set("search", args.search);
    if (args.statusId) query.set("statusId", args.statusId);
    if (args.assigneeId) query.set("assigneeId", args.assigneeId);
    if (args.priority !== undefined) query.set("priority", String(args.priority));
    if (args.severity !== undefined) query.set("severity", String(args.severity));
    if (args.startDateFrom) query.set("startDateFrom", args.startDateFrom);
    if (args.startDateTo) query.set("startDateTo", args.startDateTo);
    if (args.dueDateFrom) query.set("dueDateFrom", args.dueDateFrom);
    if (args.dueDateTo) query.set("dueDateTo", args.dueDateTo);
    if (args.statusCategory) query.set("statusCategory", args.statusCategory);
    if (args.hasNoAssignee !== undefined) query.set("hasNoAssignee", String(args.hasNoAssignee));
    if (args.hasNoDueDate !== undefined) query.set("hasNoDueDate", String(args.hasNoDueDate));
    if (args.overdue !== undefined) query.set("overdue", String(args.overdue));
    if (args.sortBy) query.set("sortBy", args.sortBy);
    query.set("sortAscending", String(Boolean(args.sortAscending)));
    query.set("page", String(args.page ?? 1));
    query.set("pageSize", String(args.pageSize ?? 10));

    const suffix = query.toString();
    const path = `/group/${encodeURIComponent(args.groupId)}/tasks${suffix ? `?${suffix}` : ""}`;
    const url = apiUrl(path);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: args.signal,
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const raw = await res.text();
    const { json } = parseMaybeJson(raw);
    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json, args.fallbackMessage));
    }

    return (json ?? null) as { status?: string; code?: string; message?: string; data?: GroupTaskListResponse } | null;
}

// ==================== Label Helpers ====================

function severityClassOf(v?: TaskSeverity) {
    const severity = Number(v);
    if (severity === 3) return "text-red-600";
    if (severity === 2) return "text-orange-600";
    if (severity === 1) return "text-sky-600";
    return "text-emerald-600";
}

function severityLabelOf(v: TaskSeverity | undefined, t: (key: string) => string) {
    if (v === 3) return t("critical");
    if (v === 2) return t("major");
    if (v === 1) return t("moderate");
    return t("minor");
}

function priorityClassOf(v?: TaskPriority) {
    const priority = Number(v);
    if (priority === 2) return "text-rose-600";
    if (priority === 1) return "text-amber-700";
    return "text-emerald-700";
}

function priorityLabelOf(v: TaskPriority | undefined, t: (key: string) => string) {
    if (v === 2) return t("high");
    if (v === 1) return t("medium");
    return t("low");
}

function formatShortDate(dateStr: string | null, locale: string) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const localeCode = locale === "vi" ? "vi-VN" : "en-US";
    return date.toLocaleDateString(localeCode, { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

// ==================== Component ====================

type TaskStatusPopupProps = {
    open: boolean;
    onClose: () => void;
    filter: StatusFilterType;
    isPersonal: boolean;
    groupId: string;
    currentUserId: string;
};

function isOverdue(dueDate: string | null | undefined, progress?: number | null) {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const notDone = (progress ?? 100) < 100;
    return due < today && notDone;
}

function buildInitials(name: string) {
    const s = String(name).trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${first}${last}`.toUpperCase() || "U";
}

function buildAssignee(
    user: UserDto | null | undefined,
    unassignedLabel: string
): { name: string; avatarUrl: string | null; initials: string } {
    if (!user) return { name: unassignedLabel, avatarUrl: null, initials: "?" };
    const fullName = `${String(user.firstName ?? "").trim()} ${String(user.lastName ?? "").trim()}`.trim();
    const assigneeName = fullName || unassignedLabel;
    return {
        name: assigneeName,
        avatarUrl: String(user.avatarUrl ?? "").trim() || null,
        initials: buildInitials(assigneeName)
    };
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-7 gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-5 animate-pulse">
                    <div className="col-span-2 h-4 rounded bg-zinc-200" />
                    <div className="h-4 rounded bg-zinc-200" />
                    <div className="h-4 rounded bg-zinc-200" />
                    <div className="h-4 rounded bg-zinc-200" />
                    <div className="h-4 rounded bg-zinc-200" />
                    <div className="h-4 rounded bg-zinc-200" />
                </div>
            ))}
        </div>
    );
}

export default function TaskStatusPopup({
    open,
    onClose,
    filter,
    isPersonal,
    groupId,
    currentUserId
}: TaskStatusPopupProps) {
    const locale = useLocale();
    const t = useTranslations("GroupTaskListPage");

    const [mounted, setMounted] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [rows, setRows] = React.useState<TaskRow[]>([]);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalCount, setTotalCount] = React.useState(0);
    const [assigneeOptions, setAssigneeOptions] = React.useState<DropdownOption[]>([]);
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const previouslyFocusedElementRef = React.useRef<HTMLElement | null>(null);
    const titleId = React.useId();

    // Filter states
    const [searchInput, setSearchInput] = React.useState("");
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [assigneeFilter, setAssigneeFilter] = React.useState("all");
    const [severityFilter, setSeverityFilter] = React.useState("all");
    const [priorityFilter, setPriorityFilter] = React.useState("all");
    const [sortBy, setSortBy] = React.useState("taskTitle");
    const [sortAscending, setSortAscending] = React.useState(true);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    React.useEffect(() => {
        if (!open) return;

        previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const frameId = window.requestAnimationFrame(() => {
            const container = dialogRef.current;
            if (!container) return;

            const focusableSelectors = [
                "button:not([disabled])",
                "[href]",
                "input:not([disabled])",
                "select:not([disabled])",
                "textarea:not([disabled])",
                "[tabindex]:not([tabindex='-1'])"
            ].join(",");

            const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
                (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
            );

            (focusableElements[0] ?? container).focus();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            previouslyFocusedElementRef.current?.focus?.();
        };
    }, [open]);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    // Reset when popup opens with new filter
    React.useEffect(() => {
        if (open) {
            setPage(1);
            setSearchInput("");
            setSearchKeyword("");
            setAssigneeFilter(isPersonal ? currentUserId : "all");
            setSeverityFilter("all");
            setPriorityFilter("all");
        }
    }, [open, filter, isPersonal, currentUserId]);

    const refresh = React.useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setLoadError(null);

        try {
            // Build API params based on filter type
            const statusCategory = filter === "notstarted" ? "notstarted" : filter === "inprogress" ? "inprogress" : filter === "completed" ? "completed" : undefined;
            const overdue = filter === "overdue" ? true : undefined;

            const response = await apiGetGroupTasks({
                groupId,
                search: searchKeyword || undefined,
                assigneeId: isPersonal ? currentUserId : assigneeFilter !== "all" ? assigneeFilter : undefined,
                priority: priorityFilter !== "all" ? Number(priorityFilter) : undefined,
                severity: severityFilter !== "all" ? Number(severityFilter) : undefined,
                statusCategory,
                overdue,
                sortBy,
                sortAscending,
                page,
                pageSize: 10,
                signal,
                fallbackMessage: t("cannotLoad"),
                missingApiBaseMessage: t("cannotLoad")
            });

            const data = response?.data;
            const items = data?.items ?? [];

            const nextRows: TaskRow[] = items.map((item: GroupTaskItemResponse) => {
                const id = item.taskId ?? "";
                const title = item.taskTitle ?? "(No title)";
                const statusId = item.statusId ?? "";
                const statusName = item.statusName ?? "-";

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

            // Build assignee options from data
            const assigneeMap = new Map<string, DropdownOption>();
            items.forEach((item: GroupTaskItemResponse) => {
                const primaryAssignee = item.assignees?.[0] ?? null;
                const assigneeId = String(primaryAssignee?.id ?? "").trim() || "__unassigned__";
                if (!assigneeMap.has(assigneeId) && primaryAssignee) {
                    const assignee = buildAssignee(primaryAssignee, t("unassigned"));
                    assigneeMap.set(assigneeId, {
                        value: assigneeId,
                        label: assignee.name,
                        avatarUrl: assignee.avatarUrl,
                        initials: assignee.initials,
                        unassigned: assigneeId === "__unassigned__"
                    });
                }
            });
            setAssigneeOptions([...assigneeMap.values()]);

            setRows(nextRows);
            setTotalCount(Number(data?.totalCount ?? 0));
            setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
        } catch (e: unknown) {
            if (e instanceof DOMException && e.name === "AbortError") {
                return;
            }
            setLoadError(e instanceof Error ? e.message : t("cannotLoad"));
        } finally {
            setLoading(false);
        }
    }, [groupId, filter, isPersonal, currentUserId, searchKeyword, assigneeFilter, severityFilter, priorityFilter, sortBy, sortAscending, page, locale, t]);

    React.useEffect(() => {
        if (open) {
            const controller = new AbortController();
            void refresh(controller.signal);
            return () => controller.abort();
        }
    }, [open, refresh]);

    React.useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    // Filter title
    const filterTitles: Record<StatusFilterType, string> = {
        notstarted: t("taskStatus.todo"),
        inprogress: t("taskStatus.inProgress"),
        completed: t("taskStatus.done"),
        overdue: t("taskStatus.overdue")
    };

    const title = filterTitles[filter] ?? "";
    const showPagination = !loading && loadError === null;

    const paginationItems: Array<number | "..."> = React.useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const items: Array<number | "..."> = [1];
        if (page > 3) items.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            items.push(i);
        }
        if (page < totalPages - 2) items.push("...");
        items.push(totalPages);
        return items;
    }, [page, totalPages]);

    if (!mounted) return null;

    return createPortal((
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
                    onClick={onClose}>
                    <motion.div
                        ref={dialogRef}
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.96 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        onKeyDown={(event) => {
                            if (event.key !== "Tab") return;

                            const container = dialogRef.current;
                            if (!container) return;

                            const focusableSelectors = [
                                "button:not([disabled])",
                                "[href]",
                                "input:not([disabled])",
                                "select:not([disabled])",
                                "textarea:not([disabled])",
                                "[tabindex]:not([tabindex='-1'])"
                            ].join(",");

                            const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
                                (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
                            );

                            if (focusableElements.length === 0) {
                                event.preventDefault();
                                container.focus();
                                return;
                            }

                            const first = focusableElements[0];
                            const last = focusableElements[focusableElements.length - 1];
                            const activeElement = document.activeElement;

                            if (event.shiftKey && activeElement === first) {
                                event.preventDefault();
                                last.focus();
                            } else if (!event.shiftKey && activeElement === last) {
                                event.preventDefault();
                                first.focus();
                            }
                        }}
                        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.28)]">
                        {/* Header */}
                        <div className="flex items-center justify-between border-slate-100 border-b bg-linear-to-r from-slate-50 to-orange-50/40 px-5 py-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                                    <ListTodo className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <h3 id={titleId} className="font-semibold text-slate-900">{title}</h3>
                                    <div className="text-xs text-slate-500">
                                        {totalCount > 0 ? `${totalCount} ${t("tasks")}` : t("noData")}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-3">
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                                {/* Search */}
                                <label className="group relative min-w-0">
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-orange-500" />
                                    <input
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                setSearchKeyword(searchInput.trim());
                                                setPage(1);
                                            }
                                        }}
                                        placeholder={t("searchPlaceholder")}
                                        className="h-11 w-full rounded-2xl border border-zinc-200/80 bg-white/90 py-0 pr-4 pl-10 text-sm text-zinc-800 outline-none shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-200 placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]"
                                    />
                                </label>

                                {/* Assignee — hidden for personal popup */}
                                {!isPersonal ? (
                                    <select
                                        value={assigneeFilter}
                                        onChange={(e) => {
                                            setAssigneeFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-11 rounded-2xl border border-zinc-200/80 bg-white/90 px-3 text-sm text-zinc-800 outline-none shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-200 focus:border-orange-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]">
                                        <option value="all">{t("allAssignees")}</option>
                                        {assigneeOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div />
                                )}

                                {/* Severity */}
                                <select
                                    value={severityFilter}
                                    onChange={(e) => {
                                        setSeverityFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-11 rounded-2xl border border-zinc-200/80 bg-white/90 px-3 text-sm text-zinc-800 outline-none shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-200 focus:border-orange-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]">
                                    <option value="all">{t("allSeverities")}</option>
                                    <option value="0">{t("minor")}</option>
                                    <option value="1">{t("moderate")}</option>
                                    <option value="2">{t("major")}</option>
                                    <option value="3">{t("critical")}</option>
                                </select>

                                {/* Priority */}
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => {
                                        setPriorityFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-11 rounded-2xl border border-zinc-200/80 bg-white/90 px-3 text-sm text-zinc-800 outline-none shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-200 focus:border-orange-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(251,146,60,0.12)]">
                                    <option value="all">{t("allPriorities")}</option>
                                    <option value="0">{t("low")}</option>
                                    <option value="1">{t("medium")}</option>
                                    <option value="2">{t("high")}</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="border-b border-zinc-200 bg-linear-to-r from-zinc-50 to-orange-50/30 px-5 py-3 shrink-0">
                                <div className="grid grid-cols-8 gap-4 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    <div>{t("taskName")}</div>
                                    <div>{t("assignee")}</div>
                                    <div>{t("severity")}</div>
                                    <div>{t("priority")}</div>
                                    <div>{t("progress")}</div>
                                    <div>{t("status")}</div>
                                    <div>{t("startDate")}</div>
                                    <div>{t("dueDate")}</div>
                                </div>
                            </div>

                            <div className="p-4">
                                {loading ? (
                                    <TableSkeleton />
                                ) : loadError ? (
                                    <div className="rounded-3xl border border-rose-200 bg-rose-50/80 px-6 py-10 text-center">
                                        <p className="mt-3 text-sm text-rose-700">{loadError}</p>
                                        <button
                                            type="button"
                                            onClick={() => void refresh()}
                                            className="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-xs text-rose-700 hover:bg-rose-50">
                                            {t("reload")}
                                        </button>
                                    </div>
                                ) : rows.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-14 text-center">
                                        <ListTodo className="mx-auto h-9 w-9 text-zinc-400" />
                                        <p className="mt-4 font-medium text-zinc-600">{t("noData")}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {rows.map((row, index) => {
                                            const overdue = isOverdue(row.dueDate, row.progress);
                                            const completed = row.progress >= 100;
                                            const dueDisplayLabel = completed
                                                ? (row.dueLabel !== "-" ? row.dueLabel : t("progressDone"))
                                                : row.dueLabel;

                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.22, delay: index * 0.02 }}
                                                    key={row.id}
                                                    className="grid w-full grid-cols-8 gap-4 rounded-3xl border border-zinc-200/80 bg-linear-to-r from-white via-zinc-50/40 to-orange-50/20 px-5 py-5 text-center shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                                                    {/* Title */}
                                                    <div className="flex items-center justify-center">
                                                        <p className="line-clamp-2 font-semibold text-[15px] text-zinc-900">
                                                            {row.title}
                                                        </p>
                                                    </div>

                                                    {/* Assignee */}
                                                    <div className="flex items-center justify-center">
                                                        <div className="flex items-center gap-2">
                                                            {row.assigneeId === "__unassigned__" ? (
                                                                <span className="font-medium text-sm text-zinc-500">
                                                                    {row.assigneeName}
                                                                </span>
                                                            ) : (
                                                                <AssigneeAvatar
                                                                    avatarUrl={row.assigneeAvatarUrl}
                                                                    name={row.assigneeName}
                                                                    initials={row.assigneeInitials}
                                                                    size={32}
                                                                    className="text-[11px]"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Severity */}
                                                    <div className="flex items-center justify-center">
                                                        <span
                                                            className={cn(
                                                                "inline-flex min-h-11 w-full max-w-25 items-center justify-center rounded-full border px-3 font-semibold text-sm shadow-sm",
                                                                row.severityClass === "text-red-600" && "border-red-200 bg-red-50 text-red-600",
                                                                row.severityClass === "text-orange-600" && "border-orange-200 bg-orange-50 text-orange-600",
                                                                row.severityClass === "text-sky-600" && "border-sky-200 bg-sky-50 text-sky-600",
                                                                row.severityClass === "text-emerald-600" && "border-emerald-200 bg-emerald-50 text-emerald-600"
                                                            )}>
                                                            {row.severityLabel}
                                                        </span>
                                                    </div>

                                                    {/* Priority */}
                                                    <div className="flex items-center justify-center">
                                                        <span
                                                            className={cn(
                                                                "inline-flex min-h-11 w-full max-w-25 items-center justify-center rounded-full border px-3 font-semibold text-sm shadow-sm",
                                                                row.priorityClass === "text-rose-600" && "border-rose-200 bg-rose-50 text-rose-600",
                                                                row.priorityClass === "text-amber-700" && "border-amber-200 bg-amber-50 text-amber-700",
                                                                row.priorityClass === "text-emerald-700" && "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                            )}>
                                                            {row.priorityLabel}
                                                        </span>
                                                    </div>

                                                    {/* Progress */}
                                                    <div className="flex items-center justify-center">
                                                        <div className="w-full max-w-20">
                                                            <div className="mb-1 text-center font-semibold text-sm text-zinc-700">{row.progress}%</div>
                                                            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                                                <div
                                                                    className={cn(
                                                                        "h-full rounded-full transition-all",
                                                                        completed ? "bg-emerald-500" : overdue ? "bg-rose-500" : "bg-orange-500"
                                                                    )}
                                                                    style={{ width: `${row.progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Status */}
                                                    <div className="flex items-center justify-center">
                                                        <span className="inline-flex min-h-11 w-full max-w-30 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 font-medium text-sm text-zinc-700 shadow-sm">
                                                            {row.statusName}
                                                        </span>
                                                    </div>

                                                    {/* Start date */}
                                                    <div className="flex items-center justify-center font-medium text-sm text-slate-600">
                                                        {row.startLabel}
                                                    </div>

                                                    {/* Due date */}
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-center font-medium text-sm",
                                                            completed ? "text-emerald-700" : overdue ? "text-rose-700" : "text-slate-600"
                                                        )}>
                                                        {dueDisplayLabel}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pagination */}
                        {showPagination && totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 shrink-0">
                                <div className="text-sm text-zinc-500">
                                    {t("pageInfo", { page, totalPages })}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-orange-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    {paginationItems.map((item, index) =>
                                        item === "..." ? (
                                            <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-zinc-400">…</span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setPage(item)}
                                                className={cn(
                                                    "flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                                                    item === page
                                                        ? "border-orange-300 bg-orange-50 text-orange-600 shadow-md"
                                                        : "border-zinc-200 bg-white text-zinc-600 hover:border-orange-200 hover:shadow-md"
                                                )}>
                                                {item}
                                            </button>
                                        )
                                    )}
                                    <button
                                        type="button"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-orange-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    ), document.body);
}

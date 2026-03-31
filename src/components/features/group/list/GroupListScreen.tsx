"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Filter, Search, AlertTriangle, ListTodo } from "lucide-react";
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
    assigneeName: string;
    assigneeAvatarUrl: string | null;
    assigneeInitials: string;
    severityLabel: string;
    severityClass: string;
    priorityLabel: string;
    priorityClass: string;
    statusName: string;
    startLabel: string;
    dueLabel: string;
};

type DateFilterValues = {
    startDateFrom: string;
    startDateTo: string;
    dueDateFrom: string;
    dueDateTo: string;
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
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
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

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-zinc-200/80 bg-white/70" />
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
        <div
            className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}>
            <div
                className="w-full max-w-xl rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-zinc-900">{t("dateFilterTitle")}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                        {t("cancel")}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                        <span className="font-medium text-sm text-zinc-600">{t("startFrom")}</span>
                        <input
                            type="date"
                            value={values.startDateFrom}
                            onChange={(e) => onChange({ startDateFrom: normalizeDateInput(e.target.value) })}
                            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-300"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="font-medium text-sm text-zinc-600">{t("startTo")}</span>
                        <input
                            type="date"
                            value={values.startDateTo}
                            onChange={(e) => onChange({ startDateTo: normalizeDateInput(e.target.value) })}
                            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-300"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="font-medium text-sm text-zinc-600">{t("dueFrom")}</span>
                        <input
                            type="date"
                            value={values.dueDateFrom}
                            onChange={(e) => onChange({ dueDateFrom: normalizeDateInput(e.target.value) })}
                            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-300"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="font-medium text-sm text-zinc-600">{t("dueTo")}</span>
                        <input
                            type="date"
                            value={values.dueDateTo}
                            onChange={(e) => onChange({ dueDateTo: normalizeDateInput(e.target.value) })}
                            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-300"
                        />
                    </label>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClear}
                        className="h-10 rounded-xl border border-zinc-200 bg-white px-4 font-semibold text-sm text-zinc-700 hover:bg-zinc-50">
                        {t("clearFilter")}
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        className="h-10 rounded-xl bg-zinc-900 px-4 font-semibold text-sm text-white hover:bg-zinc-800">
                        {t("applyFilter")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function GroupListScreen() {
    const locale = useLocale();
    const t = useTranslations("GroupTaskListPage");

    const params = useParams<{ groupId: string }>();
    const groupId = params?.groupId ? String(params.groupId) : "";
    const pageSize = 10;

    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [rows, setRows] = React.useState<TaskRow[]>([]);
    const [statusOptions, setStatusOptions] = React.useState<Array<{ id: string; name: string }>>([]);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalCount, setTotalCount] = React.useState(0);

    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null);

    const [searchInput, setSearchInput] = React.useState("");
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [sortByDeadline, setSortByDeadline] = React.useState<"asc" | "desc">("desc");
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [draftDateFilter, setDraftDateFilter] = React.useState<DateFilterValues>({
        startDateFrom: "",
        startDateTo: "",
        dueDateFrom: "",
        dueDateTo: ""
    });
    const [appliedDateFilter, setAppliedDateFilter] = React.useState<DateFilterValues>({
        startDateFrom: "",
        startDateTo: "",
        dueDateFrom: "",
        dueDateTo: ""
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
                startDateFrom: appliedDateFilter.startDateFrom || undefined,
                startDateTo: appliedDateFilter.startDateTo || undefined,
                dueDateFrom: appliedDateFilter.dueDateFrom || undefined,
                dueDateTo: appliedDateFilter.dueDateTo || undefined,
                sortBy: "dueDate",
                sortAscending: sortByDeadline === "asc",
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
                const statusName = String(item.statusName ?? "").trim() || "-";
                const primaryAssignee = item.assignees?.[0] ?? null;
                const assignee = buildAssignee(primaryAssignee, t("unassigned"));

                return {
                    id,
                    title,
                    assigneeName: assignee.name,
                    assigneeAvatarUrl: assignee.avatarUrl,
                    assigneeInitials: assignee.initials,
                    severityLabel: severityLabelOf(item.taskSeverity, t),
                    severityClass: severityClassOf(item.taskSeverity),
                    priorityLabel: priorityLabelOf(item.taskPriority, t),
                    priorityClass: priorityClassOf(item.taskPriority),
                    statusName,
                    startLabel: formatShortDate(item.startDate ?? null, locale),
                    dueLabel: formatShortDate(item.dueDate ?? null, locale)
                } satisfies TaskRow;
            });

            setStatusOptions(nextStatuses);
            setRows(nextRows);
            setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
            setTotalCount(Math.max(0, Number(data?.totalCount ?? 0)));
        } catch (e: unknown) {
            setLoadError(e instanceof Error ? e.message : t("cannotLoad"));
        } finally {
            setLoading(false);
        }
    }, [appliedDateFilter, groupId, locale, page, searchKeyword, sortByDeadline, statusFilter, t]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    const showPagination = !loading && loadError === null;

    const openTaskDetail = (taskId: string) => {
        setDetailTaskId(taskId);
        setDetailOpen(true);
    };

    const closeTaskDetail = () => {
        setDetailOpen(false);
        setDetailTaskId(null);
    };

    return (
        <div className="bg-white pb-8">
            <TaskDetailModal open={detailOpen} onClose={closeTaskDetail} taskId={detailTaskId} onSaved={refresh} />

            <Container>
                <section className="mt-6 space-y-5">
                    <div className="rounded-[30px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.75fr_0.8fr_auto]">
                            <label className="relative block">
                                <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchInput}
                                    onChange={(e) => {
                                        setSearchInput(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder={t("searchPlaceholder")}
                                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50/70 pr-4 pl-11 text-sm text-zinc-800 outline-none transition focus:border-zinc-300 focus:bg-white"
                                />
                            </label>

                            <label className="relative block">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 text-sm text-zinc-800 outline-none transition focus:border-zinc-300 focus:bg-white">
                                    <option value="all">{t("allStatus")}</option>
                                    {statusOptions.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            </label>

                            <label className="relative block">
                                <select
                                    value={sortByDeadline}
                                    onChange={(e) => {
                                        setSortByDeadline(e.target.value === "desc" ? "desc" : "asc");
                                        setPage(1);
                                    }}
                                    className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 text-sm text-zinc-800 outline-none transition focus:border-zinc-300 focus:bg-white">
                                    <option value="asc">{`${t("sortLabel")}: ${t("sortAsc")}`}</option>
                                    <option value="desc">{`${t("sortLabel")}: ${t("sortDesc")}`}</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            </label>

                            <button
                                type="button"
                                onClick={() => setFilterOpen(true)}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-semibold text-sm text-zinc-700 transition hover:bg-zinc-50">
                                <Filter className="h-4 w-4" />
                                {t("dateFilterButton")}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
                        <div className="border-b border-zinc-200 px-5 py-4">
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
                            ) : rows.length === 0 ? (
                                <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-14 text-center">
                                    <ListTodo className="mx-auto h-9 w-9 text-zinc-400" />
                                    <p className="mt-4 font-medium text-zinc-600">{t("noData")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rows.map((row) => (
                                        <button
                                            key={row.id}
                                            type="button"
                                            onClick={() => openTaskDetail(row.id)}
                                            className="grid w-full grid-cols-7 gap-4 rounded-[24px] border border-zinc-200/80 bg-zinc-50/45 px-5 py-5 text-center transition hover:border-zinc-300 hover:bg-zinc-50">
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
                                        </button>
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
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
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
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 font-medium text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
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
                        startDateFrom: "",
                        startDateTo: "",
                        dueDateFrom: "",
                        dueDateTo: ""
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

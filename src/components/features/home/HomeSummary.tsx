"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowUpRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Flame,
    Layers3,
    Sparkles,
    TrendingUp,
    X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import useSWR from "swr";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import { getCurrentUserId } from "@/components/features/group/group.api";
import { fetchGroupsPageData } from "@/components/features/group/group.api";
import HomeTopTabs from "./HomeTopTabs";
import PersonalCalendar from "./PersonalCalendar";

type HomeSummaryResponse = components["schemas"]["HomeSummaryResponse"];
type HomeSummaryResponseApiResponse = components["schemas"]["HomeSummaryResponseApiResponse"];
type HomeTaskListResponse = components["schemas"]["HomeTaskListResponse"];
type HomeTaskListResponseApiResponse = components["schemas"]["HomeTaskListResponseApiResponse"];
type HomeTaskListItemResponse = components["schemas"]["HomeTaskListItemResponse"];
type GroupTaskListResponse = components["schemas"]["GroupTaskListResponse"];
type GroupTaskListResponseApiResponse = components["schemas"]["GroupTaskListResponseApiResponse"];
type PersonalTaskBoardResponse = components["schemas"]["PersonalTaskBoardResponse"];
type PersonalTaskBoardResponseApiResponse = components["schemas"]["PersonalTaskBoardResponseApiResponse"];
type TaskStatusDto = components["schemas"]["TaskStatusDto"];
type TaskItemResponse = components["schemas"]["TaskItemResponse"];
type UserGroupDto = components["schemas"]["UserGroupDto"];

type SummaryTaskFilter = "remaining" | "overdue" | "completed";
type SummaryTaskRequestFilter = SummaryTaskFilter | "all";
type SummarySourceFilter = "all" | "personal" | "group";
type SummaryPopupTaskItem = HomeTaskListItemResponse & {
    sourceKind: "group" | "personal";
    groupId?: string | null;
    groupName?: string | null;
};
const SUMMARY_GROUP_TASK_PAGE_SIZE = 100;
const SUMMARY_GROUP_TASK_MAX_PAGES = 3;
const SUMMARY_GROUP_TASK_GROUP_CONCURRENCY = 3;

type SummaryGroupItem = {
    groupId?: string | null;
    groupName?: string | null;
    id?: string | null;
    name?: string | null;
    membershipKind: Exclude<SummaryGroupFilter, "all">;
};

type StatCardProps = {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone?: "neutral" | "danger" | "success" | "violet";
    note?: string;
    index?: number;
    onClick?: () => void;
};

type OverviewCardProps = {
    title: string;
    value: number;
    total: number;
    description: string;
    tone?: "neutral" | "danger" | "success";
    index?: number;
    subtitleLabel?: string;
    quantityLabel?: string;
    onClick?: () => void;
};

type SummaryGroupFilter = "all" | "owned" | "joined";

type GroupListLayerProps = {
    open: boolean;
    onClose: () => void;
    filter: SummaryGroupFilter;
    onFilterChange: (filter: SummaryGroupFilter) => void;
    groups: SummaryGroupItem[];
    isLoading: boolean;
    error?: unknown;
    onGroupClick: (group: SummaryGroupItem) => void;
    t: ReturnType<typeof useTranslations<"HomeSummary">>;
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

function StatCard({ label, value, icon, tone = "neutral", note, index = 0, onClick }: StatCardProps) {
    const styles = {
        neutral: {
            card: "border-slate-200 bg-white backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-slate-100 text-slate-700 h-11 w-11 rounded-2xl",
            iconSize: "h-5 w-5",
            label: "text-black",
            value: "text-black",
            note: "text-slate-600"
        },
        danger: {
            card: "border-[#F1D7CE]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,245,0.98)_52%,rgba(251,235,229,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#FEE2E2] text-[#DC2626] h-12 w-12 rounded-full",
            iconSize: "h-5.5 w-5.5",
            label: "text-red-500",
            value: "text-red-600",
            note: "text-red-400"
        },
        success: {
            card: "border-[#CDE4DB]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,251,248,0.98)_52%,rgba(228,243,237,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#DCEFE6] text-[#2C7A63] h-10 w-10 rounded-xl",
            iconSize: "h-4.5 w-4.5",
            label: "text-green-500",
            value: "text-green-600",
            note: "text-green-500"
        },
        violet: {
            card: "border-[#F3D6B4]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,249,242,0.98)_52%,rgba(252,237,217,0.94)_100%)] backdrop-blur-xl",
            glow: "",
            iconWrap: "bg-[#FDE7CC] text-[#EA580C] h-11 w-11 rounded-2xl",
            iconSize: "h-5 w-5",
            label: "text-orange-500",
            value: "text-orange-600",
            note: "text-orange-500"
        }
    };

    const s = styles[tone];
    const cardClassName = cx(
        "group relative w-full overflow-hidden rounded-[28px] border p-5 text-left shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color,background-color] duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
        onClick && "cursor-pointer",
        s.card
    );

    const cardContent = (
        <>
            <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/60 opacity-70 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className={cx("font-medium text-sm", s.label)}>{label}</p>

                    <p className={cx("mt-3 font-bold text-3xl tracking-tight", s.value)}>{value}</p>
                    {note ? <p className={cx("mt-2 text-xs font-medium", s.note)}>{note}</p> : null}
                </div>

                <motion.div
                    whileHover={{ rotate: 8, scale: 1.05 }}
                    className={cx(
                        "flex shrink-0 items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                        s.iconWrap
                    )}>
                    <span className={s.iconSize}>{icon}</span>
                </motion.div>
            </div>
        </>
    );

    if (!onClick) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 * index }}
                className={cardClassName}>
                {cardContent}
            </motion.div>
        );
    }

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 * index }}
            whileHover={{ y: -6 }}
            onClick={onClick}
            className={cardClassName}>
            {cardContent}
        </motion.button>
    );
}

function OverviewCard({
    title,
    value,
    total,
    description,
    tone = "neutral",
    index = 0,
    subtitleLabel = "Current Overview",
    quantityLabel = "Quantity",
    onClick
}: OverviewCardProps) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    const styles = {
        neutral: {
            card: "border-slate-200 bg-white backdrop-blur-xl",
            badge: "bg-slate-100 text-slate-700",
            title: "text-black",
            subtitle: "text-slate-500",
            percent: "text-black",
            desc: "text-slate-700",
            track: "bg-slate-200",
            bar: "bg-[linear-gradient(90deg,#111827_0%,#000000_100%)]",
            quantityBox: "border-slate-200 bg-white",
            quantityLabel: "text-slate-500",
            quantityValue: "text-black",
            glow: ""
        },
        danger: {
            card: "border-[#F1D7CE]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,245,0.98)_52%,rgba(251,235,229,0.94)_100%)] backdrop-blur-xl",
            badge: "bg-[#FEE2E2] text-[#DC2626]",
            title: "text-red-600",
            subtitle: "text-red-400",
            percent: "text-red-600",
            desc: "text-red-500",
            track: "bg-[#FEE2E2]",
            bar: "bg-[linear-gradient(90deg,#EF4444_0%,#DC2626_100%)]",
            quantityBox: "border-[#FECACA] bg-[#FEF2F2]",
            quantityLabel: "text-red-400",
            quantityValue: "text-red-600",
            glow: ""
        },
        success: {
            card: "border-[#CDE4DB]/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,251,248,0.98)_52%,rgba(228,243,237,0.94)_100%)] backdrop-blur-xl",
            badge: "bg-[#DCEFE6] text-[#2C7A63]",
            title: "text-green-700",
            subtitle: "text-green-500",
            percent: "text-green-600",
            desc: "text-green-600",
            track: "bg-[#DCFCE7]",
            bar: "bg-[linear-gradient(90deg,#4ADE80_0%,#16A34A_100%)]",
            quantityBox: "border-[#BBF7D0] bg-[#F0FDF4]",
            quantityLabel: "text-green-500",
            quantityValue: "text-green-700",
            glow: ""
        }
    };

    const s = styles[tone];

    const cardClassName = cx(
        "relative overflow-hidden rounded-[30px] border p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color,background-color] duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
        onClick && "cursor-pointer",
        s.card
    );

    const cardContent = (
        <div className="relative">
            <div className="flex items-center gap-3">
                <div className={cx("rounded-2xl p-2.5 shadow-sm", s.badge)}>
                    <TrendingUp className="h-4 w-4" />
                </div>

                <div>
                    <h3 className={cx("font-semibold text-sm", s.title)}>{title}</h3>
                    <p className={cx("text-xs", s.subtitle)}>{subtitleLabel}</p>
                </div>
            </div>

            <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                    <p className={cx("font-bold text-5xl tracking-tight", s.percent)}>{percent}%</p>
                    <p className={cx("mt-3 text-sm leading-6 font-medium", s.desc)}>{description}</p>
                </div>

                <div className={cx("rounded-2xl border px-3 py-2 text-right shadow-sm backdrop-blur", s.quantityBox)}>
                    <p className={cx("text-[11px] uppercase tracking-wide", s.quantityLabel)}>{quantityLabel}</p>
                    <p className={cx("mt-1 font-semibold text-sm", s.quantityValue)}>
                        {value}/{total}
                    </p>
                </div>
            </div>

            <div className={cx("mt-6 h-3 w-full overflow-hidden rounded-full", s.track)}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.12 + 0.08 * index, ease: "easeOut" }}
                    className={cx("h-full rounded-full", s.bar)}
                />
            </div>
        </div>
    );

    if (!onClick) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 * index }}
                whileHover={{ y: -6 }}
                className={cardClassName}>
                {cardContent}
            </motion.div>
        );
    }

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 * index }}
            whileHover={{ y: -6 }}
            onClick={onClick}
            className={cardClassName}>
            {cardContent}
        </motion.button>
    );
}

function SkeletonCard({ large = false }: { large?: boolean }) {
    return (
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="animate-pulse">
                <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
                <div className={cx("rounded bg-slate-200", large ? "h-12 w-28" : "h-8 w-20")} />
                <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
                {large ? <div className="mt-6 h-3 w-full rounded-full bg-slate-100" /> : null}
            </div>
        </div>
    );
}

function buildSummaryUrl() {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const base = rawBase.replace(/\/+$/, "");

    if (!base) return "";
    if (/\/api$/i.test(base)) return `${base}/Home/summary`;
    return `${base}/api/Home/summary`;
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

function extractSummaryData(payload: unknown): HomeSummaryResponse | null {
    const source = payload as
        | HomeSummaryResponseApiResponse
        | {
            status?: string;
            data?: HomeSummaryResponseApiResponse | HomeSummaryResponse | null;
        }
        | null
        | undefined;

    const firstLayer = source?.data;

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "remainingTaskCount" in firstLayer &&
        "overdueTaskCount" in firstLayer &&
        "completedTaskCount" in firstLayer &&
        "totalJoinedGroupCount" in firstLayer
    ) {
        return firstLayer as HomeSummaryResponse;
    }

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "data" in firstLayer &&
        (firstLayer as HomeSummaryResponseApiResponse).data
    ) {
        return (firstLayer as HomeSummaryResponseApiResponse).data ?? null;
    }

    if (source && typeof source === "object" && "data" in source && (source as HomeSummaryResponseApiResponse).data) {
        return (source as HomeSummaryResponseApiResponse).data ?? null;
    }

    return null;
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

    if (source && typeof source === "object" && "data" in source && (source as HomeTaskListResponseApiResponse).data) {
        return (source as HomeTaskListResponseApiResponse).data ?? null;
    }

    return null;
}

const fetchHomeSummary = async (): Promise<HomeSummaryResponse | null> => {
    const url = buildSummaryUrl();
    if (!url) return null;

    const response = await apiFetch<HomeSummaryResponseApiResponse>(url, {
        method: "GET"
    });

    return extractSummaryData(response);
};

const fetchHomeTaskList = async (): Promise<HomeTaskListResponse | null> => {
    const url = buildTaskListUrl({
        page: 1,
        pageSize: 1000
    });
    if (!url) return null;

    const response = await apiFetch<HomeTaskListResponseApiResponse>(url, {
        method: "GET"
    });

    return extractTaskListData(response);
};

async function fetchGroupTaskPage(args: {
    groupId: string;
    filter: SummaryTaskRequestFilter;
    locale: string;
    page: number;
    pageSize: number;
    assigneeId?: string;
}): Promise<GroupTaskListResponse | null> {
    const query = new URLSearchParams();
    query.set("page", String(args.page));
    query.set("pageSize", String(args.pageSize));
    query.set("sortBy", "createdAt");
    query.set("sortAscending", "false");
    if (args.assigneeId) query.set("assigneeId", args.assigneeId);

    if (args.filter === "completed") {
        query.set("statusCategory", "completed");
    } else if (args.filter === "overdue") {
        query.set("overdue", "true");
    }

    const response = await apiFetch<GroupTaskListResponseApiResponse>(
        `/group/${encodeURIComponent(args.groupId)}/tasks?${query.toString()}`,
        {
            method: "GET",
            locale: args.locale
        }
    );

    const source = response as
        | GroupTaskListResponseApiResponse
        | {
            status?: string;
            data?: GroupTaskListResponseApiResponse | GroupTaskListResponse | null;
        }
        | null
        | undefined;

    const firstLayer = source?.data;

    if (firstLayer && typeof firstLayer === "object" && "items" in firstLayer && "page" in firstLayer) {
        return firstLayer as GroupTaskListResponse;
    }

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "data" in firstLayer &&
        (firstLayer as GroupTaskListResponseApiResponse).data
    ) {
        return (firstLayer as GroupTaskListResponseApiResponse).data ?? null;
    }

    if (source && typeof source === "object" && "data" in source && (source as GroupTaskListResponseApiResponse).data) {
        return (source as GroupTaskListResponseApiResponse).data ?? null;
    }

    return null;
}

async function fetchSummaryGroupTasks(args: {
    groups: UserGroupDto[];
    filter: SummaryTaskRequestFilter;
    locale: string;
    currentUserId?: string;
}): Promise<SummaryPopupTaskItem[]> {
    const validGroups = args.groups.filter((group) => !!group.groupId);
    if (!validGroups.length || !args.currentUserId) return [];

    const groupResults: SummaryPopupTaskItem[][] = [];

    for (let start = 0; start < validGroups.length; start += SUMMARY_GROUP_TASK_GROUP_CONCURRENCY) {
        const groupBatch = validGroups.slice(start, start + SUMMARY_GROUP_TASK_GROUP_CONCURRENCY);
        const batchResults = await Promise.allSettled(
            groupBatch.map(async (group) => {
                const groupId = String(group.groupId);
                const firstPage = await fetchGroupTaskPage({
                    groupId,
                    filter: args.filter,
                    locale: args.locale,
                    page: 1,
                    pageSize: SUMMARY_GROUP_TASK_PAGE_SIZE,
                    assigneeId: args.currentUserId
                });

                const totalPages = Math.max(1, Number(firstPage?.totalPages ?? 1));
                const pagesToFetch = Math.min(totalPages, SUMMARY_GROUP_TASK_MAX_PAGES);
                const restPages =
                    pagesToFetch > 1
                        ? await Promise.allSettled(
                            Array.from({ length: pagesToFetch - 1 }, (_, index) =>
                                fetchGroupTaskPage({
                                    groupId,
                                    filter: args.filter,
                                    locale: args.locale,
                                    page: index + 2,
                                    pageSize: SUMMARY_GROUP_TASK_PAGE_SIZE,
                                    assigneeId: args.currentUserId
                                })
                            )
                        )
                        : [];

                return [firstPage, ...restPages
                    .filter(
                        (result): result is PromiseFulfilledResult<GroupTaskListResponse | null> => result.status === "fulfilled"
                    )
                    .map((result) => result.value)]
                    .flatMap((page) => page?.items ?? [])
                    .map((item) => ({
                        dueDate: item.dueDate ?? null,
                        groupId,
                        groupName: group.groupName ?? null,
                        progress: item.progress ?? 0,
                        sourceKind: "group" as const,
                        sourceName: group.groupName ?? null,
                        sourceType: "group",
                        statusName: item.statusName ?? null,
                        taskId: item.taskId,
                        taskPriority: item.taskPriority,
                        taskSeverity: item.taskSeverity,
                        taskTitle: item.taskTitle ?? null
                    }) satisfies SummaryPopupTaskItem);
            })
        );

        for (const result of batchResults) {
            if (result.status !== "fulfilled") continue;
            groupResults.push(result.value);
        }
    }

    return groupResults.flat();
}

async function fetchPersonalTaskBoard(locale: string): Promise<PersonalTaskBoardResponse | null> {
    const response = await apiFetch<PersonalTaskBoardResponseApiResponse>("/Home/personal-task", {
        method: "GET",
        locale
    });

    const firstLayer = response?.data;
    if (firstLayer && typeof firstLayer === "object" && "personalTaskStatuses" in firstLayer) {
        return firstLayer as PersonalTaskBoardResponse;
    }

    return null;
}

async function fetchSummaryPersonalTasks(locale: string, personalSourceLabel: string): Promise<SummaryPopupTaskItem[]> {
    const board = await fetchPersonalTaskBoard(locale);
    const statuses = (board?.personalTaskStatuses ?? []) as TaskStatusDto[];

    return statuses.flatMap((status) =>
        ((status.taskList ?? []) as TaskItemResponse[]).map((task) => ({
            dueDate: task.dueDate ?? null,
            groupId: null,
            groupName: null,
            progress: task.progress ?? 0,
            sourceKind: "personal" as const,
            sourceName: personalSourceLabel,
            sourceType: "personal",
            statusName: status.statusName ?? task.personalStatus?.statusName ?? null,
            taskId: task.taskId,
            taskPriority: task.taskPriority,
            taskSeverity: task.taskSeverity,
            taskTitle: task.taskTitle ?? null
        }))
    );
}

function mapHomeTaskListGroupItems(items: HomeTaskListItemResponse[] | null | undefined): SummaryPopupTaskItem[] {
    return (items ?? [])
        .filter((item) => {
            const sourceType = String(item.sourceType ?? "").trim().toLowerCase();
            const sourceName = String(item.sourceName ?? "").trim();
            const groupName = String(item.groupName ?? "").trim();
            const normalizedSourceName = normalizeStatusName(sourceName);
            const isClearlyPersonal = sourceType === "personal" || normalizedSourceName === "ca nhan" || normalizedSourceName === "personal";
            return !isClearlyPersonal && !!String(item.taskId ?? "").trim() && (!!item.groupId || !!groupName || !!sourceName || sourceType === "group");
        })
        .map((item) => ({
            ...item,
            sourceKind: "group" as const,
            groupId: item.groupId ?? null,
            groupName: item.groupName ?? item.sourceName ?? null,
            sourceName: item.groupName ?? item.sourceName ?? null,
            sourceType: "group"
        }));
}

function dedupeSummaryItems(items: SummaryPopupTaskItem[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = `${item.sourceKind}:${item.groupId ?? "personal"}:${item.taskId ?? item.taskTitle ?? "unknown"}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function fetchJoinedGroups(): Promise<UserGroupDto[]> {
    const data = await fetchGroupsPageData();
    const result: UserGroupDto[] = [];

    for (const group of data.joined ?? []) {
        const candidate = group as { id?: string | null; groupId?: string | null; name?: string | null; groupName?: string | null };
        const groupId = String(candidate.groupId ?? candidate.id ?? "").trim();
        const groupName = String(candidate.groupName ?? candidate.name ?? "").trim();
        if (!groupId) continue;
        result.push({ groupId, groupName: groupName || null });
    }

    return result;
}

async function fetchJoinedGroupsPageData() {
    return fetchGroupsPageData();
}

function normalizeProgressValue(value?: number | null) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeStatusName(value?: string | null) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function isCompletedStatus(statusName?: string | null) {
    const normalized = normalizeStatusName(statusName);
    const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
    return (
        normalized.includes("hoan thanh") ||
        normalized.includes("done") ||
        normalized.includes("completed") ||
        tokens.includes("complete")
    );
}

function isOverdueStatus(statusName?: string | null) {
    const normalized = normalizeStatusName(statusName);
    return normalized.includes("qua han") || normalized.includes("overdue") || normalized.includes("tre han");
}

function isOverdueTask(dueDate?: string | null, progress?: number | null) {
    if (!dueDate || normalizeProgressValue(progress) >= 100) return false;

    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);

    return parsed < today;
}

function matchesSummaryTaskFilter(item: HomeTaskListItemResponse, filter: SummaryTaskFilter) {
    const completed = normalizeProgressValue(item.progress) >= 100 || isCompletedStatus(item.statusName);
    const overdue = isOverdueStatus(item.statusName) || isOverdueTask(item.dueDate, item.progress);

    if (filter === "completed") return completed;
    if (filter === "overdue") return overdue && !completed;
    return !completed;
}

function formatTaskDueDate(dueDate: string | null | undefined, locale: string, noDateLabel: string) {
    if (!dueDate) return noDateLabel;

    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return noDateLabel;

    return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(parsed);
}

function resolveSummarySourceLabel(
    item: SummaryPopupTaskItem,
    t: (key: string, values?: Record<string, string | number | Date>) => string,
    taskListT: (key: string, values?: Record<string, string | number | Date>) => string
) {
    if (item.sourceKind === "personal") return t("sourceFilters.personal");
    return item.groupName || item.sourceName || taskListT("groupSource");
}

function buildTaskDetailHref(item: HomeTaskListItemResponse) {
    const taskId = item.taskId ?? "";
    if (!taskId) return "#";
    if (item.groupId) return `/group/${item.groupId}?taskId=${taskId}&openTaskDetail=1`;
    return `/group/task/${encodeURIComponent(taskId)}`;
}

function normalizeSummaryGroupItem(group: SummaryGroupItem | Record<string, unknown>, membershipKind: "owned" | "joined"): SummaryGroupItem | null {
    const candidate = group as SummaryGroupItem & Record<string, unknown>;
    const groupId = String(candidate.groupId ?? candidate.id ?? "").trim();
    const groupName = String(candidate.groupName ?? candidate.name ?? "").trim();

    if (!groupId) return null;

    return {
        ...candidate,
        groupId,
        groupName: groupName || null,
        membershipKind
    };
}

function getTaskFilterMeta(
    filter: SummaryTaskFilter,
    t: (key: string, values?: Record<string, string | number | Date>) => string
) {
    if (filter === "overdue") {
        return {
            title: t("overdueTasksLabel"),
            note: t("overdueTasksNote"),
            tone: "danger" as const,
            emptyTitle: t("emptyStates.overdueTitle"),
            icon: <Flame className="h-5 w-5" />
        };
    }

    if (filter === "completed") {
        return {
            title: t("completedTasksLabel"),
            note: t("completedTasksNote"),
            tone: "success" as const,
            emptyTitle: t("emptyStates.completedTitle"),
            icon: <CheckCircle2 className="h-5 w-5" />
        };
    }

    return {
        title: t("remainingTasksLabel"),
        note: t("remainingTasksNote"),
        tone: "neutral" as const,
        emptyTitle: t("emptyStates.remainingTitle"),
        icon: <Clock3 className="h-5 w-5" />
    };
}

type DetailLayerProps = {
    open: boolean;
    onClose: () => void;
    isLoading: boolean;
    error: unknown;
    remainingTaskCount: number;
    overdueTaskCount: number;
    completedTaskCount: number;
    totalJoinedGroupCount: number;
    totalTasks: number;
    t: (key: string, values?: Record<string, string | number | Date>) => string;
    onTaskCardClick: (filter: SummaryTaskFilter) => void;
    onGroupsClick: () => void;
};

type TaskListLayerProps = {
    open: boolean;
    onClose: () => void;
    filter: SummaryTaskFilter;
    items: SummaryPopupTaskItem[];
    sourceFilter: SummarySourceFilter;
    onSourceFilterChange: (value: SummarySourceFilter) => void;
    isLoading: boolean;
    error: unknown;
    onTaskClick: (item: SummaryPopupTaskItem) => void;
    t: (key: string, values?: Record<string, string | number | Date>) => string;
    taskListT: (key: string) => string;
    locale: string;
};

function DetailLayer({
    open,
    onClose,
    isLoading,
    error,
    remainingTaskCount,
    overdueTaskCount,
    completedTaskCount,
    totalJoinedGroupCount,
    totalTasks,
    t,
    onTaskCardClick,
    onGroupsClick
}: DetailLayerProps) {
    const titleId = React.useId();

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
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#3F2A1D]/22 p-4 backdrop-blur-[5px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,249,244,0.96))] shadow-[0_28px_90px_rgba(146,64,14,0.12)]">
                        <div className="flex items-center justify-between border-[#F0DED0] border-b bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,244,0.96))] px-6 py-5 md:px-8">
                            <div>
                                <h2 id={titleId} className="font-bold text-2xl text-slate-900 tracking-tight md:text-3xl">
                                    {t("detailsTitle")}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={t("close")}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F0DDCF] bg-white/90 text-[#9A6B4A] transition hover:bg-[#FFF8F3]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFBF7_0%,#FDF4EC_100%)] px-6 py-6 md:px-8">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <SkeletonCard key={index} />
                                        ))}
                                    </section>

                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {Array.from({ length: 3 }).map((_, index) => (
                                            <SkeletonCard key={index} large />
                                        ))}
                                    </section>
                                </div>
                            ) : error ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-red-600 text-sm shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{t("loadingError")}</p>
                                            <p className="mt-1 text-red-400">{t("loadingErrorHint")}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-5">
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <StatCard
                                            label={t("remainingTasksLabel")}
                                            value={remainingTaskCount}
                                            icon={<Clock3 className="h-5 w-5" />}
                                            note={t("remainingTasksNote")}
                                            tone="neutral"
                                            index={0}
                                            onClick={() => onTaskCardClick("remaining")}
                                        />

                                        <StatCard
                                            label={t("overdueTasksLabel")}
                                            value={overdueTaskCount}
                                            icon={<Flame className="h-5 w-5" />}
                                            note={t("overdueTasksNote")}
                                            tone="danger"
                                            index={1}
                                            onClick={() => onTaskCardClick("overdue")}
                                        />

                                        <StatCard
                                            label={t("completedTasksLabel")}
                                            value={completedTaskCount}
                                            icon={<CheckCircle2 className="h-5 w-5" />}
                                            note={t("completedTasksNote")}
                                            tone="success"
                                            index={2}
                                            onClick={() => onTaskCardClick("completed")}
                                        />

                                        <StatCard
                                            label={t("joinedGroupsLabel")}
                                            value={totalJoinedGroupCount}
                                            icon={<Layers3 className="h-5 w-5" />}
                                            note={t("joinedGroupsNote")}
                                            tone="violet"
                                            index={3}
                                            onClick={onGroupsClick}
                                        />
                                    </section>

                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <OverviewCard
                                            title={t("overview.completedTitle")}
                                            value={completedTaskCount}
                                            total={totalTasks}
                                            description={t("overview.completedDescription", {
                                                count: completedTaskCount,
                                                total: totalTasks
                                            })}
                                            tone="success"
                                            index={0}
                                            subtitleLabel={t("currentOverview")}
                                            quantityLabel={t("quantity")}
                                            onClick={() => onTaskCardClick("completed")}
                                        />

                                        <OverviewCard
                                            title={t("overview.remainingTitle")}
                                            value={remainingTaskCount}
                                            total={totalTasks}
                                            description={t("overview.remainingDescription", {
                                                count: remainingTaskCount,
                                                total: totalTasks
                                            })}
                                            tone="neutral"
                                            index={1}
                                            subtitleLabel={t("currentOverview")}
                                            quantityLabel={t("quantity")}
                                            onClick={() => onTaskCardClick("remaining")}
                                        />

                                        <OverviewCard
                                            title={t("overview.overdueTitle")}
                                            value={overdueTaskCount}
                                            total={totalTasks}
                                            description={t("overview.overdueDescription", {
                                                count: overdueTaskCount,
                                                total: totalTasks
                                            })}
                                            tone="danger"
                                            index={2}
                                            subtitleLabel={t("currentOverview")}
                                            quantityLabel={t("quantity")}
                                            onClick={() => onTaskCardClick("overdue")}
                                        />
                                    </section>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

function TaskListLayer({
    open,
    onClose,
    filter,
    items,
    sourceFilter,
    onSourceFilterChange,
    isLoading,
    error,
    onTaskClick,
    t,
    taskListT,
    locale
}: TaskListLayerProps) {
    const titleId = React.useId();
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const previousFocusRef = React.useRef<HTMLElement | null>(null);
    const meta = getTaskFilterMeta(filter, t);
    const noDateLabel = taskListT("noDate");
    const toneStyles = {
        neutral: {
            badge: "bg-slate-100 text-slate-700",
            panel: "border-slate-200 bg-white hover:border-slate-300",
            count: "text-slate-900"
        },
        danger: {
            badge: "bg-red-50 text-red-600",
            panel: "border-red-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF6F4_100%)] hover:border-red-200",
            count: "text-red-600"
        },
        success: {
            badge: "bg-emerald-50 text-emerald-700",
            panel: "border-emerald-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#F3FCF7_100%)] hover:border-emerald-200",
            count: "text-emerald-700"
        }
    }[meta.tone];

    React.useEffect(() => {
        if (!open) return;

        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const focusTarget = closeButtonRef.current ?? dialogRef.current;
        window.setTimeout(() => {
            focusTarget?.focus();
        }, 0);

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== "Tab") return;

            const dialog = dialogRef.current;
            if (!dialog) return;

            const focusableElements = Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);

            if (!focusableElements.length) {
                e.preventDefault();
                dialog.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (e.shiftKey) {
                if (activeElement === firstElement || !dialog.contains(activeElement)) {
                    e.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (activeElement === lastElement || !dialog.contains(activeElement)) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
            previousFocusRef.current?.focus();
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    ref={overlayRef}
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/38 p-4 backdrop-blur-[4px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(event) => {
                        if (event.target === overlayRef.current) onClose();
                    }}>
                    <motion.div
                        ref={dialogRef}
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,244,0.96))] shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
                        <div className="flex items-start justify-between gap-4 border-b border-[#F0DED0] px-6 py-5 md:px-8">
                            <div className="min-w-0">
                                <div className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", toneStyles.badge)}>
                                    {meta.icon}
                                    <span>{meta.title}</span>
                                </div>
                                <h2 id={titleId} className="mt-3 font-bold text-2xl tracking-tight text-slate-900 md:text-3xl">
                                    {meta.title}
                                </h2>
                                <p className="mt-2 text-sm text-slate-500">{meta.note}</p>
                            </div>

                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={onClose}
                                aria-label={t("close")}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F0DDCF] bg-white/90 text-[#9A6B4A] transition hover:bg-[#FFF8F3]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFBF7_0%,#FDF4EC_100%)] px-6 py-6 md:px-8">
                            {isLoading ? (
                                <div className="space-y-4">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <SkeletonCard key={index} />
                                    ))}
                                </div>
                            ) : error ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-sm text-red-600 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{t("loadingError")}</p>
                                            <p className="mt-1 text-red-400">{t("loadingErrorHint")}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm text-slate-500">{taskListT("detailedSubtitle")}</p>
                                        <p className={cx("font-semibold text-sm", toneStyles.count)}>{items.length}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {([
                                            { value: "all", label: t("sourceFilters.all") },
                                            { value: "personal", label: t("sourceFilters.personal") },
                                            { value: "group", label: t("sourceFilters.group") }
                                        ] as Array<{ value: SummarySourceFilter; label: string }>).map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => onSourceFilterChange(option.value)}
                                                className={cx(
                                                    "rounded-full border px-4 py-2 text-sm font-medium transition",
                                                    sourceFilter === option.value
                                                        ? "border-[#EA580C] bg-[#EA580C] text-white shadow-[0_10px_24px_rgba(234,88,12,0.22)]"
                                                        : "border-[#F3D6B4] bg-white text-[#9A6B4A] hover:bg-[#FFF7ED] hover:text-[#C2410C]"
                                                )}>
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>

                                    {items.length === 0 ? (
                                        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center shadow-sm">
                                            <p className="font-semibold text-slate-900">{meta.emptyTitle}</p>
                                            <p className="mt-2 text-sm text-slate-500">{meta.note}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map((item) => {
                                                const dueLabel = formatTaskDueDate(item.dueDate, locale, noDateLabel);
                                                const sourceLabel = resolveSummarySourceLabel(item, t, taskListT);
                                                return (
                                                    <motion.button
                                                        key={`${item.groupId ?? "group"}-${item.taskId ?? item.taskTitle}`}
                                                        type="button"
                                                        whileHover={{ y: -3 }}
                                                        onClick={() => onTaskClick(item)}
                                                        className={cx(
                                                            "flex w-full items-start justify-between gap-4 rounded-[24px] border p-5 text-left shadow-sm transition",
                                                            toneStyles.panel
                                                        )}>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="truncate font-semibold text-base text-slate-900">
                                                                    {item.taskTitle || taskListT("tableHeaderTask")}
                                                                </h3>
                                                                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
                                                                    {item.statusName || meta.title}
                                                                </span>
                                                            </div>

                                                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                                                                <span>{sourceLabel}</span>
                                                                <span>
                                                                    {taskListT("tableHeaderDueDate")}: {dueLabel}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-700">
                                                            <span>{t("openTask")}</span>
                                                            <ArrowUpRight className="h-4 w-4" />
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

function GroupListLayer({
    open,
    onClose,
    filter,
    onFilterChange,
    groups,
    isLoading,
    error,
    onGroupClick,
    t
}: GroupListLayerProps) {
    const titleId = React.useId();
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const previousFocusRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        if (!open) return;

        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const focusTarget = closeButtonRef.current ?? dialogRef.current;
        window.setTimeout(() => {
            focusTarget?.focus();
        }, 0);

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== "Tab") return;

            const dialog = dialogRef.current;
            if (!dialog) return;

            const focusableElements = Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);

            if (!focusableElements.length) {
                e.preventDefault();
                dialog.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (e.shiftKey) {
                if (activeElement === firstElement || !dialog.contains(activeElement)) {
                    e.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (activeElement === lastElement || !dialog.contains(activeElement)) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
            previousFocusRef.current?.focus();
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    ref={overlayRef}
                    className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/38 p-4 backdrop-blur-[4px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(event) => {
                        if (event.target === overlayRef.current) onClose();
                    }}>
                    <motion.div
                        ref={dialogRef}
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,244,0.96))] shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
                        <div className="flex items-start justify-between gap-4 border-b border-[#F0DED0] px-6 py-5 md:px-8">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-orange-700 text-xs font-semibold">
                                    <Layers3 className="h-4 w-4" />
                                    <span>{t("joinedGroupsLabel")}</span>
                                </div>
                                <h2 id={titleId} className="mt-3 font-bold text-2xl tracking-tight text-slate-900 md:text-3xl">
                                    {t("groupList.title")}
                                </h2>
                                <p className="mt-2 text-sm text-slate-500">{t("groupList.subtitle")}</p>
                            </div>

                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={onClose}
                                aria-label={t("close")}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F0DDCF] bg-white/90 text-[#9A6B4A] transition hover:bg-[#FFF8F3]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFBF7_0%,#FDF4EC_100%)] px-6 py-6 md:px-8">
                            <div className="mb-5 flex flex-wrap gap-3">
                                {([
                                    { value: "all", label: t("groupList.filters.all") },
                                    { value: "owned", label: t("groupList.filters.owned") },
                                    { value: "joined", label: t("groupList.filters.joined") }
                                ] as const).map((option) => {
                                    const active = option.value === filter;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => onFilterChange(option.value)}
                                            className={cx(
                                                "rounded-full border px-4 py-2 text-sm font-medium transition",
                                                active
                                                    ? "border-orange-500 bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.24)]"
                                                    : "border-orange-200 bg-white/80 text-orange-700 hover:border-orange-300"
                                            )}>
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {isLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <SkeletonCard key={index} />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-red-600 text-sm shadow-sm">
                                    <p className="font-semibold">{t("loadingError")}</p>
                                    <p className="mt-1 text-red-400">{t("loadingErrorHint")}</p>
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center shadow-sm">
                                    <p className="font-semibold text-slate-900">{t("groupList.emptyTitle")}</p>
                                    <p className="mt-2 text-sm text-slate-500">{t("groupList.emptyHint")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {groups.map((group) => (
                                        <motion.button
                                            key={String(group.groupId ?? group.id ?? group.groupName)}
                                            type="button"
                                            whileHover={{ y: -3 }}
                                            onClick={() => onGroupClick(group)}
                                            className="flex w-full items-start justify-between gap-4 rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF7F1_100%)] p-5 text-left shadow-sm transition hover:border-orange-200">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate font-semibold text-base text-slate-900">
                                                        {group.groupName || group.name || t("groupList.untitledGroup")}
                                                    </h3>
                                                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
                                                        {group.membershipKind === "owned"
                                                            ? t("groupList.filters.owned")
                                                            : t("groupList.filters.joined")}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-700">
                                                <span>{t("groupList.openGroup")}</span>
                                                <ArrowUpRight className="h-4 w-4" />
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default function HomeSummary() {
    const t = useTranslations("HomeSummary");
    const taskListT = useTranslations("HomeTaskList");
    const locale = useLocale();
    const router = useRouter();
    const [cacheKey, setCacheKey] = React.useState(0);
    const [openDetail, setOpenDetail] = React.useState(false);
    const [openCalendar, setOpenCalendar] = React.useState(false);
    const [openTaskPopup, setOpenTaskPopup] = React.useState(false);
    const [openGroupPopup, setOpenGroupPopup] = React.useState(false);
    const [selectedTaskFilter, setSelectedTaskFilter] = React.useState<SummaryTaskFilter>("remaining");
    const [selectedSourceFilter, setSelectedSourceFilter] = React.useState<SummarySourceFilter>("all");
    const [selectedGroupFilter, setSelectedGroupFilter] = React.useState<SummaryGroupFilter>("all");
    const currentUserId = React.useMemo(() => getCurrentUserId(), []);

    React.useEffect(() => {
        setCacheKey((prev) => prev + 1);
    }, []);

    const {
        data: summary,
        isLoading,
        error
    } = useSWR(["home-summary", cacheKey], fetchHomeSummary, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        revalidateIfStale: false
    });

    const {
        data: taskListData,
        isLoading: isTaskListLoading,
        error: taskListError
    } = useSWR(openTaskPopup ? ["home-summary-task-list", cacheKey] : null, fetchHomeTaskList, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        revalidateIfStale: false
    });

    const {
        data: groupsPageData,
        isLoading: isGroupsPageDataLoading,
        error: groupsPageDataError
    } = useSWR(openGroupPopup ? ["home-summary-groups-page-data"] : null, fetchJoinedGroupsPageData, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        revalidateIfStale: false
    });

    const { data: joinedGroups, error: joinedGroupsError } = useSWR(
        openTaskPopup ? ["home-summary-joined-groups"] : null,
        fetchJoinedGroups,
        {
            refreshInterval: 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            revalidateIfStale: false
        }
    );

    const userGroups = React.useMemo(() => {
        if (!openTaskPopup) return [];
        const merged = [...(taskListData?.userGroups ?? []), ...(joinedGroups ?? [])].filter((group) => !!group.groupId);
        const seen = new Set<string>();
        return merged.filter((group) => {
            const groupId = String(group.groupId ?? "").trim();
            if (!groupId || seen.has(groupId)) return false;
            seen.add(groupId);
            return true;
        });
    }, [joinedGroups, openTaskPopup, taskListData?.userGroups]);

    const {
        data: summaryGroupTasks,
        isLoading: isSummaryGroupTasksLoading,
        error: summaryGroupTasksError
    } = useSWR(
        openTaskPopup && userGroups.length && currentUserId
            ? [
                "home-summary-group-tasks",
                cacheKey,
                locale,
                currentUserId,
                userGroups.map((group) => group.groupId).join(",")
            ]
            : null,
        () =>
            fetchSummaryGroupTasks({
                groups: userGroups,
                filter: "all",
                locale,
                currentUserId
            }),
        {
            refreshInterval: 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            revalidateIfStale: false
        }
    );

    const personalSourceLabel = t("sourceFilters.personal");

    const {
        data: summaryPersonalTasks,
        isLoading: isSummaryPersonalTasksLoading,
        error: summaryPersonalTasksError
    } = useSWR(
        openTaskPopup ? ["home-summary-personal-tasks", cacheKey, locale] : null,
        () => fetchSummaryPersonalTasks(locale, personalSourceLabel),
        {
            refreshInterval: 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            revalidateIfStale: false
        }
    );

    const homeTaskListGroupItems = React.useMemo(() => mapHomeTaskListGroupItems(taskListData?.items), [taskListData?.items]);

    const combinedPopupTasks = React.useMemo(
        () => dedupeSummaryItems([...(summaryPersonalTasks ?? []), ...homeTaskListGroupItems, ...(summaryGroupTasks ?? [])]),
        [homeTaskListGroupItems, summaryGroupTasks, summaryPersonalTasks]
    );

    const remainingTaskCount = summary?.remainingTaskCount ?? 0;
    const overdueTaskCount = summary?.overdueTaskCount ?? 0;
    const completedTaskCount = summary?.completedTaskCount ?? 0;
    const totalJoinedGroupCount = summary?.totalJoinedGroupCount ?? 0;

    const totalTasks = remainingTaskCount + overdueTaskCount + completedTaskCount;
    const summaryCardsLoading = isLoading;
    const summaryCardsError = error;
    const taskPopupLoading =
        isTaskListLoading || isSummaryPersonalTasksLoading || (userGroups.length > 0 && isSummaryGroupTasksLoading);
    const taskPopupError = taskListError ?? joinedGroupsError ?? summaryGroupTasksError ?? summaryPersonalTasksError;

    const summaryTaskItems = React.useMemo(() => {
        const filtered = combinedPopupTasks.filter((item) => {
            if (!matchesSummaryTaskFilter(item, selectedTaskFilter)) return false;
            if (selectedSourceFilter === "all") return true;
            return item.sourceKind === selectedSourceFilter;
        });

        return filtered.sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

            if (selectedTaskFilter === "completed") return bTime - aTime;
            return aTime - bTime;
        });
    }, [combinedPopupTasks, selectedSourceFilter, selectedTaskFilter]);

    const summaryGroups = React.useMemo(() => {
        if (!groupsPageData) return [];

        const joinedItems = (groupsPageData.joined ?? [])
            .map((group) => normalizeSummaryGroupItem(group as Record<string, unknown>, "joined"))
            .filter((group): group is SummaryGroupItem => !!group);

        const joinedIds = new Set(joinedItems.map((group) => String(group.groupId ?? group.id ?? "").trim()).filter(Boolean));

        const ownedItems = [...(groupsPageData.managed ?? []), ...(groupsPageData.independent ?? [])]
            .map((group) => normalizeSummaryGroupItem(group as Record<string, unknown>, "owned"))
            .filter((group): group is SummaryGroupItem => {
                if (!group) return false;
                const groupId = String(group.groupId ?? group.id ?? "").trim();
                return !!groupId && !joinedIds.has(groupId);
            });

        if (selectedGroupFilter === "joined") return joinedItems;
        if (selectedGroupFilter === "owned") return ownedItems;

        const merged = [...ownedItems, ...joinedItems];
        const seen = new Set<string>();
        return merged.filter((group) => {
            const groupId = String(group.groupId ?? group.id ?? "").trim();
            if (!groupId || seen.has(groupId)) return false;
            seen.add(groupId);
            return true;
        });
    }, [groupsPageData, selectedGroupFilter]);

    const handleOpenTaskPopup = (filter: SummaryTaskFilter) => {
        setSelectedTaskFilter(filter);
        setSelectedSourceFilter("all");
        setOpenDetail(false);
        setOpenTaskPopup(true);
    };

    const handleOpenGroupPopup = () => {
        setSelectedGroupFilter("all");
        setOpenDetail(false);
        setOpenGroupPopup(true);
    };

    const closeTaskPopup = React.useCallback(() => {
        setOpenTaskPopup(false);
    }, []);

    const closeGroupPopup = React.useCallback(() => {
        setOpenGroupPopup(false);
    }, []);

    const handleTaskClick = React.useCallback((item: SummaryPopupTaskItem) => {
        if (item.sourceKind === "personal") {
            const taskId = String(item.taskId ?? "").trim();
            if (!taskId) return;
            closeTaskPopup();
            document.getElementById("home-personal-task-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.dispatchEvent(new CustomEvent("home:open-personal-task-detail", { detail: { taskId } }));
            return;
        }

        const href = buildTaskDetailHref(item);
        if (href === "#") return;
        closeTaskPopup();
        router.push(href);
    }, [closeTaskPopup, router]);

    const handleGroupClick = React.useCallback((group: SummaryGroupItem) => {
        const groupId = String(group.groupId ?? group.id ?? "").trim();
        if (!groupId) return;
        closeGroupPopup();
        router.push(`/group/${groupId}`);
    }, [closeGroupPopup, router]);

    return (
        <>
            <div
                id="home-summary-section"
                className="relative scroll-mt-24 overflow-hidden bg-[linear-gradient(180deg,#FFF9F4_0%,#FEF3E8_34%,#FCEBDD_68%,#F7EFE8_100%)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute top-[-40px] left-[-80px] h-72 w-72 rounded-full bg-[#F7D7BF]/48 blur-3xl" />
                    <div className="absolute top-[18%] right-[-80px] h-80 w-80 rounded-full bg-[#F6C9A5]/35 blur-3xl" />
                    <div className="absolute bottom-[-120px] left-[15%] h-96 w-96 rounded-full bg-[#FBE4D2]/38 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
                </div>

                <Container className="relative pt-8 pb-8">
                    <div className="space-y-8">
                        <SectionReveal>
                            <section className="relative overflow-hidden rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,247,240,0.76))] px-6 py-6 shadow-[0_18px_60px_rgba(180,83,9,0.08)] backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_30%)]" />

                                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/85 px-3 py-1 font-semibold text-[11px] text-orange-700 uppercase tracking-[0.18em] shadow-sm backdrop-blur">
                                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                            {t("heroPill")}
                                        </div>
                                        <h1 className="mt-3 bg-[linear-gradient(135deg,#7C2D12_0%,#EA580C_48%,#FB923C_100%)] bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-[38px]">
                                            {t("title")}
                                        </h1>

                                        <div className="mt-4">
                                            <HomeTopTabs />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setOpenCalendar(true)}
                                            className="h-11 rounded-2xl border-orange-200/80 bg-white/85 px-4 text-orange-700 shadow-sm backdrop-blur transition-[transform,box-shadow,border-color,background-color] hover:border-orange-300 hover:bg-white">
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {t("calendar")}
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </SectionReveal>

                        <SectionReveal delay={0.06}>
                            <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,246,238,0.62))] p-4 shadow-[0_18px_50px_rgba(180,83,9,0.06)] backdrop-blur-xl md:p-6">
                                {summaryCardsLoading ? (
                                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <SkeletonCard key={index} />
                                        ))}
                                    </section>
                                ) : summaryCardsError ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(254,242,242,0.96))] px-5 py-4 text-red-600 text-sm shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{t("loadingError")}</p>
                                                <p className="mt-1 text-red-400">{t("loadingErrorHint")}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-5">
                                        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                            <StatCard
                                                label={t("remainingTasksLabel")}
                                                value={remainingTaskCount}
                                                icon={<Clock3 className="h-5 w-5" />}
                                                note={t("remainingTasksNote")}
                                                tone="neutral"
                                                index={0}
                                                onClick={() => handleOpenTaskPopup("remaining")}
                                            />

                                            <StatCard
                                                label={t("overdueTasksLabel")}
                                                value={overdueTaskCount}
                                                icon={<Flame className="h-5 w-5" />}
                                                tone="danger"
                                                note={t("overdueTasksNote")}
                                                index={1}
                                                onClick={() => handleOpenTaskPopup("overdue")}
                                            />

                                            <StatCard
                                                label={t("completedTasksLabel")}
                                                value={completedTaskCount}
                                                icon={<CheckCircle2 className="h-5 w-5" />}
                                                tone="success"
                                                note={t("completedTasksNote")}
                                                index={2}
                                                onClick={() => handleOpenTaskPopup("completed")}
                                            />
                                        </section>

                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => setOpenDetail(true)}
                                                className="h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4">
                                                {t("viewDetails")}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </SectionReveal>
                    </div>
                </Container>
            </div>

            <DetailLayer
                open={openDetail}
                onClose={() => setOpenDetail(false)}
                isLoading={summaryCardsLoading}
                error={summaryCardsError}
                remainingTaskCount={remainingTaskCount}
                overdueTaskCount={overdueTaskCount}
                completedTaskCount={completedTaskCount}
                totalJoinedGroupCount={totalJoinedGroupCount}
                totalTasks={totalTasks}
                t={t}
                onTaskCardClick={handleOpenTaskPopup}
                onGroupsClick={handleOpenGroupPopup}
            />

            <TaskListLayer
                open={openTaskPopup}
                onClose={closeTaskPopup}
                filter={selectedTaskFilter}
                items={summaryTaskItems}
                sourceFilter={selectedSourceFilter}
                onSourceFilterChange={setSelectedSourceFilter}
                isLoading={taskPopupLoading}
                error={taskPopupError}
                onTaskClick={handleTaskClick}
                t={t}
                taskListT={taskListT}
                locale={locale}
            />

            <GroupListLayer
                open={openGroupPopup}
                onClose={closeGroupPopup}
                filter={selectedGroupFilter}
                onFilterChange={setSelectedGroupFilter}
                groups={summaryGroups}
                isLoading={isGroupsPageDataLoading}
                error={groupsPageDataError}
                onGroupClick={handleGroupClick}
                t={t}
            />

            <PersonalCalendar open={openCalendar} onClose={() => setOpenCalendar(false)} />
        </>
    );
}

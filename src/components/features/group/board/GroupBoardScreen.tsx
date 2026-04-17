"use client";

import {
    type CollisionDetection,
    closestCenter,
    closestCorners,
    DndContext,
    type DragCancelEvent,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    type DroppableContainer,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    useDroppable,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    arrayMove,
    horizontalListSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CheckCircle2, Clock3, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { createPortal } from "react-dom";
import { toast as sonnerToast } from "sonner";
import { getUserData } from "@/api/auth";
import type { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import { useGroupHeaderActionSlot } from "@/components/features/group/GroupShell";
import { useGuardedRouter } from "@/components/providers/RateLimitGuardProvider";
import { getCurrentUserId, mapRole } from "@/components/features/group/group.api";
import AssigneeAvatar from "@/components/features/group/task/AssigneeAvatar";
import TaskDetailModal from "@/components/features/group/task/TaskDetailModal";
import TaskFormModal, { type TaskFormOption, type TaskFormValues } from "@/components/features/group/task/TaskForm";
import locale from "antd/es/calendar/locale/en_US";
import { formatDate } from "@fullcalendar/core/index.js";

type ColumnId = string;

const PRIORITY_MAP: Record<string, components["schemas"]["TaskPriority"]> = {
    low: 0,
    medium: 1,
    high: 2
};

const SEVERITY_MAP: Record<string, components["schemas"]["TaskSeverity"]> = {
    minor: 0,
    moderate: 1,
    major: 2,
    critical: 3
};

type Task = {
    id: string;
    title: string;
    statusDot?: "green" | "yellow" | "red";
    tagLeft?: string;
    tagRight?: string;
    due?: string;
    dueRaw?: string;
    start?: string;
    startRaw?: string;
    description?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    assigneeAvatarUrl?: string | null;
    assigneeInitials?: string | null;
    statusName?: string | null;
    priority?: number | null;
    severity?: number | null;
    progress?: number;
    estimatedHours?: number;
    actualHours?: number;
    completedAt?: string;
    position?: number;
};

type Column = {
    id: ColumnId;
    title: string;
    position: number;
};

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    assignee?: {
        id?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
    } | null;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
    estimatedHours?: number;
    actualHours?: number;
    progress?: number;
    completedAt?: string;
};

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
};

type GroupTaskItemResponse = components["schemas"]["GroupTaskItemResponse"];
type GroupTaskListResponse = components["schemas"]["GroupTaskListResponse"];

type GroupDetailResponse = {
    groupId?: string;
    userRole?: string | null;
    taskStatuses?: TaskStatusDto[] | null;
    allowMemberUpdateProgress?: boolean;
    bannerUrl?: string | null;
    colorHex?: string | null;
};

type GroupTaskStatusData = {
    groupId?: string;
    statusId?: string;
    statusName?: string | null;
    position?: number;
};

type GroupMemberDto = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
};

type GroupMemberListResponse = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberDto[] | null;
    totalMembers?: number;
};

type ApiMessages = {
    missingApiBase: string;
    invalidGroupId: string;
    invalidTaskId: string;
    invalidStatusId: string;
    enterStatusName: string;
    genericApiError: string;
};

type DueDateFilterKey = "noDates" | "overdue" | "nextDay" | "nextWeek" | "nextMonth";
type MemberFilterKey = "noMembers" | "assignedToMe";
type CardStatusFilterKey = "complete" | "inProgress";

type BoardFilters = {
    members: MemberFilterKey[];
    cardStatus: CardStatusFilterKey[];
    dueDate: DueDateFilterKey[];
    priorities: number[];
    severities: number[];
};

type DueDateFilterRange = {
    from?: string;
    to?: string;
};

type DueDateFilterResolution = {
    ranges: DueDateFilterRange[];
    requiresOr: boolean;
};

const EMPTY_BOARD_FILTERS: BoardFilters = {
    members: [],
    cardStatus: [],
    dueDate: [],
    priorities: [],
    severities: []
};

/**
 * Chuyển các bộ lọc hạn chót ở cấp board thành các khoảng ngày cụ thể
 * để có thể truyền xuống API khi backend hỗ trợ biểu diễn trực tiếp.
 *
 * Quy ước:
 * - `noDates`: task chưa có hạn chót
 * - `overdue`: hạn chót nhỏ hơn hôm nay
 * - `nextDay`: hạn chót rơi vào ngày mai
 * - `nextWeek`: hạn chót nằm trong 7 ngày tới
 * - `nextMonth`: hạn chót nằm trong 30 ngày tới
 */
function calculateDueDateRange(filters: DueDateFilterKey[]): DueDateFilterResolution {
    if (filters.length === 0) {
        return { ranges: [], requiresOr: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ranges: DueDateFilterRange[] = [];

    for (const filter of filters) {
        if (filter === "overdue") {
            // Nhóm "quá hạn": chỉ lấy các task có hạn chót trước ngày hiện tại.
            const overdueTo = new Date(today);
            overdueTo.setDate(overdueTo.getDate() - 1);
            ranges.push({ to: overdueTo.toISOString() });
        } else if (filter === "nextDay") {
            // Nhóm "ngày mai": từ và đến đều là đúng ngày mai.
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            ranges.push({ from: tomorrow.toISOString(), to: tomorrow.toISOString() });
        } else if (filter === "nextWeek") {
            // Nhóm "7 ngày tới": tính từ hôm nay đến hết ngày thứ 7 tiếp theo.
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            ranges.push({ from: today.toISOString(), to: nextWeek.toISOString() });
        } else if (filter === "nextMonth") {
            // Nhóm "30 ngày tới": tính từ hôm nay đến hết ngày thứ 30 tiếp theo.
            const nextMonth = new Date(today);
            nextMonth.setDate(nextMonth.getDate() + 30);
            ranges.push({ from: today.toISOString(), to: nextMonth.toISOString() });
        }
        // `noDates` không sinh ra khoảng ngày mà sẽ được gửi riêng qua cờ `hasNoDueDate`.
    }

    return {
        ranges,
        requiresOr: ranges.length > 1
    };
}

/**
 * Trả về `assigneeId` nếu bộ lọc thành viên đang chọn "giao cho tôi".
 * Nếu không có người dùng hiện tại hoặc không bật bộ lọc này thì bỏ qua.
 */
function getAssigneeIdFromFilter(filters: MemberFilterKey[], currentUserId: string | null): string | undefined {
    if (filters.includes("assignedToMe") && currentUserId) {
        return currentUserId;
    }
    return undefined;
}

/**
 * Dựng bộ tham số filter gửi xuống API từ state filter của board.
 *
 * Lưu ý:
 * - Chỉ những điều kiện backend hiểu được mới được đẩy xuống API.
 * - Các trường hợp cần nhiều giá trị hoặc logic OR vẫn sẽ được giữ lại
 *   để lọc tiếp ở phía client nhằm bảo toàn đúng ngữ nghĩa.
 */
function buildApiFiltersFromBoardFilters(
    filters: BoardFilters,
    currentUserId: string | null
): {
    assigneeId?: string;
    priority?: number;
    severity?: number;
    dueDateFrom?: string;
    dueDateTo?: string;
    statusCategory?: string;
    hasNoAssignee?: boolean;
    hasNoDueDate?: boolean;
} {
    const result: {
        assigneeId?: string;
        priority?: number;
        severity?: number;
        dueDateFrom?: string;
        dueDateTo?: string;
        statusCategory?: string;
        hasNoAssignee?: boolean;
        hasNoDueDate?: boolean;
    } = {};

    // Chỉ đẩy xuống API những điều kiện mà backend biểu diễn được trực tiếp.
    // Các trường hợp nhiều lựa chọn hoặc cần OR sẽ được giữ lại để lọc tiếp ở client.
    // Với bộ lọc thành viên, chỉ "assignedToMe" chuyển thành `assigneeId`;
    // còn "noMembers" sẽ được ánh xạ sang cờ `hasNoAssignee`.
    const assigneeId = getAssigneeIdFromFilter(filters.members, currentUserId);
    if (assigneeId) result.assigneeId = assigneeId;

    // Backend hiện chỉ nhận một giá trị `priority` và một giá trị `severity`.
    // Nếu người dùng chọn nhiều mức, ta gửi giá trị đầu tiên cho API để thu hẹp dữ liệu và tiếp tục lọc đầy đủ ở client.
    if (filters.priorities.length > 0) {
        result.priority = filters.priorities[0];
    }

    if (filters.severities.length > 0) {
        result.severity = filters.severities[0];
    }

    // Chỉ áp dụng khoảng hạn chót ở API khi có thể biểu diễn thành đúng một khoảng duy nhất.
    // Trường hợp chọn nhiều mốc thời gian cần logic OR sẽ được xử lý ở client.
    const dueDateRange = calculateDueDateRange(filters.dueDate);
    if (!dueDateRange.requiresOr && dueDateRange.ranges.length === 1) {
        const singleRange = dueDateRange.ranges[0];
        if (singleRange.from) result.dueDateFrom = singleRange.from;
        if (singleRange.to) result.dueDateTo = singleRange.to;
    }

    // Ánh xạ trạng thái hiển thị của card sang giá trị mà API chấp nhận: "complete" -> "completed", "inProgress" -> "inprogress".
    if (filters.cardStatus.length > 0) {
        if (filters.cardStatus.includes("complete")) {
            result.statusCategory = "completed";
        } else if (filters.cardStatus.includes("inProgress")) {
            result.statusCategory = "inprogress";
        }
    }

    // Nếu người dùng lọc "không có người phụ trách" thì bật cờ tương ứng.
    if (filters.members.includes("noMembers")) {
        result.hasNoAssignee = true;
    }

    // Nếu người dùng lọc "không có hạn chót" thì bật cờ tương ứng.
    if (filters.dueDate.includes("noDates")) {
        result.hasNoDueDate = true;
    }

    return result;
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isInteractiveElement(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return false;

    return !!el.closest('button, input, textarea, select, option, a, [role="button"], [data-no-pan="true"]');
}

function dotClass(statusDot?: Task["statusDot"]) {
    if (statusDot === "green") return "bg-emerald-500";
    if (statusDot === "yellow") return "bg-amber-500";
    if (statusDot === "red") return "bg-rose-500";
    return "bg-emerald-500";
}

function priorityToStatusDot(priority?: number): Task["statusDot"] {
    if (priority === 2) return "red";
    if (priority === 1) return "yellow";
    return "green";
}

function _priorityLabelOf(priority: number | null | undefined, t: (key: string) => string) {
    if (priority === 2) return t("high");
    if (priority === 1) return t("medium");
    return t("low");
}

function severityLabelOf(severity: number | null | undefined, t: (key: string) => string) {
    if (severity === 3) return t("critical");
    if (severity === 2) return t("major");
    if (severity === 1) return t("moderate");
    return t("minor");
}

function severityTone(severity: number | null | undefined) {
    const value = Number(severity);
    if (value === 3) return "border-rose-200 bg-rose-50 text-rose-700";
    if (value === 2) return "border-orange-200 bg-orange-50 text-orange-700";
    if (value === 1) return "border-sky-200 bg-sky-50 text-sky-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function canUseBackForwardCache() {
    if (typeof window === "undefined") return false;

    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return navigationEntry?.type === "back_forward";
}

export function GroupBoardShell({ rateLimitError = false }: { rateLimitError?: boolean }) {
    const tCommon = useTranslations("Common");
    const [showFallback, setShowFallback] = React.useState(false);

    React.useEffect(() => {
        if (!rateLimitError) return;

        sonnerToast.error(tCommon("rateLimit"), {
            id: "group-board-rate-limit",
            duration: 4000
        });

        setShowFallback(!canUseBackForwardCache());
    }, [rateLimitError, tCommon]);

    if (rateLimitError && showFallback) {
        return <ErrorDisplay message={tCommon("rateLimit")} />;
    }

    return <GroupBoardScreen />;
}

function detectPositionBase(cols: Column[]) {
    if (!cols.length) return 0;
    const positions = cols.map((c) => (Number.isFinite(c.position) ? c.position : 0)).filter((x) => Number.isFinite(x));
    const min = positions.length ? Math.min(...positions) : 0;
    return min >= 1 ? 1 : 0;
}

function assignPositions(cols: Column[], base: 0 | 1) {
    return cols.map((c, idx) => ({ ...c, position: base === 1 ? idx + 1 : idx }));
}

function nextPositionForCreate(cols: Column[], base: 0 | 1) {
    if (!cols.length) return base === 1 ? 1 : 0;
    const max = cols.reduce((m, c) => {
        const p = Number.isFinite(c.position) ? c.position : -1;
        return Math.max(m, p);
    }, -1);
    const next = max + 1;
    return base === 1 ? Math.max(1, next) : Math.max(0, next);
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

function asObject(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

const okByJsonStatus = (obj: unknown) => {
    const s = String(asObject(obj)?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: unknown, fallback: string) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    if (msg) return msg;
    const t = (text ?? "").toString().trim();
    return t || fallback;
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

function normalizeGroupRole(role: string | null | undefined) {
    const raw = String(role ?? "")
        .trim()
        .replace(/^['"]+|['"]+$/g, "")
        .toLowerCase();
    if (!raw) return null;

    // Gom nhiều biến thể role backend/localStorage về cùng một bộ giá trị chuẩn của board.
    if (raw.includes("owner") || raw === "admin") return "owner";
    if (raw.includes("moderator")) return "moderator";
    if (raw.includes("member")) return "member";
    if (raw.includes("commenter")) return "commenter";
    if (raw.includes("viewer")) return "viewer";

    return raw;
}

function canDeleteByRole(role: string | null | undefined) {
    const r = normalizeGroupRole(role);
    return r === "owner" || r === "moderator";
}

function canDeleteTaskByRole(role: string | null | undefined) {
    const r = normalizeGroupRole(role);
    return r === "owner" || r === "moderator" || r === "member";
}

async function apiFetchJson<T>(
    input: RequestInfo,
    init: RequestInit,
    messages: ApiMessages
): Promise<ApiResponse<T> | null> {
    const res = await fetch(input, init);
    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json, messages.genericApiError));
    }

    return (json ?? null) as ApiResponse<T> | null;
}

function parseDateString(value?: string) {
    if (!value) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return undefined;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (!(y && m && d)) return undefined;
    return new Date(y, m - 1, d);
}

function formatDueCompact(input: string, locale: string) {
    const s = String(input ?? "").trim();
    if (!s) return "";

    let date: Date | undefined;

    // Ưu tiên parse chuỗi dạng ngày thuần trước để tránh lệch múi giờ với các giá trị như "2026-04-14".
    const parsed = parseDateString(s);
    if (parsed) {
        date = parsed;
    } else {
        // Nếu không phải chuỗi ngày thuần, thử parse như ISO datetime rồi hiển thị theo giờ local.
        const isoDate = new Date(s);
        if (!Number.isNaN(isoDate.getTime())) {
            date = isoDate;
        }
    }

    if (!date) return s;

    const normalizedLocale = locale.includes("-") ? locale : locale === "vi" ? "vi-VN" : "en-US";
    return new Intl.DateTimeFormat(normalizedLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(date);
}

function formatDateTimeLocal(input: string, locale: string) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;

    const normalizedLocale = locale.includes("-") ? locale : locale === "vi" ? "vi-VN" : "en-US";
    return new Intl.DateTimeFormat(normalizedLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(d);
}

function formatDateOnlyGmt7(input: string) {
    const s = String(input ?? "").trim();
    if (!s) return "";

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(d);
}

function formatAssigneeName(
    input?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
    } | null
) {
    const first = String(input?.firstName ?? "").trim();
    const last = String(input?.lastName ?? "").trim();
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    const email = String(input?.email ?? "").trim();
    return email || null;
}

function mapGroupTaskToBoardTask(apiTask: GroupTaskItemResponse, locale: string): Task {
    const primaryAssignee = (apiTask.assignees ?? []).find((assignee) => !!assignee) ?? null;
    const assigneeName = formatAssigneeName(primaryAssignee);
    const assigneeAvatarUrl = String(primaryAssignee?.avatarUrl ?? "").trim() || null;
    const assigneeInitials = buildInitials(primaryAssignee?.firstName, primaryAssignee?.lastName, assigneeName);
    const dueRaw = apiTask.dueDate ? String(apiTask.dueDate) : "";
    const startRaw = apiTask.startDate ? String(apiTask.startDate) : "";
    const dueFmt = dueRaw ? formatDueCompact(dueRaw, locale) : "";
    const startFmt = startRaw ? formatDueCompact(startRaw, locale) : "";

    const rawTaskId = String(apiTask.taskId ?? "").trim();
    if (!rawTaskId) {
        console.error("[GroupBoardScreen] Missing taskId:", { apiTask });
    }

    const stableFallbackIdSource = [
        String(apiTask.taskTitle ?? ""),
        String(apiTask.createdAt ?? ""),
        String(apiTask.statusId ?? ""),
        String(apiTask.startDate ?? ""),
        String(apiTask.dueDate ?? "")
    ]
        .join("|")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const task: Task = {
        id: rawTaskId || `task_fallback_${stableFallbackIdSource || "unknown"}`,
        title: String(apiTask.taskTitle ?? ""),
        description: apiTask.taskDescription ?? null,
        statusDot: priorityToStatusDot(apiTask.taskPriority),
        assigneeId: String(primaryAssignee?.id ?? "").trim() || null,
        assigneeName,
        assigneeAvatarUrl,
        assigneeInitials,
        statusName: apiTask.statusName ?? null,
        priority: apiTask.taskPriority ?? null,
        severity: apiTask.taskSeverity ?? null,
        progress: Number.isFinite(apiTask.progress as number) ? Number(apiTask.progress) : 0,
        position: apiTask.position,
        completedAt: apiTask.completedAt ?? undefined
    };

    if (startFmt) task.start = startFmt;
    if (startRaw) task.startRaw = startRaw;
    if (dueFmt) task.due = dueFmt;
    if (dueRaw) task.dueRaw = dueRaw;

    return task;
}

function isOverdue(raw?: string) {
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
}

function isTaskDone(task?: Pick<Task, "progress"> | null) {
    return Number(task?.progress ?? 0) >= 100;
}

function isTaskInProgress(task?: Pick<Task, "progress"> | null) {
    const progress = Number(task?.progress ?? 0);
    return progress > 0 && progress < 100;
}

function isTaskUnassigned(task?: Pick<Task, "assigneeId" | "assigneeName"> | null) {
    const assigneeId = String(task?.assigneeId ?? "").trim();
    const assigneeName = String(task?.assigneeName ?? "").trim();
    return !(assigneeId || assigneeName);
}

function buildInitials(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
    const first = String(firstName ?? "").trim();
    const last = String(lastName ?? "").trim();
    const fromNames = `${first.charAt(0)}${last.charAt(0)}`.trim();
    if (fromNames) return fromNames.toUpperCase();

    const safeFallback = String(fallback ?? "").trim();
    if (!safeFallback) return "U";

    return safeFallback
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function classifyDueDate(task: Pick<Task, "dueRaw" | "progress">): Set<DueDateFilterKey> {
    const matches = new Set<DueDateFilterKey>();
    const rawDue = String(task.dueRaw ?? "").trim();

    if (!rawDue) {
        matches.add("noDates");
        return matches;
    }

    const due = new Date(rawDue);
    if (Number.isNaN(due.getTime())) return matches;

    const now = new Date();
    const startToday = startOfDay(now);
    const endTomorrow = new Date(startToday);
    endTomorrow.setDate(endTomorrow.getDate() + 1);

    const endNextWeek = new Date(startToday);
    endNextWeek.setDate(endNextWeek.getDate() + 7);

    const endNextMonth = new Date(startToday);
    endNextMonth.setMonth(endNextMonth.getMonth() + 1);

    if (due.getTime() < now.getTime() && !isTaskDone(task)) {
        matches.add("overdue");
    }

    if (due.getTime() >= startToday.getTime() && due.getTime() <= endTomorrow.getTime()) {
        matches.add("nextDay");
    }

    if (due.getTime() >= startToday.getTime() && due.getTime() <= endNextWeek.getTime()) {
        matches.add("nextWeek");
    }

    if (due.getTime() >= startToday.getTime() && due.getTime() <= endNextMonth.getTime()) {
        matches.add("nextMonth");
    }

    return matches;
}

function toggleArrayValue<T>(items: T[], value: T) {
    return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

async function apiGetGroupDetail(groupId: string, messages: ApiMessages) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error(messages.missingApiBase);
    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/detail`);

    return apiFetchJson<GroupDetailResponse>(
        url,
        {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            cache: "no-store"
        },
        messages
    );
}

async function apiGetGroupMembers(groupId: string, messages: ApiMessages) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error(messages.missingApiBase);
    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);

    const response = await apiFetchJson<GroupMemberListResponse>(
        url,
        {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            cache: "no-store"
        },
        messages
    );

    return response;
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

    // Bộ lọc của board được chuyển toàn bộ thành query string trước khi gọi API danh sách task.
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
    if (args.sortBy) query.set("sortBy", args.sortBy);
    query.set("sortAscending", String(Boolean(args.sortAscending)));
    query.set("page", String(args.page ?? 1));
    query.set("pageSize", String(args.pageSize ?? 20));

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

async function apiGetAllGroupTasks(args: {
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
    sortBy?: string;
    sortAscending?: boolean;
    fallbackMessage: string;
    missingApiBaseMessage: string;
}) {
    // Khi cần toàn bộ task, hàm này sẽ tự gom dữ liệu từ tất cả các trang về một mảng duy nhất.
    const requestArgs = {
        groupId: args.groupId,
        search: args.search,
        statusId: args.statusId,
        assigneeId: args.assigneeId,
        priority: args.priority,
        severity: args.severity,
        startDateFrom: args.startDateFrom,
        startDateTo: args.startDateTo,
        dueDateFrom: args.dueDateFrom,
        dueDateTo: args.dueDateTo,
        statusCategory: args.statusCategory,
        hasNoAssignee: args.hasNoAssignee,
        hasNoDueDate: args.hasNoDueDate,
        sortBy: args.sortBy,
        sortAscending: args.sortAscending,
        fallbackMessage: args.fallbackMessage,
        missingApiBaseMessage: args.missingApiBaseMessage
    };

    const firstPage = await apiGetGroupTasks({
        ...requestArgs,
        page: 1,
        pageSize: 20
    });
    const firstData = firstPage?.data;
    const totalPages = Math.max(1, Number(firstData?.totalPages ?? 1));
    const items = [...(firstData?.items ?? [])];

    if (totalPages > 1) {
        const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
                apiGetGroupTasks({
                    ...requestArgs,
                    page: index + 2,
                    pageSize: 100
                })
            )
        );

        remainingPages.forEach((pageResult) => {
            items.push(...(pageResult?.data?.items ?? []));
        });
    }

    return {
        ...(firstPage ?? {}),
        data: firstData
            ? {
                ...firstData,
                items,
                page: 1,
                pageSize: items.length,
                totalPages: Math.max(1, Math.ceil(items.length / 100))
            }
            : undefined
    } as ApiResponse<GroupTaskListResponse> | null;
}

async function apiReorderGroupTaskStatus(
    args: {
        groupId: string;
        statusId: string;
        prevStatusId: string | null;
        nextStatusId: string | null;
    },
    messages: ApiMessages
) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.groupId)}/reorder`);

    // API reorder cột dựa trên phần tử đứng trước và đứng sau thay vì index tuyệt đối.
    await apiFetchJson<unknown>(
        url,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
                statusId: args.statusId,
                prevStatusId: args.prevStatusId,
                nextStatusId: args.nextStatusId
            })
        },
        messages
    );

    return true;
}

async function apiReorderTask(
    args: {
        groupId: string;
        taskId: string;
        targetStatusId: string;
        prevTaskId: string | null;
        nextTaskId: string | null;
    },
    messages: ApiMessages
) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error(messages.invalidTaskId);
    if (!(args.targetStatusId && isUuidLike(args.targetStatusId))) throw new Error(messages.invalidStatusId);

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/reorder`);

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
            taskId: args.taskId,
            targetStatusId: args.targetStatusId,
            prevTaskId: args.prevTaskId,
            nextTaskId: args.nextTaskId
        })
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);
    const okJson = !json || okByJsonStatus(json);

    if (!(res.ok && okJson)) throw new Error(extractApiMessage(raw, json, messages.genericApiError));
    return true;
}

async function apiCreateGroupTaskStatus(
    args: { groupId: string; statusName: string; position: number },
    messages: ApiMessages
) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();
    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.groupId)}`);
    const payload = {
        statusName: String(args.statusName ?? "").trim(),
        position: Number.isFinite(args.position) ? Math.max(0, Math.trunc(args.position)) : 0
    };

    if (!payload.statusName) throw new Error(messages.enterStatusName);

    const res = await apiFetchJson<GroupTaskStatusData>(
        url,
        {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify(payload)
        },
        messages
    );

    return (res ?? null) as ApiResponse<GroupTaskStatusData> | null;
}

function toIsoOrNull(input: unknown): string | null {
    if (input == null) return null;

    if (typeof input === "string") {
        const s = input.trim();
        if (!s) return null;
        if (s.toLowerCase() === "invalid date") return null;

        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return null;

        return d.toISOString();
    }

    if (input instanceof Date) {
        if (Number.isNaN(input.getTime())) return null;
        return input.toISOString();
    }

    return null;
}

async function apiCreateTask(
    args: {
        groupId: string;
        groupStatusId: string;
        taskName: string;
        assigneeId?: string | null;
        dueDate?: unknown;
        startDate?: unknown;
        dueDateSelected?: boolean;
        startDateSelected?: boolean;
        estimatedHours?: number;
        actualHours?: number;
        priority?: string | components["schemas"]["TaskPriority"];
        severity?: string | components["schemas"]["TaskSeverity"];
    },
    messages: ApiMessages
) {
    const apiBase = getApiBase();
    const accessToken = getAccessTokenOrNull();

    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);
    if (!(args.groupStatusId && isUuidLike(args.groupStatusId))) throw new Error(messages.invalidStatusId);

    const url = apiUrl("/Task");

    const payload: components["schemas"]["TaskItemGroupRequest"] = {
        groupId: args.groupId,
        groupStatusId: args.groupStatusId,
        taskName: String(args.taskName ?? "").trim()
    };

    if (args.assigneeId && isUuidLike(args.assigneeId)) {
        payload.assignees = args.assigneeId;
    }

    const dueIso = toIsoOrNull(args.dueDate);
    const startIso = toIsoOrNull(args.startDate);

    if (args.startDateSelected === true && startIso) payload.startDate = startIso;
    if (args.dueDateSelected === true && dueIso) payload.dueDate = dueIso;
    if (args.estimatedHours != null && args.estimatedHours > 0) payload.estimatedHours = args.estimatedHours;
    if (args.actualHours != null && args.actualHours > 0) payload.actualHours = args.actualHours;

    if (typeof args.priority === "number") {
        payload.taskPriority = args.priority;
    } else if (typeof args.priority === "string" && args.priority in PRIORITY_MAP) {
        payload.taskPriority = PRIORITY_MAP[args.priority];
    }

    if (typeof args.severity === "number") {
        payload.taskSeverity = args.severity;
    } else if (typeof args.severity === "string" && args.severity in SEVERITY_MAP) {
        payload.taskSeverity = SEVERITY_MAP[args.severity];
    }

    return apiFetchJson<TaskItemResponse>(
        url,
        {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify(payload)
        },
        messages
    );
}

async function apiDeleteTask(args: { groupId: string; taskId: string }, messages: ApiMessages) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();

    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);
    if (!(args.taskId && isUuidLike(args.taskId))) throw new Error(messages.invalidTaskId);

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}`);

    await apiFetchJson<unknown>(
        url,
        {
            method: "DELETE",
            headers: {
                Accept: "text/plain, application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        },
        messages
    );

    return true;
}

async function apiRenameGroupTaskStatus(
    args: {
        groupId: string;
        statusId: string;
        statusName: string;
        position: number;
    },
    messages: ApiMessages
) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);
    if (!(args.statusId && isUuidLike(args.statusId))) throw new Error(messages.invalidStatusId);

    const url = apiUrl(`/GroupTaskStatus/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.statusId)}`);

    await apiFetchJson<unknown>(
        url,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                position: Number.isFinite(args.position) ? Math.max(0, Math.trunc(args.position)) : 0,
                statusName: String(args.statusName ?? "").trim()
            })
        },
        messages
    );

    return true;
}

async function apiDeleteGroupTaskStatus(args: { groupId: string; statusId: string }, messages: ApiMessages) {
    const apiBase = getApiBase();
    const token = getAccessTokenOrNull();
    if (!apiBase) throw new Error(messages.missingApiBase);
    if (!(args.groupId && isUuidLike(args.groupId))) throw new Error(messages.invalidGroupId);
    if (!(args.statusId && isUuidLike(args.statusId))) throw new Error(messages.invalidStatusId);

    const url = apiUrl(
        `/GroupTaskStatus/${encodeURIComponent(args.statusId)}/group/${encodeURIComponent(args.groupId)}`
    );

    await apiFetchJson<unknown>(
        url,
        {
            method: "DELETE",
            credentials: "include",
            headers: {
                Accept: "text/plain, application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        },
        messages
    );

    return true;
}

const DROP_PREFIX = "drop:";
const END_PREFIX = "drop-end:";

function findColumnOfTask(board: Record<ColumnId, Task[]>, columns: Column[], taskId: string): ColumnId | null {
    for (const col of columns) {
        if ((board[col.id] ?? []).some((task) => task.id === taskId)) return col.id;
    }
    return null;
}

function findTask(board: Record<ColumnId, Task[]>, columns: Column[], taskId: string): Task | null {
    for (const col of columns) {
        const task = (board[col.id] ?? []).find((x) => x.id === taskId);
        if (task) return task;
    }
    return null;
}

function applyTaskDrop(args: {
    board: Record<ColumnId, Task[]>;
    columns: Column[];
    activeTaskId: string;
    overRaw: string;
}) {
    const { board, columns, activeTaskId, overRaw } = args;

    const overIsEnd = overRaw.startsWith(END_PREFIX);
    const overKey = overRaw.startsWith(DROP_PREFIX)
        ? overRaw.replace(DROP_PREFIX, "")
        : overRaw.startsWith(END_PREFIX)
            ? overRaw.replace(END_PREFIX, "")
            : overRaw;

    const fromCol = findColumnOfTask(board, columns, activeTaskId);
    if (!fromCol) return null;

    let toCol: ColumnId | null = null;
    if (columns.some((c) => c.id === overKey)) toCol = overKey;
    else toCol = findColumnOfTask(board, columns, overKey) ?? null;
    if (!toCol) return null;

    const fromTasks = [...(board[fromCol] ?? [])];
    const toTasks = fromCol === toCol ? fromTasks : [...(board[toCol] ?? [])];

    const fromIndex = fromTasks.findIndex((task) => task.id === activeTaskId);
    if (fromIndex === -1) return null;

    const [moving] = fromTasks.splice(fromIndex, 1);

    if (fromCol === toCol) {
        if (overIsEnd) {
            fromTasks.push(moving);
        } else {
            const toIndex = fromTasks.findIndex((t) => t.id === overKey);
            if (toIndex === -1) fromTasks.unshift(moving);
            else fromTasks.splice(Math.max(0, toIndex), 0, moving);
        }

        const newIndex = fromTasks.findIndex((t) => t.id === activeTaskId);
        const prevTaskId = newIndex > 0 ? fromTasks[newIndex - 1].id : null;
        const nextTaskId = newIndex >= 0 && newIndex < fromTasks.length - 1 ? fromTasks[newIndex + 1].id : null;

        return { nextBoard: { ...board, [fromCol]: fromTasks }, fromCol, toCol, prevTaskId, nextTaskId };
    }

    if (overIsEnd) {
        toTasks.push(moving);
    } else {
        const idx = toTasks.findIndex((t) => t.id === overKey);
        if (idx !== -1) toTasks.splice(Math.max(0, idx), 0, moving);
        else toTasks.unshift(moving);
    }

    const newIndex = toTasks.findIndex((t) => t.id === activeTaskId);
    const prevTaskId = newIndex > 0 ? toTasks[newIndex - 1].id : null;
    const nextTaskId = newIndex >= 0 && newIndex < toTasks.length - 1 ? toTasks[newIndex + 1].id : null;

    return { nextBoard: { ...board, [fromCol]: fromTasks, [toCol]: toTasks }, fromCol, toCol, prevTaskId, nextTaskId };
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5",
                "border border-zinc-200 bg-white",
                "font-semibold text-[10.5px] text-zinc-700"
            )}>
            {children}
        </span>
    );
}

function DonePill({ completedAt }: { completedAt?: string | null }) {
    const t = useTranslations("GroupBoardScreen");
    const formattedDate = completedAt ? formatDateOnlyGmt7(completedAt) : null;

    return (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {formattedDate ?? t("done")}
        </span>
    );
}

function shouldShowProgress(task?: Pick<Task, "progress"> | null) {
    const p = Number(task?.progress ?? 0);
    return p > 0 && p < 100;
}

function ProgressPill({ progress }: { progress: number }) {
    return (
        <span className="inline-flex h-7 items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 text-xs">
            {progress}%
        </span>
    );
}

function DuePill({
    due,
    overdue,
    done,
    assigneeAvatarUrl,
    assigneeInitials,
    showAssigneeAvatar
}: {
    due?: string | null;
    overdue: boolean;
    done?: boolean;
    assigneeAvatarUrl?: string | null;
    assigneeInitials?: string | null;
    showAssigneeAvatar?: boolean;
}) {
    const t = useTranslations("GroupBoardScreen");
    const shouldShowDueText = Boolean(due) && !done;

    return (
        <div
            className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-2",
                done ? "text-zinc-700" : overdue ? "text-rose-700" : "text-zinc-700"
            )}>
            <div className="flex min-w-0 items-center gap-2 leading-none">
                {showAssigneeAvatar ? (
                    <AssigneeAvatar
                        avatarUrl={assigneeAvatarUrl}
                        initials={assigneeInitials}
                        size={24}
                        className="text-[10px]"
                    />
                ) : null}
                {due ? (
                    <div className="border- flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border bg-blue-50 px-1.5 py-0.5 font-semibold text-xs">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                            width={16}
                            height={16}
                            fill="currentColor"
                            className="inline-block">
                            <path d="M466.6 114.2C461.2 115.9 455.3 116 450.4 113.3C444.6 110.1 438.6 107.1 432.6 104.4C422.2 99.7 418.9 86.1 428.5 79.8C443.5 69.9 461.5 64.1 480.8 64.1C533.4 64.1 576 106.7 576 159.3C576 172.5 573.3 185.1 568.4 196.6C563.9 207.1 550 206.4 543.5 197C539.7 191.5 535.7 186.2 531.5 181C528 176.6 527 170.8 527.7 165.2C527.9 163.3 528.1 161.3 528.1 159.3C528.1 133.2 506.9 112.1 480.9 112.1C476 112.1 471.2 112.9 466.7 114.3zM96.5 196.9C90 206.3 76 207 71.6 196.5C66.7 185 64 172.4 64 159.2C64 106.6 106.6 64 159.2 64C178.5 64 196.5 69.8 211.5 79.7C221.1 86 217.8 99.6 207.4 104.3C201.3 107.1 195.4 110 189.6 113.2C184.7 115.9 178.7 115.8 173.4 114.1C168.9 112.7 164.2 111.9 159.2 111.9C133.1 111.9 112 133.1 112 159.1C112 161.1 112.1 163.1 112.4 165C113.1 170.6 112.1 176.4 108.6 180.8C104.4 186 100.4 191.3 96.6 196.8zM496 352C496 254.8 417.2 176 320 176C222.8 176 144 254.8 144 352C144 449.2 222.8 528 320 528C417.2 528 496 449.2 496 352zM460.5 526.5C422.1 557.4 373.2 576 320 576C266.8 576 217.9 557.4 179.5 526.5L137 569C127.6 578.4 112.4 578.4 103.1 569C93.8 559.6 93.7 544.4 103.1 535.1L145.6 492.6C114.6 454.1 96 405.2 96 352C96 228.3 196.3 128 320 128C443.7 128 544 228.3 544 352C544 405.2 525.4 454.1 494.5 492.5L537 535C546.4 544.4 546.4 559.6 537 568.9C527.6 578.2 512.4 578.3 503.1 568.9L460.6 526.4zM344 248L344 342.1L385 383.1C394.4 392.5 394.4 407.7 385 417C375.6 426.3 360.4 426.4 351.1 417L303.1 369C298.6 364.5 296.1 358.4 296.1 352L296.1 248C296.1 234.7 306.8 224 320.1 224C333.4 224 344.1 234.7 344.1 248z" />
                        </svg>
                        {due}
                    </div>
                ) : null}
            </div>
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
    hideCancel?: boolean;
};

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    hideCancel = false
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

    return createPortal(
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
                    {!hideCancel ? (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-sm text-zinc-700 transition hover:bg-zinc-100">
                            {cancelLabel}
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-xl bg-orange-600 px-4 py-2 font-semibold text-sm text-white transition hover:bg-orange-700">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function PortalDropdown({
    open,
    onClose,
    anchorRef,
    children,
    width = 208
}: {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    width?: number;
}) {
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = React.useState(false);
    const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 208 });

    React.useEffect(() => setMounted(true), []);

    const syncPos = React.useCallback(() => {
        const a = anchorRef.current;
        if (!a) return;
        const r = a.getBoundingClientRect();
        const top = r.bottom + 8;
        const left = Math.max(8, r.right - width);
        setPos({ top, left, width });
    }, [anchorRef, width]);

    React.useEffect(() => {
        if (!open) return;
        syncPos();
        const onScroll = () => syncPos();
        const onResize = () => syncPos();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [open, syncPos]);

    React.useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            const a = anchorRef.current;
            const m = menuRef.current;
            const t = e.target as Node | null;
            if (!t) return;
            if (m?.contains(t)) return;
            if (a?.contains(t)) return;
            onClose();
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose, anchorRef]);

    if (!(open && mounted)) return null;

    return createPortal(
        <div
            ref={menuRef}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[9999] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
            {children}
        </div>,
        document.body
    );
}

function MenuItem({
    icon,
    label,
    danger,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                danger ? "text-orange-700 hover:bg-orange-50" : "text-zinc-700 hover:bg-zinc-100"
            )}>
            <span className="grid h-5 w-5 place-items-center">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}

function FilterCheckbox({
    checked,
    label,
    hint,
    icon,
    onChange
}: {
    checked: boolean;
    label: string;
    hint?: string;
    icon?: React.ReactNode;
    onChange: () => void;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-zinc-50">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="h-4 w-4 shrink-0 rounded border-zinc-300 text-orange-600 focus:ring-orange-200"
            />
            {icon ? <span className="shrink-0">{icon}</span> : null}
            <span className="min-w-0">
                <span className="block font-medium text-sm text-zinc-800">{label}</span>
                {hint ? <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span> : null}
            </span>
        </label>
    );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h3 className="font-semibold text-sm text-zinc-900">{title}</h3>
            <div className="space-y-1">{children}</div>
        </section>
    );
}

function FilterBarsIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className={className}>
            <path d="M4 7h16" />
            <path d="M7 12h10" />
            <path d="M10 17h4" />
        </svg>
    );
}

function UserOutlineIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}>
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

function DueDateIcon({ tone, children }: { tone: "neutral" | "red" | "yellow" | "gray"; children: React.ReactNode }) {
    const toneClass =
        tone === "red"
            ? "bg-[#D64532] text-white"
            : tone === "yellow"
                ? "bg-[#FFC21A] text-white"
                : "bg-[#F3F4F6] text-zinc-500";

    return (
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", toneClass)}>
            {children}
        </span>
    );
}

function LabelToneDot({
    tone
}: {
    tone:
    | "priority-high"
    | "priority-medium"
    | "priority-low"
    | "severity-critical"
    | "severity-major"
    | "severity-moderate"
    | "severity-minor";
}) {
    const toneClass =
        tone === "priority-high"
            ? "bg-rose-500"
            : tone === "priority-medium"
                ? "bg-amber-500"
                : tone === "priority-low"
                    ? "bg-emerald-500"
                    : tone === "severity-critical"
                        ? "bg-rose-600"
                        : tone === "severity-major"
                            ? "bg-orange-500"
                            : tone === "severity-moderate"
                                ? "bg-sky-500"
                                : "bg-emerald-500";

    return <span className={cn("inline-flex h-3 w-3 rounded-full", toneClass)} />;
}

function useAutosizeTextarea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
    }, [ref, value]);
}

type TaskCardProps = {
    task: Task;
    columnId: ColumnId;
    isEditing: boolean;
    draftTitle: string;
    onDraftChange: (v: string) => void;
    onOpenDetail: () => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onCommitEdit: () => void;
    onDelete: () => void;
    canEditTask?: boolean;
    canDeleteTask?: boolean;
};

function TaskCard({
    task,
    columnId,
    isEditing,
    draftTitle,
    onDraftChange,
    onOpenDetail,
    onStartEdit,
    onCancelEdit,
    onCommitEdit,
    onDelete,
    canEditTask = true,
    canDeleteTask = true
}: TaskCardProps) {
    const t = useTranslations("GroupBoardScreen");
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none"
    };

    const [openMenu, setOpenMenu] = React.useState(false);
    const btnRef = React.useRef<HTMLButtonElement | null>(null);

    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    useAutosizeTextarea(taRef, draftTitle);

    const clickingActionRef = React.useRef(false);
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const severityLabel = task.severity != null ? severityLabelOf(task.severity, t) : null;

    React.useEffect(() => {
        if (isEditing) {
            setTimeout(() => {
                taRef.current?.focus();
                taRef.current?.setSelectionRange(draftTitle.length, draftTitle.length);
            }, 0);
        }
    }, [isEditing, draftTitle.length]);

    const safeCommit = React.useCallback(() => {
        if (!draftTitle.trim()) {
            onCancelEdit();
            return;
        }
        onCommitEdit();
    }, [draftTitle, onCommitEdit, onCancelEdit]);

    const overdue = task.dueRaw ? isOverdue(task.dueRaw) : false;

    const handleOpenDetail = React.useCallback(() => {
        if (isEditing) return;
        onOpenDetail();
    }, [isEditing, onOpenDetail]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                if (isEditing) return;
                e.preventDefault();
                handleOpenDetail();
            }}
            onKeyDown={(e) => {
                if (isEditing) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenDetail();
                }
            }}
            className={cn(
                "group relative w-full select-none rounded-xl p-3",
                "cursor-grab border border-black/5 shadow-[0_1px_1px_rgba(9,30,66,0.08),0_0_0_1px_rgba(9,30,66,0.04)]",
                "transition focus-within:ring-2 focus-within:ring-blue-200/60 active:cursor-grabbing",
                done
                    ? "bg-zinc-50 hover:bg-zinc-100/90 hover:shadow-[0_2px_6px_rgba(9,30,66,0.10),0_0_0_1px_rgba(9,30,66,0.04)]"
                    : "bg-white hover:bg-white hover:shadow-[0_4px_8px_rgba(9,30,66,0.16),0_0_0_1px_rgba(9,30,66,0.04)]"
            )}>
            <div className="min-w-0">
                {!isEditing ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                                <div
                                    className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dotClass(task.statusDot))}
                                />
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                    <p
                                        className={cn(
                                            "line-clamp-2 min-w-0 flex-1 pr-1 font-medium text-sm leading-snug tracking-tight",
                                            done ? "text-zinc-500 line-through" : "text-zinc-900"
                                        )}>
                                        {task.title}
                                    </p>
                                </div>
                            </div>
                            {canEditTask || canDeleteTask ? (
                                <div className="relative shrink-0">
                                    <button
                                        ref={btnRef}
                                        type="button"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenMenu((v) => !v);
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.detail === 0) {
                                                setOpenMenu((v) => !v);
                                            }
                                        }}
                                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                                        aria-label={t("menu")}>
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>

                                    <PortalDropdown
                                        open={openMenu}
                                        onClose={() => setOpenMenu(false)}
                                        anchorRef={btnRef}>
                                        {canEditTask ? (
                                            <MenuItem
                                                icon={<Pencil className="h-4 w-4" />}
                                                label={t("editName")}
                                                onClick={() => {
                                                    setOpenMenu(false);
                                                    onStartEdit();
                                                }}
                                            />
                                        ) : null}
                                        {canDeleteTask ? (
                                            <MenuItem
                                                icon={<Trash2 className="h-4 w-4" />}
                                                label={t("delete")}
                                                danger
                                                onClick={() => {
                                                    setOpenMenu(false);
                                                    onDelete();
                                                }}
                                            />
                                        ) : null}
                                    </PortalDropdown>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {task.due || !isTaskUnassigned(task) ? (
                                <DuePill
                                    due={task.due}
                                    overdue={overdue}
                                    done={done}
                                    assigneeAvatarUrl={task.assigneeAvatarUrl}
                                    assigneeInitials={task.assigneeInitials}
                                    showAssigneeAvatar={!isTaskUnassigned(task)}
                                />
                            ) : null}
                            {severityLabel ? (
                                <span
                                    className={cn(
                                        "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 py-1 font-semibold text-xs",
                                        done ? "border-zinc-200 bg-zinc-100 text-zinc-500" : severityTone(task.severity)
                                    )}>
                                    {severityLabel}
                                </span>
                            ) : null}
                            {showProgress ? <ProgressPill progress={Number(task.progress ?? 0)} /> : null}
                            {done ? <DonePill completedAt={task.completedAt} /> : null}
                            {task.estimatedHours != null ? (
                                <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 text-xs">
                                    {task.estimatedHours}
                                    {t("estimatedHours")}
                                </span>
                            ) : null}
                            {task.actualHours != null ? (
                                <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-semibold text-green-700 text-xs">
                                    {task.actualHours}
                                    {t("actualHours")}
                                </span>
                            ) : null}
                        </div>
                    </>
                ) : (
                    <div
                        className="space-y-2"
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}>
                        <textarea
                            ref={taRef}
                            value={draftTitle}
                            onChange={(e) => onDraftChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    safeCommit();
                                }
                                if (e.key === "Escape") {
                                    e.preventDefault();
                                    onCancelEdit();
                                }
                            }}
                            onBlur={() => {
                                setTimeout(() => {
                                    if (clickingActionRef.current) {
                                        clickingActionRef.current = false;
                                        return;
                                    }
                                    safeCommit();
                                }, 0);
                            }}
                            rows={1}
                            className={cn(
                                "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2",
                                "select-text font-semibold text-sm text-zinc-900 outline-none",
                                "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                            )}
                        />

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onPointerDown={() => (clickingActionRef.current = true)}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    safeCommit();
                                }}
                                className="rounded-lg bg-[#f54a00] px-3 py-2 font-semibold text-sm text-white hover:bg-[#f54a00]/70">
                                {t("save")}
                            </button>

                            <button
                                type="button"
                                onPointerDown={() => (clickingActionRef.current = true)}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onCancelEdit();
                                }}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                                aria-label={t("cancel")}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function GhostTaskCard({ task }: { task: Task }) {
    const t = useTranslations("GroupBoardScreen");
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const overdue = task.dueRaw ? isOverdue(task.dueRaw) : false;
    const severityLabel = task.severity != null ? severityLabelOf(task.severity, t) : null;

    return (
        <div className={cn("rounded-xl border-2 border-blue-300 border-dashed bg-blue-50/70 p-3")}>
            <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-2">
                    <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dotClass(task.statusDot))} />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <p
                            className={cn(
                                "line-clamp-2 min-w-0 flex-1 font-medium text-sm leading-snug tracking-tight",
                                done ? "text-zinc-500 line-through" : "text-zinc-800"
                            )}>
                            {task.title}
                        </p>
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {task.due || !isTaskUnassigned(task) ? (
                        <DuePill
                            due={task.due}
                            overdue={overdue}
                            done={done}
                            assigneeAvatarUrl={task.assigneeAvatarUrl}
                            assigneeInitials={task.assigneeInitials}
                            showAssigneeAvatar={!isTaskUnassigned(task)}
                        />
                    ) : null}
                    {severityLabel ? (
                        <span
                            className={cn(
                                "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 py-1 font-semibold text-xs",
                                done ? "border-zinc-200 bg-zinc-100 text-zinc-500" : severityTone(task.severity)
                            )}>
                            {severityLabel}
                        </span>
                    ) : null}
                    {showProgress ? <ProgressPill progress={Number(task.progress ?? 0)} /> : null}
                    {done ? <DonePill completedAt={task.completedAt} /> : null}
                    {task.estimatedHours != null ? (
                        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 text-xs">
                            {task.estimatedHours}
                            {t("estimatedHours")}
                        </span>
                    ) : null}
                    {task.actualHours != null ? (
                        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-semibold text-green-700 text-xs">
                            {task.actualHours}
                            {t("actualHours")}
                        </span>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

type HeaderDragProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners"> & {
    setActivatorNodeRef?: (node: HTMLElement | null) => void;
};

function filterDroppablesByType(droppables: DroppableContainer[], allow: string[]) {
    return droppables.filter((d) => {
        const t = d.data?.current?.type;
        return typeof t === "string" && allow.includes(t);
    });
}

function AddColumnInline({
    isSubmitting,
    onSubmit
}: {
    isSubmitting: boolean;
    onSubmit: (title: string) => Promise<void>;
}) {
    const t = useTranslations("GroupBoardScreen");
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (open) {
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    const close = () => {
        setOpen(false);
        setTitle("");
        setError(null);
    };

    const submit = async () => {
        const trimmed = title.trim().slice(0, 30);

        if (!trimmed) {
            setError(t("enterStatusName"));
            inputRef.current?.focus();
            return;
        }

        try {
            setError(null);
            await onSubmit(trimmed);
            close();
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : "";
            setError(errorMsg || t("createStatusFailed"));
            inputRef.current?.focus();
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void submit();
        }
        if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    "w-full rounded-xl border-2 border-zinc-300 border-dashed bg-white/40 px-4 py-3 text-left font-semibold text-sm text-zinc-700 backdrop-blur-sm",
                    "transition hover:border-zinc-400 hover:bg-white/60"
                )}>
                + {t("createStatus")}
            </button>
        );
    }

    return (
        <div className="rounded-xl border border-zinc-200/60 bg-white p-3 backdrop-blur-sm">
            <input
                ref={inputRef}
                value={title}
                maxLength={30}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                onKeyDown={onKeyDown}
                disabled={isSubmitting}
                placeholder={t("statusNamePlaceholder")}
                className={cn(
                    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none",
                    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                    "select-text"
                )}
            />

            <div className="mt-1 text-right text-[11px] text-zinc-500">{title.length}/30</div>

            {error ? <div className="mt-2 font-medium text-rose-600 text-xs">{error}</div> : null}

            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={isSubmitting}
                    className={cn(
                        "rounded-xl px-3 py-2 font-semibold text-sm text-white",
                        "bg-[#f54a00] transition hover:bg-[#f54a00]/80",
                        isSubmitting && "pointer-events-none opacity-60"
                    )}>
                    {t("addStatus")}
                </button>

                <button
                    type="button"
                    onClick={close}
                    disabled={isSubmitting}
                    className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700",
                        "transition hover:bg-zinc-100",
                        isSubmitting && "pointer-events-none opacity-60"
                    )}>
                    ✕
                </button>
            </div>
        </div>
    );
}

function AddTaskButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
    const t = useTranslations("GroupBoardScreen");
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-zinc-300 border-dashed bg-white/40 px-3 py-2 font-semibold text-sm text-zinc-600 backdrop-blur-sm",
                "transition hover:border-zinc-400 hover:bg-white/60",
                disabled && "pointer-events-none opacity-40"
            )}>
            <Plus className="h-4 w-4" />
            {t("addTask")}
        </button>
    );
}

function LoadMoreTrigger({ statusId, onLoadMore, isLoading }: { statusId?: string; onLoadMore?: (statusId: string) => void; isLoading?: boolean }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const triggeredRef = React.useRef(false);
    const hasUserScrolledRef = React.useRef(false);
    const lastScrollTopRef = React.useRef(0);

    React.useEffect(() => {
        const scrollEl = ref.current?.parentElement as HTMLElement | null;
        if (!scrollEl || !statusId || !onLoadMore) return;

        // Khi một lượt tải hoàn tất, cho phép trigger infinite scroll được kích hoạt lại.
        if (!isLoading) {
            triggeredRef.current = false;
        }

        const tryLoadMore = () => {
            if (triggeredRef.current || isLoading || !hasUserScrolledRef.current) return;

            const { scrollTop, clientHeight, scrollHeight } = scrollEl;
            const reachedBottom = scrollTop + clientHeight >= scrollHeight - 2;

            if (reachedBottom) {
                triggeredRef.current = true;
                onLoadMore(statusId);
            }
        };

        const handleScroll = () => {
            const currentTop = scrollEl.scrollTop;

            if (currentTop > 0) {
                hasUserScrolledRef.current = true;
            }

            // Chỉ thử tải thêm khi người dùng đang cuộn xuống để tránh bắn request không cần thiết.
            if (currentTop >= lastScrollTopRef.current) {
                tryLoadMore();
            }

            lastScrollTopRef.current = currentTop;
        };

        scrollEl.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            scrollEl.removeEventListener("scroll", handleScroll);
        };
    }, [statusId, onLoadMore, isLoading]);

    // Phần tử mốc vô hình nằm cuối danh sách để theo dõi thời điểm cần tải thêm.
    return <div ref={ref} className="h-px" />;
}

function LoadMoreLoading() {
    const t = useTranslations("GroupBoardScreen");

    return (
        <div className="rounded-xl border border-zinc-200/80 bg-white/80 p-3">
            <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                <span className="font-medium">{t("loading")}</span>
            </div>

            <div className="mt-3 space-y-2">
                <div className="h-2 w-full animate-pulse rounded-full bg-zinc-200" />
                <div className="h-2 w-4/5 animate-pulse rounded-full bg-zinc-200 [animation-delay:120ms]" />
                <div className="h-2 w-2/3 animate-pulse rounded-full bg-zinc-200 [animation-delay:240ms]" />
            </div>
        </div>
    );
}

function ColumnView({
    col,
    tasks,
    taskIds,
    statusId,
    isTasksLoaded,
    isTasksLoading,
    taskLoadError,
    onRetryLoadTasks,
    onOpenCreateTask,
    onOpenTaskDetail,
    dndEnabled,
    headerDragProps,
    ghost,
    creatingTask,
    onRenameColumnInline,
    onDeleteColumn,
    taskEditState,
    onTaskStartEdit,
    onTaskCancelEdit,
    onTaskDraftChange,
    onTaskCommitEdit,
    onDeleteTask,
    isColumnEditing,
    columnDraft,
    columnError,
    onColumnDraftChange,
    onColumnCommit,
    onColumnCancel,
    canEditTask,
    canEditStatus,
    canDeleteStatus,
    canDeleteTask,
    canAddTask,
    isLoadingMore,
    hasMore,
    onLoadMore,
    totalCount
}: {
    col: Column;
    tasks: Task[];
    taskIds: string[];
    statusId?: string;
    isTasksLoaded?: boolean;
    isTasksLoading?: boolean;
    isLoadingMore?: boolean;
    hasMore?: boolean;
    totalCount?: number;
    taskLoadError?: string | null;
    onRetryLoadTasks?: (statusId: string) => void;
    onLoadMore?: (statusId: string) => void;
    onOpenCreateTask: (columnId: ColumnId) => void;
    onOpenTaskDetail: (taskId: string) => void;
    dndEnabled: boolean;
    headerDragProps?: HeaderDragProps;
    ghost?: { task: Task; toCol: ColumnId; index: number } | null;
    creatingTask: boolean;
    onRenameColumnInline: (columnId: ColumnId) => void;
    onDeleteColumn: (columnId: ColumnId) => void;
    taskEditState: { taskId: string | null; columnId: string | null; draft: string };
    onTaskStartEdit: (taskId: string, columnId: ColumnId, currentTitle: string) => void;
    onTaskCancelEdit: () => void;
    onTaskDraftChange: (v: string) => void;
    onTaskCommitEdit: () => void;
    onDeleteTask: (taskId: string, columnId: ColumnId) => void;
    isColumnEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (v: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
    canEditTask: boolean;
    canEditStatus: boolean;
    canDeleteStatus: boolean;
    canDeleteTask: boolean;
    canAddTask: boolean;
}) {
    const t = useTranslations("GroupBoardScreen");
    const hasLoadedTasks = Boolean(isTasksLoaded);
    const showLoadingState = Boolean(isTasksLoading && !hasLoadedTasks);
    const showErrorState = Boolean(taskLoadError && !hasLoadedTasks && !isTasksLoading);
    const dropId = `${DROP_PREFIX}${col.id}`;
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: dropId,
        data: { type: "column-drop", columnId: col.id }
    });

    const endDropId = `${END_PREFIX}${col.id}`;
    const { setNodeRef: setEndRef, isOver: isOverEnd } = useDroppable({
        id: endDropId,
        data: { type: "column-end", columnId: col.id }
    });

    const shouldShowGhost = !!ghost && ghost.toCol === col.id;

    type RenderItem = { kind: "task"; task: Task } | { kind: "ghost"; key: string };

    const rendered = React.useMemo<RenderItem[]>(() => {
        const base: RenderItem[] = tasks.map((t) => ({ kind: "task", task: t }));
        if (!(shouldShowGhost && ghost)) return base;
        const idx = Math.max(0, Math.min(ghost.index, base.length));
        const next = [...base];
        next.splice(idx, 0, { kind: "ghost", key: `ghost_${ghost.task.id}` });
        return next;
    }, [tasks, shouldShowGhost, ghost]);

    const [openColMenu, setOpenColMenu] = React.useState(false);
    const colMenuBtnRef = React.useRef<HTMLButtonElement | null>(null);

    const colInputRef = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
        if (isColumnEditing) setTimeout(() => colInputRef.current?.focus(), 0);
    }, [isColumnEditing]);

    return (
        <div
            className="rounded-xl border border-zinc-200/60 bg-white"
            data-status-id={dndEnabled ? undefined : statusId}>
            <div
                ref={(node) => headerDragProps?.setActivatorNodeRef?.(node as any)}
                {...(headerDragProps?.attributes ?? {})}
                {...(headerDragProps?.listeners ?? {})}
                style={{ touchAction: "none" }}
                className={cn(
                    "sticky top-0 z-10 rounded-t-xl bg-white/60 px-3 pt-3 pb-2",
                    "cursor-grab select-none active:cursor-grabbing"
                )}>
                <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0 flex-1">
                            {!isColumnEditing ? (
                                <p className="truncate font-bold text-sm text-zinc-900">{col.title}</p>
                            ) : (
                                <div className="space-y-1">
                                    <input
                                        ref={colInputRef}
                                        value={columnDraft}
                                        maxLength={30}
                                        onChange={(e) => {
                                            const value = e.target.value.slice(0, 30);
                                            onColumnDraftChange(value);
                                        }}
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                onColumnCommit();
                                            }

                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                onColumnCancel();
                                            }
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => onColumnCommit(), 0);
                                        }}
                                        className={cn(
                                            "h-9 w-full min-w-0 rounded-lg border bg-white px-3 font-bold text-sm text-zinc-900 outline-none",
                                            columnError
                                                ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                                : "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200",
                                            "select-text"
                                        )}
                                        style={{ maxWidth: 220 }}
                                    />
                                    <div className="flex justify-end text-[11px] text-zinc-500">
                                        {columnDraft.length}/30
                                    </div>

                                    {columnError ? (
                                        <div className="font-medium text-[11px] text-rose-600">{columnError}</div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 font-semibold text-xs text-zinc-700">
                            {totalCount ?? tasks.length}
                        </span>

                        {(canEditStatus || canDeleteStatus) && (
                            <div className="relative">
                                <button
                                    ref={colMenuBtnRef}
                                    type="button"
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenColMenu((v) => !v);
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (e.detail === 0) {
                                            setOpenColMenu((v) => !v);
                                        }
                                    }}
                                    className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-black/5"
                                    aria-label={t("columnMenu")}>
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>

                                <PortalDropdown
                                    open={openColMenu}
                                    onClose={() => setOpenColMenu(false)}
                                    anchorRef={colMenuBtnRef}>
                                    {canEditStatus && (
                                        <MenuItem
                                            icon={<Pencil className="h-4 w-4" />}
                                            label={t("editStatusName")}
                                            onClick={() => {
                                                setOpenColMenu(false);
                                                onRenameColumnInline(col.id);
                                            }}
                                        />
                                    )}
                                    {canDeleteStatus && (
                                        <MenuItem
                                            icon={<Trash2 className="h-4 w-4" />}
                                            label={t("deleteStatus")}
                                            danger
                                            onClick={() => {
                                                setOpenColMenu(false);
                                                onDeleteColumn(col.id);
                                            }}
                                        />
                                    )}
                                </PortalDropdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-2 pb-2">
                <div ref={setDroppableRef} className={cn("rounded-b-xl transition", isOver && "bg-blue-50/40")}>
                    {dndEnabled ? (
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <div className="relative max-h-[68vh] space-y-2 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {showLoadingState ? (
                                    <div className="rounded-xl border border-zinc-300 border-dashed bg-white/70 px-3 py-8 text-center text-sm text-zinc-500 backdrop-blur-sm">
                                        {t("loading")}
                                    </div>
                                ) : null}

                                {showErrorState ? (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-8 text-center text-rose-700 text-sm">
                                        <div className="font-semibold">{taskLoadError}</div>
                                        <button
                                            type="button"
                                            onClick={() => statusId && onRetryLoadTasks?.(statusId)}
                                            className="mt-3 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 text-xs hover:bg-rose-50">
                                            {t("retry")}
                                        </button>
                                    </div>
                                ) : null}

                                {!(showLoadingState || showErrorState)
                                    ? rendered.map((item) => {
                                        if (item.kind === "ghost")
                                            return <GhostTaskCard key={item.key} task={ghost!.task} />;

                                        const isEditingThis =
                                            taskEditState.taskId === item.task.id &&
                                            taskEditState.columnId === col.id;

                                        return (
                                            <TaskCard
                                                key={item.task.id}
                                                task={item.task}
                                                columnId={col.id}
                                                isEditing={isEditingThis}
                                                draftTitle={isEditingThis ? taskEditState.draft : item.task.title}
                                                onDraftChange={onTaskDraftChange}
                                                onOpenDetail={() => onOpenTaskDetail(item.task.id)}
                                                onStartEdit={() =>
                                                    onTaskStartEdit(item.task.id, col.id, item.task.title)
                                                }
                                                onCancelEdit={onTaskCancelEdit}
                                                onCommitEdit={onTaskCommitEdit}
                                                onDelete={() => onDeleteTask(item.task.id, col.id)}
                                                canEditTask={canEditTask}
                                                canDeleteTask={canDeleteTask}
                                            />
                                        );
                                    })
                                    : null}

                                {!(showLoadingState || showErrorState) && tasks.length === 0 && hasLoadedTasks ? (
                                    <div className="rounded-xl border border-zinc-300 border-dashed bg-white/70 px-3 py-8 text-center backdrop-blur-sm">
                                        <div className="font-semibold text-sm text-zinc-700">{t("noTasks")}</div>
                                        <div className="mt-1 text-xs text-zinc-500">{t("addTaskHint")}</div>
                                    </div>
                                ) : null}

                                <div
                                    ref={setEndRef}
                                    className={cn(
                                        "h-3 rounded-xl border border-dashed transition",
                                        isOverEnd ? "border-blue-300 bg-blue-50/60" : "border-transparent"
                                    )}
                                />

                                {isLoadingMore && <LoadMoreLoading />}

                                {!isLoadingMore && hasMore && (
                                    <LoadMoreTrigger statusId={statusId} onLoadMore={onLoadMore} isLoading={isLoadingMore} />
                                )}
                            </div>
                        </SortableContext>
                    ) : (
                        <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {showLoadingState ? (
                                <div className="rounded-xl border border-zinc-300 border-dashed bg-white px-3 py-8 text-center text-sm text-zinc-500">
                                    {t("loading")}
                                </div>
                            ) : null}

                            {showErrorState ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-8 text-center text-rose-700 text-sm">
                                    <div className="font-semibold">{taskLoadError}</div>
                                    <button
                                        type="button"
                                        onClick={() => statusId && onRetryLoadTasks?.(statusId)}
                                        className="mt-3 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 text-xs hover:bg-rose-50">
                                        {t("retry")}
                                    </button>
                                </div>
                            ) : null}

                            {!(showLoadingState || showErrorState)
                                ? tasks.map((t) => {
                                    const isEditingThis =
                                        taskEditState.taskId === t.id && taskEditState.columnId === col.id;
                                    return (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            columnId={col.id}
                                            isEditing={isEditingThis}
                                            draftTitle={isEditingThis ? taskEditState.draft : t.title}
                                            onDraftChange={onTaskDraftChange}
                                            onOpenDetail={() => onOpenTaskDetail(t.id)}
                                            onStartEdit={() => onTaskStartEdit(t.id, col.id, t.title)}
                                            onCancelEdit={onTaskCancelEdit}
                                            onCommitEdit={onTaskCommitEdit}
                                            onDelete={() => onDeleteTask(t.id, col.id)}
                                            canEditTask={canEditTask}
                                            canDeleteTask={canDeleteTask}
                                        />
                                    );
                                })
                                : null}

                            {!(showLoadingState || showErrorState) && tasks.length === 0 && hasLoadedTasks ? (
                                <div className="rounded-xl border border-zinc-300 border-dashed bg-white px-3 py-8 text-center">
                                    <div className="font-semibold text-sm text-zinc-700">{t("noTasks")}</div>
                                    <div className="mt-1 text-xs text-zinc-500">{t("addTaskHint")}</div>
                                </div>
                            ) : null}

                            {isLoadingMore && <LoadMoreLoading />}

                            {!isLoadingMore && hasMore && (
                                <LoadMoreTrigger statusId={statusId} onLoadMore={onLoadMore} isLoading={isLoadingMore} />
                            )}
                        </div>
                    )}

                    {canAddTask && <AddTaskButton disabled={creatingTask} onClick={() => onOpenCreateTask(col.id)} />}
                </div>
            </div>
        </div>
    );
}

function getErrorMessage(error: unknown, fallback = "An error occurred") {
    if (error instanceof Error) {
        const msg = error.message?.trim();
        return msg || fallback;
    }
    if (typeof error === "string" && error.trim()) return error.trim();
    return fallback;
}

function SortableColumn({
    col,
    tasks,
    taskIds,
    statusId,
    isTasksLoaded,
    isTasksLoading,
    taskLoadError,
    onRetryLoadTasks,
    onOpenCreateTask,
    onOpenTaskDetail,
    dndEnabled,
    ghost,
    creatingTask,
    onRenameColumnInline,
    onDeleteColumn,
    taskEditState,
    onTaskStartEdit,
    onTaskCancelEdit,
    onTaskDraftChange,
    onTaskCommitEdit,
    onDeleteTask,
    isColumnEditing,
    columnDraft,
    columnError,
    onColumnDraftChange,
    onColumnCommit,
    onColumnCancel,
    canEditTask,
    canEditStatus,
    canDeleteStatus,
    canDeleteTask,
    canAddTask,
    isLoadingMore,
    hasMore,
    onLoadMore,
    totalCount
}: {
    col: Column;
    tasks: Task[];
    taskIds: string[];
    statusId?: string;
    isTasksLoaded?: boolean;
    isTasksLoading?: boolean;
    isLoadingMore?: boolean;
    hasMore?: boolean;
    totalCount?: number;
    taskLoadError?: string | null;
    onRetryLoadTasks?: (statusId: string) => void;
    onLoadMore?: (statusId: string) => void;
    onOpenCreateTask: (columnId: ColumnId) => void;
    onOpenTaskDetail: (taskId: string) => void;
    dndEnabled: boolean;
    ghost?: { task: Task; toCol: ColumnId; index: number } | null;
    creatingTask: boolean;
    onRenameColumnInline: (columnId: ColumnId) => void;
    onDeleteColumn: (columnId: ColumnId) => void;
    taskEditState: { taskId: string | null; columnId: string | null; draft: string };
    onTaskStartEdit: (taskId: string, columnId: ColumnId, currentTitle: string) => void;
    onTaskCancelEdit: () => void;
    onTaskDraftChange: (v: string) => void;
    onTaskCommitEdit: () => void;
    onDeleteTask: (taskId: string, columnId: ColumnId) => void;
    isColumnEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (v: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
    canEditTask: boolean;
    canEditStatus: boolean;
    canDeleteStatus: boolean;
    canDeleteTask: boolean;
    canAddTask: boolean;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: col.id,
        data: { type: "column" }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
        touchAction: "none",
        opacity: isDragging ? 0.25 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="min-w-[300px] max-w-[300px] self-start"
            data-status-id={statusId}>
            <ColumnView
                canEditTask={canEditTask}
                canEditStatus={canEditStatus}
                canDeleteStatus={canDeleteStatus}
                canDeleteTask={canDeleteTask}
                canAddTask={canAddTask}
                col={col}
                tasks={tasks}
                taskIds={taskIds}
                statusId={statusId}
                isTasksLoaded={isTasksLoaded}
                isTasksLoading={isTasksLoading}
                taskLoadError={taskLoadError}
                onOpenCreateTask={onOpenCreateTask}
                onOpenTaskDetail={onOpenTaskDetail}
                dndEnabled={dndEnabled}
                headerDragProps={{ attributes, listeners, setActivatorNodeRef }}
                ghost={ghost}
                creatingTask={creatingTask}
                onRenameColumnInline={onRenameColumnInline}
                onDeleteColumn={onDeleteColumn}
                taskEditState={taskEditState}
                onTaskStartEdit={onTaskStartEdit}
                onTaskCancelEdit={onTaskCancelEdit}
                onTaskDraftChange={onTaskDraftChange}
                onTaskCommitEdit={onTaskCommitEdit}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={onLoadMore}
                totalCount={totalCount}
                onDeleteTask={onDeleteTask}
                isColumnEditing={isColumnEditing}
                columnDraft={columnDraft}
                columnError={columnError}
                onColumnDraftChange={onColumnDraftChange}
                onColumnCommit={onColumnCommit}
                onColumnCancel={onColumnCancel}
                onRetryLoadTasks={onRetryLoadTasks}
            />
        </div>
    );
}

function TaskOverlay({ task }: { task: Task }) {
    const t = useTranslations("GroupBoardScreen");
    const overdue = task.dueRaw ? isOverdue(task.dueRaw) : false;
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const severityLabel = task.severity != null ? severityLabelOf(task.severity, t) : null;

    return (
        <div className="min-w-[300px] rounded-xl border border-black/5 bg-white p-4 shadow-xl">
            <p className={cn("font-semibold text-sm leading-5", done ? "text-zinc-500 line-through" : "text-zinc-900")}>
                {task.title}
            </p>

            <div className="mt-2">
                <Pill>
                    {t("assignee")}: {task.assigneeName || t("notAssigned")}
                </Pill>
            </div>

            {task.due || severityLabel || done || showProgress ? (
                <div className="mt-3 space-y-2">
                    {task.due ? <DuePill due={task.due} overdue={overdue} done={done} /> : null}

                    {severityLabel || done || showProgress ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {severityLabel ? (
                                <span
                                    className={cn(
                                        "inline-flex shrink-0 items-center rounded-xl border px-3 py-2 font-semibold text-xs",
                                        done ? "border-zinc-200 bg-zinc-100 text-zinc-500" : severityTone(task.severity)
                                    )}>
                                    {severityLabel}
                                </span>
                            ) : null}

                            {showProgress ? <ProgressPill progress={Number(task.progress ?? 0)} /> : null}

                            {done ? <DonePill completedAt={task.completedAt}/> : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function ColumnOverlay({ col, tasks }: { col: Column; tasks: Task[] }) {
    const t = useTranslations("GroupBoardScreen");
    return (
        <div className="min-w-[300px] max-w-[300px]">
            <div className="rounded-xl border border-zinc-200/60 bg-white shadow-xl backdrop-blur-sm">
                <div className="rounded-t-xl bg-white/60 px-3 pt-3 pb-2">
                    <p className="truncate font-bold text-sm text-zinc-900">{col.title}</p>
                    <p className="text-[11px] text-zinc-500">{t("movingStatus")}</p>
                </div>
                <div className="px-2 pb-2">
                    <div className="rounded-b-xl">
                        {tasks.slice(0, 3).map((t) => (
                            <div key={t.id} className="mb-2 last:mb-0">
                                <div className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
                                    <p
                                        className={cn(
                                            "font-semibold text-sm",
                                            isTaskDone(t) ? "text-zinc-500 line-through" : "text-zinc-900"
                                        )}>
                                        {t.title}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 ? (
                            <div className="rounded-xl border border-zinc-300 border-dashed bg-white/70 px-3 py-8 text-center text-sm text-zinc-500 backdrop-blur-sm">
                                {t("emptyStatus")}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GroupBoardScreen({
    canDelete = false,
    groupIdOverride,
    initialTaskId,
    onTaskDetailClose
}: {
    canDelete?: boolean;
    groupIdOverride?: string;
    initialTaskId?: string | null;
    onTaskDetailClose?: (() => void) | null;
}) {
    const params = useParams<{ groupId: string }>();
    const { guardedPush, guardedReplace } = useGuardedRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("GroupBoardScreen");
    const locale = useLocale();
    const headerActionSlot = useGroupHeaderActionSlot();
    const groupId = String(groupIdOverride ?? "").trim() || (params?.groupId ? String(params.groupId) : "");

    React.useEffect(() => {
        if (!groupId) return;
        if (isUuidLike(groupId)) return;

        guardedReplace(`/${locale}/group-access-denied?reason=forbidden`, { scroll: false });
    }, [groupId, guardedReplace, locale]);

    const apiMessages = React.useMemo<ApiMessages>(
        () => ({
            missingApiBase: t("missingApiBase"),
            invalidGroupId: t("invalidGroupId"),
            invalidTaskId: t("invalidTaskId"),
            invalidStatusId: t("invalidStatus"),
            enterStatusName: t("enterStatusName"),
            genericApiError: t("errorOccurred")
        }),
        [t]
    );

    // Các cờ quyền bên dưới chỉ mở sau khi board nhận được role theo đúng `groupId` hiện tại.
    const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);
    const [resolvedRoleGroupId, setResolvedRoleGroupId] = React.useState<string | null>(null);
    const hasAuthoritativeRole = !!groupId && resolvedRoleGroupId === groupId;
    const canContributeToBoard =
        hasAuthoritativeRole &&
        (currentUserRole === "owner" || currentUserRole === "moderator" || currentUserRole === "member");
    // Quyền quản lý trạng thái chỉ dành cho owner/moderator theo role thực tế của group.
    const canManageStatus = hasAuthoritativeRole && canDeleteByRole(currentUserRole);
    const canEditTask = canContributeToBoard;
    const canDeleteStatus = canManageStatus;
    const canDeleteTask = canDelete || (hasAuthoritativeRole && canDeleteTaskByRole(currentUserRole));
    const isRestricted = !canContributeToBoard;
    const canEditStatus = canManageStatus;
    const canAddTask = canContributeToBoard;
    const canAddStatus = canManageStatus;

    const [columns, setColumns] = React.useState<Column[]>([]);
    const [board, setBoard] = React.useState<Record<ColumnId, Task[]>>({});
    const [statusLoadingMap, setStatusLoadingMap] = React.useState<Record<ColumnId, boolean>>({});
    const [statusLoadedMap, setStatusLoadedMap] = React.useState<Record<ColumnId, boolean>>({});
    const [statusLoadErrors, setStatusLoadErrors] = React.useState<Record<ColumnId, string | null>>({});
    const [statusPageMap, setStatusPageMap] = React.useState<Record<ColumnId, number>>({});
    const [statusLoadingMoreMap, setStatusLoadingMoreMap] = React.useState<Record<ColumnId, boolean>>({});
    const [statusHasMoreMap, setStatusHasMoreMap] = React.useState<Record<ColumnId, boolean>>({});
    const [statusTotalCountMap, setStatusTotalCountMap] = React.useState<Record<ColumnId, number>>({});
    // Dùng ref song song với state để callback async luôn thấy trạng thái mới nhất, tránh stale closure.
    const statusLoadLockRef = React.useRef<Set<ColumnId>>(new Set());
    const statusLoadingRef = React.useRef<Record<ColumnId, boolean>>({});
    const statusLoadedRef = React.useRef<Record<ColumnId, boolean>>({});
    const statusLoadingMoreRef = React.useRef<Record<ColumnId, boolean>>({});
    const loadTasksForStatusRef = React.useRef<(statusId: string) => Promise<void>>(async () => { });

    const updateStatusLoadingMap = React.useCallback((update: React.SetStateAction<Record<ColumnId, boolean>>) => {
        setStatusLoadingMap((prev) => {
            const next = typeof update === "function" ? update(prev) : update;
            statusLoadingRef.current = next;
            return next;
        });
    }, []);

    const updateStatusLoadingMoreMap = React.useCallback(
        (update: React.SetStateAction<Record<ColumnId, boolean>>) => {
            setStatusLoadingMoreMap((prev) => {
                const next = typeof update === "function" ? update(prev) : update;
                statusLoadingMoreRef.current = next;
                return next;
            });
        },
        []
    );

    const updateStatusLoadedMap = React.useCallback((update: React.SetStateAction<Record<ColumnId, boolean>>) => {
        setStatusLoadedMap((prev) => {
            const next = typeof update === "function" ? update(prev) : update;
            statusLoadedRef.current = next;
            return next;
        });
    }, []);

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const handleBoardPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (isInteractiveElement(e.target)) return;

        const el = boardScrollRef.current;
        if (!el) return;

        // Board hỗ trợ kéo để cuộn nên cần chụp lại điểm bắt đầu và vị trí cuộn hiện tại.
        dragScrollRef.current = {
            isDown: true,
            startX: e.clientX,
            startY: e.clientY,
            scrollLeft: el.scrollLeft,
            scrollTop: el.scrollTop,
            moved: false
        };

        // Ép kiểu rõ ràng sang `HTMLElement` trước khi gọi `setPointerCapture` để TypeScript hiểu đúng API.
        (el as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleBoardPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const state = dragScrollRef.current;
        const el = boardScrollRef.current;
        if (!(state.isDown && el)) return;

        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            state.moved = true;
        }

        el.scrollLeft = state.scrollLeft - dx;
        el.scrollTop = state.scrollTop - dy;
    };

    const endBoardPointerDrag = () => {
        dragScrollRef.current.isDown = false;
    };

    const handleBoardPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
        endBoardPointerDrag();
    };

    const handleBoardPointerCancel: React.PointerEventHandler<HTMLDivElement> = () => {
        endBoardPointerDrag();
    };

    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    const [creatingColumn, setCreatingColumn] = React.useState(false);
    const [creatingTask, setCreatingTask] = React.useState(false);

    const dragScrollRef = React.useRef<{
        isDown: boolean;
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
        moved: boolean;
    }>({
        isDown: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        moved: false
    });

    const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
    const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);
    const [overId, setOverId] = React.useState<string | null>(null);

    const [editingColumn, setEditingColumn] = React.useState<{
        id: string | null;
        draft: string;
        error: string | null;
    }>({
        id: null,
        draft: "",
        error: null
    });

    const [editingTask, setEditingTask] = React.useState<{
        taskId: string | null;
        columnId: string | null;
        draft: string;
    }>({
        taskId: null,
        columnId: null,
        draft: ""
    });

    const [confirmModal, setConfirmModal] = React.useState<{
        open: boolean;
        columnId: ColumnId | null;
        columnTitle: string;
    }>({
        open: false,
        columnId: null,
        columnTitle: ""
    });

    const [confirmDeleteTask, setConfirmDeleteTask] = React.useState<{
        open: boolean;
        taskId: string | null;
        columnId: string | null;
        taskTitle: string;
    }>({
        open: false,
        taskId: null,
        columnId: null,
        taskTitle: ""
    });

    const closePermissionModal = () =>
        setPermissionModal({
            open: false,
            title: "",
            message: ""
        });

    const openNoPermissionModal = (message: string) =>
        setPermissionModal({
            open: true,
            title: t("permissionDenied"),
            message
        });

    const openErrorModal = (message: string) =>
        setPermissionModal({
            open: true,
            title: t("notification"),
            message
        });

    const [permissionModal, setPermissionModal] = React.useState<{
        open: boolean;
        title: string;
        message: string;
    }>({
        open: false,
        title: "",
        message: ""
    });

    const [taskFormOpen, setTaskFormOpen] = React.useState(false);
    const [taskFormColumnId, setTaskFormColumnId] = React.useState<ColumnId | null>(null);

    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null);
    const [groupDetailSnapshot, setGroupDetailSnapshot] = React.useState<GroupDetailResponse | null>(null);
    const [groupMembersSnapshot, setGroupMembersSnapshot] = React.useState<GroupMemberDto[]>([]);

    const [membersOptions, setMembersOptions] = React.useState<TaskFormOption[]>([]);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [filters, setFilters] = React.useState<BoardFilters>(EMPTY_BOARD_FILTERS);
    const filterButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const filterPanelRef = React.useRef<HTMLDivElement | null>(null);
    const currentUserId = React.useMemo(() => getCurrentUserId(), []);
    const currentUser = React.useMemo(() => getUserData(), []);
    const currentUserDisplayName = React.useMemo(
        () => `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() || currentUser?.email || "",
        [currentUser]
    );
    const currentUserInitials = React.useMemo(
        () => buildInitials(currentUser?.firstName, currentUser?.lastName, currentUserDisplayName),
        [currentUser, currentUserDisplayName]
    );
    const topScrollRef = React.useRef<HTMLDivElement | null>(null);
    const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
    React.useLayoutEffect(() => {
        window.scrollTo(0, 0);

        // Mỗi lần vào màn board thì đưa toàn bộ vùng cuộn về trạng thái đầu.
        if (boardScrollRef.current) {
            boardScrollRef.current.scrollTop = 0;
            boardScrollRef.current.scrollLeft = 0;
        }

        if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = 0;
        }
    }, []);
    const syncSourceRef = React.useRef<"top" | "board" | null>(null);
    const [topScrollbarWidth, setTopScrollbarWidth] = React.useState(0);
    const [showTopScrollbar, setShowTopScrollbar] = React.useState(false);

    const autoOpenedTaskRef = React.useRef<string | null>(null);

    const syncTopScrollbarWidth = React.useCallback(() => {
        const boardEl = boardScrollRef.current;
        const topEl = topScrollRef.current;

        if (!boardEl) {
            setTopScrollbarWidth(0);
            setShowTopScrollbar(false);
            return;
        }

        const scrollWidth = boardEl.scrollWidth;
        const clientWidth = boardEl.clientWidth;

        // Chỉ bật thanh cuộn giả phía trên khi nội dung kanban tràn ngang.
        setTopScrollbarWidth(scrollWidth);
        setShowTopScrollbar(scrollWidth > clientWidth + 1);

        if (topEl && Math.abs(topEl.scrollLeft - boardEl.scrollLeft) > 1) {
            topEl.scrollLeft = boardEl.scrollLeft;
        }
    }, []);

    React.useLayoutEffect(() => {
        if (!mounted || loading) return;

        const boardEl = boardScrollRef.current;
        const frame = window.requestAnimationFrame(() => syncTopScrollbarWidth());
        const onResize = () => syncTopScrollbarWidth();

        window.addEventListener("resize", onResize);

        let resizeObserver: ResizeObserver | null = null;
        let mutationObserver: MutationObserver | null = null;

        if (boardEl) {
            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(() => syncTopScrollbarWidth());
                resizeObserver.observe(boardEl);
            }

            if (typeof MutationObserver !== "undefined") {
                mutationObserver = new MutationObserver(() => syncTopScrollbarWidth());
                mutationObserver.observe(boardEl, {
                    childList: true,
                    subtree: true
                });
            }
        }

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", onResize);
            resizeObserver?.disconnect();
            mutationObserver?.disconnect();
        };
    }, [mounted, loading, syncTopScrollbarWidth]);

    React.useLayoutEffect(() => {
        if (!mounted || loading) return;

        const frame = window.requestAnimationFrame(() => {
            syncTopScrollbarWidth();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [mounted, loading, syncTopScrollbarWidth]);

    const handleTopScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const boardEl = boardScrollRef.current;
        if (!boardEl) return;

        // `syncSourceRef` ngăn việc hai thanh cuộn kích hoạt lẫn nhau vô hạn.
        if (syncSourceRef.current === "board") {
            syncSourceRef.current = null;
            return;
        }

        syncSourceRef.current = "top";
        boardEl.scrollLeft = e.currentTarget.scrollLeft;
    };

    const handleBoardScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const topEl = topScrollRef.current;
        if (!topEl) return;

        if (syncSourceRef.current === "top") {
            syncSourceRef.current = null;
            return;
        }

        syncSourceRef.current = "board";
        topEl.scrollLeft = e.currentTarget.scrollLeft;
    };

    const openTaskDetail = (taskId: string) => {
        const normalizedTaskId = String(taskId ?? "").trim();
        if (!normalizedTaskId || !isUuidLike(normalizedTaskId)) {
            openErrorModal(t("invalidTaskId"));
            return;
        }

        guardedPush(`/${locale}/group/task/${encodeURIComponent(normalizedTaskId)}`, { scroll: false });
    };

    const closeTaskDetail = () => {
        setDetailOpen(false);
        setDetailTaskId(null);

        if (onTaskDetailClose) {
            onTaskDetailClose();
        }
    };

    const handleDeleteFromDetail = async (taskId: string) => {
        if (!canDeleteTask) {
            openNoPermissionModal(t("noPermissionDeleteTask"));
            return;
        }

        setDetailOpen(false);
        setDetailTaskId(null);

        try {
            await apiDeleteTask({ groupId, taskId }, apiMessages);
            await refreshSilently();
            if (onTaskDetailClose) {
                onTaskDetailClose();
            }
        } catch (e: unknown) {
            openErrorModal(getErrorMessage(e, t("deleteTaskFailed")));
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { delay: 200, tolerance: 5 }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const syncColumnsFromDetail = React.useCallback(
        (detail: GroupDetailResponse | undefined) => {
            // Group detail là nguồn sự thật của danh sách status.
            // Khi status thay đổi, toàn bộ state phụ trợ theo cột cũng phải reset tương ứng.
            const statuses = (detail?.taskStatuses ?? [])
                .filter((s) => typeof s?.statusId === "string" && !!s.statusId && typeof s?.statusName === "string")
                .map((s) => ({
                    id: String(s.statusId),
                    title: String(s.statusName ?? ""),
                    position: typeof s.position === "number" && Number.isFinite(s.position) ? s.position : 0
                }))
                .sort((a, b) => a.position - b.position);

            setColumns(statuses.map(({ id, title, position }) => ({ id, title, position })));
            const nextBoard = Object.fromEntries(statuses.map((status) => [status.id, [] as Task[]])) as Record<
                ColumnId,
                Task[]
            >;
            const nextLoading = Object.fromEntries(statuses.map((status) => [status.id, false])) as Record<
                ColumnId,
                boolean
            >;
            const nextLoaded = Object.fromEntries(statuses.map((status) => [status.id, false])) as Record<
                ColumnId,
                boolean
            >;
            const nextErrors = Object.fromEntries(statuses.map((status) => [status.id, null])) as Record<
                ColumnId,
                string | null
            >;
            const nextPage = Object.fromEntries(statuses.map((status) => [status.id, 1])) as Record<
                ColumnId,
                number
            >;
            const nextLoadingMore = Object.fromEntries(statuses.map((status) => [status.id, false])) as Record<
                ColumnId,
                boolean
            >;
            const nextHasMore = Object.fromEntries(statuses.map((status) => [status.id, true])) as Record<
                ColumnId,
                boolean
            >;
            const nextTotalCount = Object.fromEntries(statuses.map((status) => [status.id, 0])) as Record<
                ColumnId,
                number
            >;

            statusLoadLockRef.current.clear();
            setBoard(nextBoard);
            updateStatusLoadingMap(nextLoading);
            updateStatusLoadedMap(nextLoaded);
            setStatusLoadErrors(nextErrors);
            setStatusPageMap(nextPage);
            updateStatusLoadingMoreMap(nextLoadingMore);
            setStatusHasMoreMap(nextHasMore);
            setStatusTotalCountMap(nextTotalCount);
        },
        [
            updateStatusLoadingMap,
            updateStatusLoadedMap,
            updateStatusLoadingMoreMap,
            setStatusPageMap,
            setStatusHasMoreMap,
            setStatusTotalCountMap
        ]
    );

    const loadTasksForStatus = React.useCallback(
        async (statusId: string, append = false) => {
            if (!groupId) return;
            if (!isUuidLike(groupId)) return;
            if (!(statusId && isUuidLike(statusId))) return;

            const isInitialLoad = !append;
            // Chặn gọi lặp cùng một cột trong lúc đang fetch hoặc đã có dữ liệu ban đầu.
            if (isInitialLoad && statusLoadLockRef.current.has(statusId)) return;
            if (isInitialLoad && (statusLoadedRef.current[statusId] || statusLoadingRef.current[statusId])) return;
            if (append && statusLoadingMoreRef.current[statusId]) return;

            if (isInitialLoad) {
                statusLoadLockRef.current.add(statusId);
                updateStatusLoadingMap((prev) => ({ ...prev, [statusId]: true }));
                setStatusLoadErrors((prev) => ({ ...prev, [statusId]: null }));
                setStatusPageMap((prev) => ({ ...prev, [statusId]: 1 }));
            } else {
                updateStatusLoadingMoreMap((prev) => ({ ...prev, [statusId]: true }));
            }

            try {
                const apiFilters = buildApiFiltersFromBoardFilters(filters, currentUserId);
                const currentPage = append ? (statusPageMap[statusId] ?? 1) + 1 : 1;

                // Mỗi cột tải task riêng để board có thể hiển thị dần theo status.
                const response = await apiGetGroupTasks({
                    groupId,
                    statusId,
                    page: currentPage,
                    pageSize: 20,
                    ...apiFilters,
                    fallbackMessage: apiMessages.genericApiError,
                    missingApiBaseMessage: apiMessages.missingApiBase
                });

                const tasks = (response?.data?.items ?? []).slice().sort((a, b) => {
                    const aPos = a.position ?? 0;
                    const bPos = b.position ?? 0;
                    return aPos - bPos;
                });
                const mapped = tasks.map((apiTask) => mapGroupTaskToBoardTask(apiTask, locale));

                const totalPages = response?.data?.totalPages ?? 1;
                const hasMore = currentPage < totalPages;

                // `append` phục vụ infinite scroll, còn lần tải đầu sẽ thay mới danh sách của cột.
                setBoard((prev) => {
                    const existing = append ? prev[statusId] ?? [] : [];
                    return { ...prev, [statusId]: existing.concat(mapped) };
                });
                setStatusPageMap((prev) => ({ ...prev, [statusId]: currentPage }));
                setStatusHasMoreMap((prev) => ({ ...prev, [statusId]: hasMore }));
                setStatusTotalCountMap((prev) => ({ ...prev, [statusId]: response?.data?.totalCount ?? 0 }));
                if (isInitialLoad) updateStatusLoadedMap((prev) => ({ ...prev, [statusId]: true }));
            } catch (e: unknown) {
                if (isInitialLoad) {
                    setStatusLoadErrors((prev) => ({
                        ...prev,
                        [statusId]: getErrorMessage(e, apiMessages.genericApiError)
                    }));
                    updateStatusLoadedMap((prev) => ({ ...prev, [statusId]: false }));
                }
            } finally {
                if (isInitialLoad) {
                    statusLoadLockRef.current.delete(statusId);
                    updateStatusLoadingMap((prev) => ({ ...prev, [statusId]: false }));
                } else {
                    updateStatusLoadingMoreMap((prev) => ({ ...prev, [statusId]: false }));
                }
            }
        },
        [
            apiMessages.genericApiError,
            apiMessages.missingApiBase,
            groupId,
            locale,
            filters,
            currentUserId,
            updateStatusLoadedMap,
            updateStatusLoadingMoreMap,
            updateStatusLoadingMap,
            statusPageMap
        ]
    );

    const loadMoreForStatus = React.useCallback(
        (statusId: string) => {
            if (statusHasMoreMap[statusId] && !statusLoadingMoreRef.current[statusId]) {
                loadTasksForStatus(statusId, true);
            }
        },
        [loadTasksForStatus, statusHasMoreMap]
    );

    React.useEffect(() => {
        loadTasksForStatusRef.current = loadTasksForStatus;
    }, [loadTasksForStatus]);

    const fetchBoardData = React.useCallback(async () => {
        if (!groupId) throw new Error(t("missingGroupId"));
        if (!isUuidLike(groupId)) throw new Error(t("invalidGroupId"));
        if (!getApiBase()) throw new Error(t("missingApiBase"));

        // Lấy detail và members song song để giảm thời gian chờ khi mở board.
        const [detail, members] = await Promise.all([
            apiGetGroupDetail(groupId, apiMessages),
            apiGetGroupMembers(groupId, apiMessages)
        ]);

        syncColumnsFromDetail(detail?.data);
        setGroupDetailSnapshot(detail?.data ?? null);
        // Chỉ tin role do backend trả về cho đúng group hiện tại; trước đó UI giữ ở trạng thái restricted.
        setCurrentUserRole(normalizeGroupRole(detail?.data?.userRole));
        setResolvedRoleGroupId(groupId);

        const list = members?.data?.members ?? [];

        // Hàm phụ để xác định role có bị hạn chế quyền thao tác hay không, ví dụ commenter hoặc viewer.
        const isRestrictedRole = (role?: string | null | number): boolean => {
            if (role === null || role === undefined || role === "") return false;

            const roleStr = String(role).trim().toLowerCase();

            // Hỗ trợ cả giá trị số lẫn chuỗi số: `3` là commenter, `4` là viewer.
            if (roleStr === "3" || roleStr === "4") return true;

            // Với dữ liệu dạng text, chuẩn hóa qua `mapRole` để so sánh thống nhất.
            const mapped = mapRole(String(role));
            return mapped === "commenter" || mapped === "viewer";
        };

        const filteredMembers = list
            .filter((m) => typeof m?.userId === "string" && !!m.userId)
            .filter((m) => {
                // Loại các role không được phép nhận task như commenter và viewer.
                const restricted = isRestrictedRole(m?.role);
                return !restricted;
            });

        // Chỉ những thành viên có thể được giao việc mới đi vào option của TaskForm.
        setGroupMembersSnapshot(filteredMembers);

        setMembersOptions(
            filteredMembers.map((m) => {
                const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
                return {
                    value: String(m.userId),
                    label: name || m.email || t("unnamed"),
                    avatarUrl: m.avatarUrl ?? null,
                    role: m.role ?? null // Giữ lại role để modal có thể kiểm tra quyền hợp lệ khi cần.
                };
            })
        );
    }, [groupId, syncColumnsFromDetail, t, apiMessages]);

    const refresh = React.useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            await fetchBoardData();
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : "";
            setLoadError(errorMsg || t("failedLoadData"));
            setMembersOptions([]);
        } finally {
            setLoading(false);
        }
    }, [fetchBoardData, t]);

    const refreshSilently = React.useCallback(async () => {
        try {
            await fetchBoardData();
            setLoadError(null);
        } catch (e: unknown) {
            console.error("refreshSilently error:", e instanceof Error ? e.message : String(e));
        }
    }, [fetchBoardData]);

    React.useEffect(() => {
        if (!groupId || !isUuidLike(groupId)) return;
        void refresh();
    }, [groupId, refresh]);

    React.useEffect(() => {
        if (loading) return;

        const taskIdFromQuery = searchParams.get("taskId");
        const openTaskDetailFromQuery = searchParams.get("openTaskDetail");
        const candidateTaskId =
            String(initialTaskId ?? "").trim() ||
            (openTaskDetailFromQuery === "1" ? String(taskIdFromQuery ?? "").trim() : "");

        if (!candidateTaskId) return;
        if (autoOpenedTaskRef.current === candidateTaskId) return;

        autoOpenedTaskRef.current = candidateTaskId;
        setDetailTaskId(candidateTaskId);
        setDetailOpen(true);

        if (!initialTaskId && taskIdFromQuery && openTaskDetailFromQuery === "1") {
            guardedReplace(`/${locale}/group/${groupId}`, { scroll: false });
        }
    }, [loading, searchParams, guardedReplace, groupId, locale, initialTaskId]);

    React.useEffect(() => {
        const root = boardScrollRef.current;
        if (!root || columns.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;

                    const statusId = (entry.target as HTMLElement).dataset.statusId;
                    if (statusId) {
                        void loadTasksForStatusRef.current(statusId);
                    }
                }
            },
            {
                root,
                threshold: 0.35
            }
        );

        const nodes = root.querySelectorAll<HTMLElement>("[data-status-id]");
        nodes.forEach((node) => observer.observe(node));

        return () => observer.disconnect();
    }, [columns]);

    /**
     * Khi bộ lọc thay đổi, effect này sẽ nạp lại các cột đã từng được tải.
     * Nhờ vậy board phản ánh tiêu chí lọc mới ngay lập tức mà không cần reload toàn trang.
     */
    React.useEffect(() => {
        const loadedStatusIds = Object.entries(statusLoadedRef.current)
            .filter(([_, isLoaded]) => isLoaded)
            .map(([statusId]) => statusId);

        if (loadedStatusIds.length === 0) return;

        updateStatusLoadedMap((prev) => {
            const next = { ...prev };
            for (const statusId of loadedStatusIds) {
                next[statusId] = false;
            }
            return next;
        });

        const reloadLoadedStatuses = async () => {
            await Promise.all(loadedStatusIds.map((statusId) => loadTasksForStatus(statusId)));
        };

        void reloadLoadedStatuses();
    }, [loadTasksForStatus, updateStatusLoadedMap]);

    const activeTask = React.useMemo(() => {
        if (!activeTaskId) return null;
        return findTask(board, columns, activeTaskId);
    }, [activeTaskId, board, columns]);

    const activeColumn = React.useMemo(() => {
        if (!activeColumnId) return null;
        return columns.find((c) => c.id === activeColumnId) ?? null;
    }, [activeColumnId, columns]);

    const ghost = React.useMemo(() => {
        if (!activeTaskId) return null;
        if (!overId) return null;

        const task = findTask(board, columns, activeTaskId);
        if (!task) return null;

        const overKey = overId.startsWith(DROP_PREFIX)
            ? overId.replace(DROP_PREFIX, "")
            : overId.startsWith(END_PREFIX)
                ? overId.replace(END_PREFIX, "")
                : overId;

        let toCol: ColumnId | null = null;
        if (columns.some((c) => c.id === overKey)) toCol = overKey;
        else toCol = findColumnOfTask(board, columns, overKey) ?? null;

        if (!toCol) return null;

        const toTasks = board[toCol] ?? [];
        if (overId.startsWith(END_PREFIX)) return { task, toCol, index: toTasks.length };

        const idx = toTasks.findIndex((t) => t.id === overKey);
        const index = idx !== -1 ? idx : 0;
        return { task, toCol, index };
    }, [activeTaskId, overId, board, columns]);

    const submitAddColumn = async (title: string) => {
        if (!canAddStatus) {
            openNoPermissionModal(t("noPermissionCreateStatus"));
            return;
        }

        if (!groupId) throw new Error(t("missingGroupId"));
        if (!isUuidLike(groupId)) throw new Error(t("invalidGroupId"));

        const existed = columns.some((c) => c.title.trim().toLowerCase() === title.trim().toLowerCase());
        if (existed) throw new Error(t("statusNameExists"));

        const base = detectPositionBase(columns) as 0 | 1;
        const positionToSend = nextPositionForCreate(columns, base);

        setCreatingColumn(true);
        try {
            await apiCreateGroupTaskStatus({ groupId, statusName: title, position: positionToSend }, apiMessages);
            await refreshSilently();

            requestAnimationFrame(() => {
                syncTopScrollbarWidth();
            });
        } finally {
            setCreatingColumn(false);
        }
    };

    const startEditColumn = (columnId: ColumnId) => {
        const col = columns.find((c) => c.id === columnId);
        if (!col) return;
        setEditingColumn({ id: columnId, draft: col.title, error: null });
    };

    const cancelEditColumn = () => setEditingColumn({ id: null, draft: "", error: null });

    const commitEditColumn = async () => {
        if (!groupId) return;
        const id = editingColumn.id;
        if (!id) return;

        const col = columns.find((c) => c.id === id);
        if (!col) return;

        const next = editingColumn.draft.trim();
        if (!next) {
            setEditingColumn((p) => ({ ...p, error: t("enterStatusName") }));
            return;
        }

        if (columns.some((c) => c.id !== id && c.title.trim().toLowerCase() === next.toLowerCase())) {
            setEditingColumn((p) => ({ ...p, error: t("statusNameExists") }));
            return;
        }

        const prevTitle = col.title;
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title: next } : c)));

        try {
            await apiRenameGroupTaskStatus(
                {
                    groupId,
                    statusId: id,
                    statusName: next,
                    position: col.position
                },
                apiMessages
            );
            cancelEditColumn();
            await refreshSilently();
        } catch (e: unknown) {
            setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title: prevTitle } : c)));
            const errorMsg = e instanceof Error ? e.message : "";
            setEditingColumn((p) => ({ ...p, error: errorMsg || t("errorOccurred") }));
        }
    };

    const onDeleteColumn = (columnId: ColumnId) => {
        if (!canDeleteStatus) {
            openNoPermissionModal(t("noPermissionDeleteStatus"));
            return;
        }

        const col = columns.find((c) => c.id === columnId);
        if (!col) return;

        setConfirmModal({
            open: true,
            columnId,
            columnTitle: col.title
        });
    };

    const handleConfirmDeleteColumn = async () => {
        const columnId = confirmModal.columnId;
        setConfirmModal({ open: false, columnId: null, columnTitle: "" });
        if (!(columnId && groupId)) return;

        const prevCols = columns;
        const prevBoard = board;

        const base = detectPositionBase(columns) as 0 | 1;
        const nextCols = assignPositions(
            columns.filter((c) => c.id !== columnId),
            base
        );

        setColumns(nextCols);
        setBoard((prev) => {
            const next = { ...prev };
            delete next[columnId];
            return next;
        });

        try {
            await apiDeleteGroupTaskStatus({ groupId, statusId: columnId }, apiMessages);
            await refreshSilently();
        } catch (e: unknown) {
            setColumns(prevCols);
            setBoard(prevBoard);

            openErrorModal(getErrorMessage(e, t("deleteStatusFailed")));
        }
    };

    const handleCancelDeleteColumn = () => setConfirmModal({ open: false, columnId: null, columnTitle: "" });

    const onTaskStartEdit = (taskId: string, columnId: ColumnId, currentTitle: string) => {
        setEditingTask({ taskId, columnId, draft: currentTitle });
    };

    const onTaskCancelEdit = () => setEditingTask({ taskId: null, columnId: null, draft: "" });

    const onTaskCommitEdit = () => {
        const { taskId, columnId, draft } = editingTask;
        if (!(taskId && columnId)) return;

        const next = draft.trim();
        if (!next) {
            onTaskCancelEdit();
            return;
        }

        setBoard((prev) => ({
            ...prev,
            [columnId]: (prev[columnId] ?? []).map((t) => (t.id === taskId ? { ...t, title: next } : t))
        }));

        onTaskCancelEdit();
    };

    const onDeleteTask = (taskId: string, columnId: ColumnId) => {
        if (!canDeleteTask) {
            openNoPermissionModal(t("noPermissionDeleteTask"));
            return;
        }

        // Tìm đúng task theo `taskId` để lấy tiêu đề hiển thị trong hộp xác nhận xóa, tránh nhầm với `t` là hàm dịch.
        const task = (board[columnId] ?? []).find((x) => x.id === taskId);

        setConfirmDeleteTask({
            open: true,
            taskId,
            columnId,
            taskTitle: task?.title ?? ""
        });
    };

    const handleCancelDeleteTask = () =>
        setConfirmDeleteTask({ open: false, taskId: null, columnId: null, taskTitle: "" });

    const handleConfirmDeleteTask = async () => {
        const taskId = confirmDeleteTask.taskId;
        const columnId = confirmDeleteTask.columnId;

        setConfirmDeleteTask({ open: false, taskId: null, columnId: null, taskTitle: "" });

        if (!(taskId && columnId)) return;

        const prevBoard = board;

        setBoard((prev) => ({
            ...prev,
            [columnId]: (prev[columnId] ?? []).filter((t) => t.id !== taskId)
        }));

        if (editingTask.taskId === taskId && editingTask.columnId === columnId) {
            onTaskCancelEdit();
        }

        try {
            await apiDeleteTask({ groupId, taskId }, apiMessages);
            await refreshSilently();
        } catch (e: unknown) {
            setBoard(prevBoard);

            openErrorModal(getErrorMessage(e, t("deleteTaskFailed")));
        }
    };

    const openCreateTask = (columnId: ColumnId) => {
        setTaskFormColumnId(columnId);
        setTaskFormOpen(true);
    };

    const closeCreateTask = () => {
        setTaskFormOpen(false);
        setTaskFormColumnId(null);
    };

    const handleSubmitCreateTask = async (values: TaskFormValues) => {
        if (!groupId) throw new Error(t("missingGroupId"));
        if (!isUuidLike(groupId)) throw new Error(t("invalidGroupId"));

        const normalizeFormValues = (values: unknown) => {
            const obj = asObject(values) ?? {};
            const taskPriority =
                typeof obj.taskPriority === "number" || (typeof obj.taskPriority === "string" && obj.taskPriority)
                    ? obj.taskPriority
                    : undefined;
            const taskSeverity =
                typeof obj.taskSeverity === "number" || (typeof obj.taskSeverity === "string" && obj.taskSeverity)
                    ? obj.taskSeverity
                    : undefined;
            return {
                statusId: String(obj.statusId ?? obj.groupStatusId ?? "").trim(),
                title: String(obj.title ?? obj.taskName ?? "").trim(),
                dueDate: obj.dueDate ?? obj.due ?? null,
                startDate: obj.startDate ?? obj.start ?? null,
                assigneeId: obj.assigneeId ?? obj.assignees ?? obj.assignee ?? null,
                estimatedHours: typeof obj.estimatedHours === "number" ? obj.estimatedHours : undefined,
                actualHours: typeof obj.actualHours === "number" ? obj.actualHours : undefined,
                taskPriority: taskPriority as string | 0 | 1 | 2 | undefined,
                taskSeverity: taskSeverity as string | 0 | 1 | 2 | 3 | undefined
            };
        };

        const normalized = normalizeFormValues(values);
        const columnId = normalized.statusId || taskFormColumnId || null;
        if (!columnId) throw new Error(t("missingStatus"));
        if (!isUuidLike(columnId)) throw new Error(t("invalidStatus"));

        const rawDue = normalized.dueDate;
        const rawStart = normalized.startDate;

        const dueSelected = rawDue != null && String(rawDue).trim() !== "";
        const startSelected = rawStart != null && String(rawStart).trim() !== "";

        setCreatingTask(true);
        try {
            await apiCreateTask(
                {
                    groupId,
                    groupStatusId: columnId,
                    taskName: normalized.title,
                    assigneeId: normalized.assigneeId ? String(normalized.assigneeId) : null,
                    dueDate: rawDue,
                    startDate: rawStart,
                    dueDateSelected: dueSelected,
                    startDateSelected: startSelected,
                    estimatedHours: normalized.estimatedHours,
                    actualHours: normalized.actualHours,
                    priority: normalized.taskPriority,
                    severity: normalized.taskSeverity
                },
                apiMessages
            );

            await refreshSilently();
            closeCreateTask();
        } finally {
            setCreatingTask(false);
        }
    };

    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;

        if (activeType === "column") {
            // Khi kéo cột thì chỉ xét va chạm giữa các cột với nhau.
            const onlyColumns = filterDroppablesByType(args.droppableContainers, ["column"]);
            return closestCenter({ ...args, droppableContainers: onlyColumns });
        }

        // Khi kéo task, ưu tiên vị trí con trỏ thật; nếu không có thì fallback theo góc gần nhất.
        const allow = filterDroppablesByType(args.droppableContainers, ["task", "column-drop", "column-end"]);
        const pointerHits = pointerWithin({ ...args, droppableContainers: allow });
        if (pointerHits.length > 0) return pointerHits;
        return closestCorners({ ...args, droppableContainers: allow });
    }, []);

    const handleDragStart = (e: DragStartEvent) => {
        setOverId(null);
        const type = e.active.data.current?.type;
        if (type === "task") setActiveTaskId(String(e.active.id));
        if (type === "column") setActiveColumnId(String(e.active.id));
    };

    const handleDragOver = (e: DragOverEvent) => {
        const next = e.over?.id ? String(e.over.id) : null;
        setOverId(next);
    };

    const handleDragCancel = (_e: DragCancelEvent) => {
        setActiveTaskId(null);
        setActiveColumnId(null);
        setOverId(null);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        const activeType = e.active.data.current?.type;
        const overRaw = e.over?.id ? String(e.over.id) : null;

        setActiveTaskId(null);
        setActiveColumnId(null);
        setOverId(null);

        if (!overRaw) return;

        if (activeType === "task") {
            if (!(groupId && isUuidLike(groupId))) return;

            const activeId = String(e.active.id);
            const prevBoard = board;

            // Optimistic update: đổi UI ngay sau khi thả để thao tác mượt hơn.
            const dropped = applyTaskDrop({
                board,
                columns,
                activeTaskId: activeId,
                overRaw
            });
            if (!dropped) return;

            setBoard(dropped.nextBoard);

            // Nếu kéo task sang cột khác, cập nhật ngay tổng số task của hai cột liên quan.
            if (dropped.fromCol !== dropped.toCol) {
                setStatusTotalCountMap((prev) => ({
                    ...prev,
                    [dropped.fromCol]: Math.max(0, (prev[dropped.fromCol] ?? 1) - 1),
                    [dropped.toCol]: (prev[dropped.toCol] ?? 0) + 1
                }));
            }

            void (async () => {
                try {
                    await apiReorderTask(
                        {
                            groupId,
                            taskId: activeId,
                            targetStatusId: dropped.toCol,
                            prevTaskId: dropped.prevTaskId,
                            nextTaskId: dropped.nextTaskId
                        },
                        apiMessages
                    );
                } catch {
                    // Nếu backend không chấp nhận reorder thì rollback về snapshot cũ.
                    setBoard(prevBoard);
                    // Hoàn tác cả bộ đếm tổng số task nếu request reorder thất bại.
                    if (dropped.fromCol !== dropped.toCol) {
                        setStatusTotalCountMap((prev) => ({
                            ...prev,
                            [dropped.fromCol]: (prev[dropped.fromCol] ?? 0) + 1,
                            [dropped.toCol]: Math.max(0, (prev[dropped.toCol] ?? 1) - 1)
                        }));
                    }
                }
            })();

            return;
        }

        if (activeType === "column") {
            // Kiểm tra quyền trước khi cho phép người dùng kéo đổi vị trí cột.
            if (!canEditStatus) {
                return;
            }

            if (!groupId) return;

            const activeColId = String(e.active.id);
            let overColId = String(overRaw);

            if (overColId.startsWith(DROP_PREFIX)) overColId = overColId.replace(DROP_PREFIX, "");
            if (overColId.startsWith(END_PREFIX)) overColId = overColId.replace(END_PREFIX, "");

            if (!columns.some((c) => c.id === overColId)) {
                const maybeTaskCol = findColumnOfTask(board, columns, overColId);
                if (maybeTaskCol) overColId = maybeTaskCol;
            }

            if (!columns.some((c) => c.id === overColId)) return;
            if (activeColId === overColId) return;

            const oldIndex = columns.findIndex((c) => c.id === activeColId);
            const newIndex = columns.findIndex((c) => c.id === overColId);
            if (oldIndex === -1 || newIndex === -1) return;

            const prevCols = columns;
            const nextCols = arrayMove(columns, oldIndex, newIndex);

            // Reorder cột cũng áp dụng optimistic update rồi mới đồng bộ với backend.
            setColumns(nextCols);

            // Tính lại chỉ số của cột trong `nextCols` để suy ra chính xác phần tử đứng trước và đứng sau sau khi di chuyển.
            const movedIndex = nextCols.findIndex((c) => c.id === activeColId);
            const prevStatusId = movedIndex > 0 ? nextCols[movedIndex - 1].id : null;
            const nextStatusId = movedIndex < nextCols.length - 1 ? nextCols[movedIndex + 1].id : null;

            void (async () => {
                try {
                    await apiReorderGroupTaskStatus(
                        {
                            groupId,
                            statusId: activeColId,
                            prevStatusId,
                            nextStatusId
                        },
                        apiMessages
                    );
                } catch {
                    setColumns(prevCols);
                }
            })();
        }
    };

    const columnIds = React.useMemo(() => columns.map((c) => c.id), [columns]);

    const filterCount = React.useMemo(
        () =>
            filters.members.length +
            filters.cardStatus.length +
            filters.dueDate.length +
            filters.priorities.length +
            filters.severities.length,
        [filters]
    );

    const filteredBoard = React.useMemo(() => {
        const hasAnyFilter = filterCount > 0;
        if (!hasAnyFilter) return board;

        const nextBoard: Record<ColumnId, Task[]> = {};

        for (const col of columns) {
            const tasks = board[col.id] ?? [];
            nextBoard[col.id] = tasks.filter((task) => {
                if (filters.members.length > 0) {
                    const memberMatches = filters.members.some((memberFilter) => {
                        if (memberFilter === "noMembers") return isTaskUnassigned(task);
                        if (memberFilter === "assignedToMe") {
                            return Boolean(currentUserId) && String(task.assigneeId ?? "").trim() === currentUserId;
                        }
                        return false;
                    });
                    if (!memberMatches) return false;
                }

                if (filters.cardStatus.length > 0) {
                    const statusMatches = filters.cardStatus.some((statusFilter) => {
                        if (statusFilter === "complete") return isTaskDone(task);
                        if (statusFilter === "inProgress") return isTaskInProgress(task);
                        return false;
                    });
                    if (!statusMatches) return false;
                }

                if (filters.dueDate.length > 0) {
                    const dueMatches = classifyDueDate(task);
                    if (!filters.dueDate.some((dueFilter) => dueMatches.has(dueFilter))) return false;
                }

                if (filters.priorities.length > 0) {
                    if (task.priority == null) return false;
                    if (!filters.priorities.includes(Number(task.priority))) return false;
                }

                if (filters.severities.length > 0) {
                    if (task.severity == null) return false;
                    if (!filters.severities.includes(Number(task.severity))) return false;
                }

                return true;
            });
        }

        return nextBoard;
    }, [board, columns, currentUserId, filterCount, filters]);

    const taskIdsByCol = React.useMemo(() => {
        const out: Record<string, string[]> = {};
        for (const col of columns) out[col.id] = (filteredBoard[col.id] ?? []).map((t) => t.id);
        return out;
    }, [filteredBoard, columns]);

    const statusesOptions = React.useMemo<TaskFormOption[]>(
        () => columns.map((c) => ({ value: c.id, label: c.title })),
        [columns]
    );

    const totalTaskCount = React.useMemo(
        () => Object.values(filteredBoard).reduce((count, tasks) => count + tasks.length, 0),
        [filteredBoard]
    );

    const headerFilterControl = React.useMemo(
        () => (
            <div className="relative flex items-center">
                <div className="inline-flex items-center overflow-hidden rounded-[10px] border border-[#F0E2D6] bg-[#FFFDFB] shadow-sm">
                    <button
                        ref={filterButtonRef}
                        type="button"
                        onClick={() => setFilterOpen((open) => !open)}
                        className={cn(
                            "inline-flex h-11 w-11 items-center justify-center border-[#F0E2D6] border-r transition focus:outline-none",
                            filterOpen || filterCount > 0
                                ? "bg-[#FFF7F0] text-[#EA580C]"
                                : "bg-[#FFFDFB] text-[#6B7280] hover:bg-[#FFF7F0] hover:text-[#EA580C]"
                        )}
                        aria-label={t("filter")}
                        title={t("filter")}>
                        <FilterBarsIcon className="h-5 w-5" />
                    </button>

                    {filterCount > 0 ? (
                        <>
                            <div className="inline-flex h-11 items-center gap-2 border-[#F0D7C3] border-r bg-[#FFF3E8] px-3 text-[#C2410C] text-sm">
                                <span className="h-4 w-4 rounded-full bg-gradient-to-br from-[#FB923C] to-[#EA580C] shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
                                <span className="font-semibold">{totalTaskCount}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setFilters(EMPTY_BOARD_FILTERS)}
                                className="inline-flex h-11 items-center bg-[#FFF3E8] px-4 font-semibold text-[#EA580C] text-sm transition hover:bg-[#FDE7D7]">
                                {t("clearAll")}
                            </button>
                        </>
                    ) : null}
                </div>

                {filterOpen ? (
                    <div
                        ref={filterPanelRef}
                        className="absolute top-full right-0 z-[9999] mt-2 w-[360px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.14)]">
                        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-3 [scrollbar-color:rgba(100,116,139,0.26)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb:hover]:bg-zinc-400/45 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-400/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                            <div className="relative flex items-center justify-center px-2">
                                <div className="font-semibold text-base text-zinc-900">{t("filter")}</div>

                                <button
                                    type="button"
                                    onClick={() => setFilterOpen(false)}
                                    className="absolute right-2 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                                    aria-label={t("close")}>
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <FilterSection title={t("members")}>
                                <FilterCheckbox
                                    checked={filters.members.includes("noMembers")}
                                    label={t("noMembers")}
                                    icon={
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                                            <UserOutlineIcon className="h-4 w-4" />
                                        </span>
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            members: toggleArrayValue(prev.members, "noMembers")
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.members.includes("assignedToMe")}
                                    label={t("cardsAssignedToMe")}
                                    icon={
                                        currentUser?.avatarUrl ? (
                                            <img
                                                src={currentUser.avatarUrl}
                                                alt={currentUserDisplayName || t("cardsAssignedToMe")}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] font-semibold text-[11px] text-white">
                                                {currentUserInitials}
                                            </span>
                                        )
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            members: toggleArrayValue(prev.members, "assignedToMe")
                                        }))
                                    }
                                />
                            </FilterSection>

                            <FilterSection title={t("cardStatus")}>
                                <FilterCheckbox
                                    checked={filters.cardStatus.includes("complete")}
                                    label={t("markedAsComplete")}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            cardStatus: toggleArrayValue(prev.cardStatus, "complete")
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.cardStatus.includes("inProgress")}
                                    label={t("inProgress")}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            cardStatus: toggleArrayValue(prev.cardStatus, "inProgress")
                                        }))
                                    }
                                />
                            </FilterSection>

                            <FilterSection title={t("dueDate")}>
                                <FilterCheckbox
                                    checked={filters.dueDate.includes("noDates")}
                                    label={t("noDates")}
                                    icon={
                                        <DueDateIcon tone="neutral">
                                            <CalendarDays className="h-4 w-4" />
                                        </DueDateIcon>
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            dueDate: toggleArrayValue(prev.dueDate, "noDates")
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.dueDate.includes("overdue")}
                                    label={t("overdue")}
                                    icon={
                                        <DueDateIcon tone="red">
                                            <Clock3 className="h-4 w-4" />
                                        </DueDateIcon>
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            dueDate: toggleArrayValue(prev.dueDate, "overdue")
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.dueDate.includes("nextDay")}
                                    label={t("dueInNextDay")}
                                    icon={
                                        <DueDateIcon tone="yellow">
                                            <Clock3 className="h-4 w-4" />
                                        </DueDateIcon>
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            dueDate: toggleArrayValue(prev.dueDate, "nextDay")
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.dueDate.includes("nextWeek")}
                                    label={t("dueInNextWeek")}
                                    icon={
                                        <DueDateIcon tone="gray">
                                            <Clock3 className="h-4 w-4" />
                                        </DueDateIcon>
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            dueDate: toggleArrayValue(prev.dueDate, "nextWeek")
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.dueDate.includes("nextMonth")}
                                    label={t("dueInNextMonth")}
                                    icon={
                                        <DueDateIcon tone="gray">
                                            <Clock3 className="h-4 w-4" />
                                        </DueDateIcon>
                                    }
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            dueDate: toggleArrayValue(prev.dueDate, "nextMonth")
                                        }))
                                    }
                                />
                            </FilterSection>

                            <FilterSection title={t("labels")}>
                                {filters.priorities.length > 1 || filters.severities.length > 1 ? (
                                    <p className="px-2 pb-1 text-[11px] text-amber-700">{t("multiSelectApiHint")}</p>
                                ) : null}
                                <div className="px-2 pt-1 font-medium text-xs text-zinc-500 uppercase tracking-wide">
                                    {t("priority")}
                                </div>
                                <FilterCheckbox
                                    checked={filters.priorities.includes(2)}
                                    label={t("high")}
                                    icon={<LabelToneDot tone="priority-high" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            priorities: toggleArrayValue(prev.priorities, 2)
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.priorities.includes(1)}
                                    label={t("medium")}
                                    icon={<LabelToneDot tone="priority-medium" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            priorities: toggleArrayValue(prev.priorities, 1)
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.priorities.includes(0)}
                                    label={t("low")}
                                    icon={<LabelToneDot tone="priority-low" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            priorities: toggleArrayValue(prev.priorities, 0)
                                        }))
                                    }
                                />

                                <div className="px-2 pt-3 font-medium text-xs text-zinc-500 uppercase tracking-wide">
                                    {t("severity")}
                                </div>
                                <FilterCheckbox
                                    checked={filters.severities.includes(3)}
                                    label={t("critical")}
                                    icon={<LabelToneDot tone="severity-critical" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            severities: toggleArrayValue(prev.severities, 3)
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.severities.includes(2)}
                                    label={t("major")}
                                    icon={<LabelToneDot tone="severity-major" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            severities: toggleArrayValue(prev.severities, 2)
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.severities.includes(1)}
                                    label={t("moderate")}
                                    icon={<LabelToneDot tone="severity-moderate" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            severities: toggleArrayValue(prev.severities, 1)
                                        }))
                                    }
                                />
                                <FilterCheckbox
                                    checked={filters.severities.includes(0)}
                                    label={t("minor")}
                                    icon={<LabelToneDot tone="severity-minor" />}
                                    onChange={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            severities: toggleArrayValue(prev.severities, 0)
                                        }))
                                    }
                                />
                            </FilterSection>
                        </div>
                    </div>
                ) : null}
            </div>
        ),
        [currentUser, currentUserDisplayName, currentUserInitials, filterCount, filterOpen, filters, t, totalTaskCount]
    );

    React.useEffect(() => {
        headerActionSlot?.setHeaderAction(headerFilterControl);

        return () => {
            headerActionSlot?.setHeaderAction(null);
        };
    }, [headerActionSlot, headerFilterControl]);

    React.useEffect(() => {
        if (!filterOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (filterPanelRef.current?.contains(target)) return;
            if (filterButtonRef.current?.contains(target)) return;
            setFilterOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setFilterOpen(false);
        };

        window.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [filterOpen]);

    const isBoardEmpty = columns.length === 0;
    const shouldLockVerticalScroll = !(loading || loadError) && isBoardEmpty && totalTaskCount === 0;
    const boardRootClassName = cn("relative z-10", !isBoardEmpty && "min-h-screen");
    const boardScrollClassName = cn(
        "scrollbar-hide flex cursor-grab select-none items-start gap-4 overflow-x-auto active:cursor-grabbing",
        isBoardEmpty ? "pb-0" : "pb-6"
    );

    React.useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflowY = html.style.overflowY;
        const prevBodyOverflowY = body.style.overflowY;

        if (shouldLockVerticalScroll) {
            html.style.overflowY = "hidden";
            body.style.overflowY = "hidden";
        }

        return () => {
            html.style.overflowY = prevHtmlOverflowY;
            body.style.overflowY = prevBodyOverflowY;
        };
    }, [shouldLockVerticalScroll]);

    if (loading) {
        return (
            <div className="relative z-10 min-h-screen">
                <div className="px-4 pt-6 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-4 text-sm text-zinc-700 backdrop-blur-sm">
                        {t("loadingBoard")}
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="relative z-10 min-h-screen">
                <div className="px-4 pt-6 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-rose-200 bg-white/70 px-4 py-4 text-rose-700 text-sm backdrop-blur-sm">
                        {loadError}
                    </div>
                    <div className="mt-3 px-4 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            className="rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 font-semibold text-sm text-zinc-900 backdrop-blur-sm hover:bg-white/80">
                            {t("reload")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const onColumnDraftChange = (v: string) => {
        setEditingColumn((p) => {
            const trimmed = v.trim();
            return {
                ...p,
                draft: v,
                error: trimmed ? null : t("enterStatusName")
            };
        });
    };

    return (
        <div className={boardRootClassName}>
            <TaskFormModal
                open={taskFormOpen}
                onClose={closeCreateTask}
                onSubmit={handleSubmitCreateTask}
                members={membersOptions}
                statuses={statusesOptions}
                defaultStatusId={taskFormColumnId}
            />

            <TaskDetailModal
                open={detailOpen}
                onClose={closeTaskDetail}
                taskId={detailTaskId}
                groupIdOverride={groupId}
                onDelete={handleDeleteFromDetail}
                onSaved={refreshSilently}
                groupDetailSnapshot={groupDetailSnapshot}
                groupMembersSnapshot={groupMembersSnapshot}
            />

            <ConfirmModal
                open={confirmModal.open}
                title={t("confirmDeleteStatus")}
                description={t("confirmDeleteStatusDesc", { title: confirmModal.columnTitle })}
                confirmLabel={t("deleteStatusButton")}
                cancelLabel={t("cancel")}
                onConfirm={() => void handleConfirmDeleteColumn()}
                onCancel={handleCancelDeleteColumn}
            />

            <ConfirmModal
                open={confirmDeleteTask.open}
                title={t("confirmDeleteTask")}
                description={t("confirmDeleteTaskDesc", { title: confirmDeleteTask.taskTitle })}
                confirmLabel={t("deleteTaskButton")}
                cancelLabel={t("cancel")}
                onConfirm={() => void handleConfirmDeleteTask()}
                onCancel={handleCancelDeleteTask}
            />

            <ConfirmModal
                open={permissionModal.open}
                title={permissionModal.title || t("permissionDenied")}
                description={permissionModal.message}
                confirmLabel={t("close")}
                onConfirm={closePermissionModal}
                onCancel={closePermissionModal}
                hideCancel
            />

            <div className="px-4 pt-2 sm:px-6 lg:px-8">
                {/* Đặt thanh cuộn phụ phía trên board để người dùng cuộn ngang thuận tiện hơn. */}
                {showTopScrollbar ? (
                    <div className="sticky top-0 z-30 pb-2">
                        <div
                            ref={topScrollRef}
                            onScroll={handleTopScroll}
                            className="board-bottom-scrollbar overflow-x-auto overflow-y-hidden">
                            <div style={{ width: topScrollbarWidth, height: 1 }} />
                        </div>
                    </div>
                ) : null}

                {!mounted ? (
                    <div
                        ref={boardScrollRef}
                        onScroll={handleBoardScroll}
                        onPointerDown={handleBoardPointerDown}
                        onPointerMove={handleBoardPointerMove}
                        onPointerUp={handleBoardPointerUp}
                        onPointerCancel={handleBoardPointerCancel}
                        className={boardScrollClassName}>
                        {columns.map((col) => (
                            <ColumnView
                                key={col.id}
                                col={col}
                                tasks={filteredBoard[col.id] ?? []}
                                taskIds={taskIdsByCol[col.id] ?? []}
                                statusId={col.id}
                                isTasksLoaded={statusLoadedMap[col.id] ?? false}
                                isTasksLoading={statusLoadingMap[col.id] ?? false}
                                taskLoadError={statusLoadErrors[col.id] ?? null}
                                onRetryLoadTasks={loadTasksForStatus}
                                onOpenCreateTask={openCreateTask}
                                onOpenTaskDetail={openTaskDetail}
                                dndEnabled={false}
                                canEditTask={canEditTask}
                                canEditStatus={canEditStatus}
                                canDeleteStatus={canDeleteStatus}
                                canDeleteTask={canDeleteTask}
                                canAddTask={canAddTask}
                                headerDragProps={undefined}
                                ghost={null}
                                creatingTask={creatingTask}
                                onRenameColumnInline={startEditColumn}
                                onDeleteColumn={onDeleteColumn}
                                taskEditState={editingTask}
                                onTaskStartEdit={onTaskStartEdit}
                                onTaskCancelEdit={onTaskCancelEdit}
                                onTaskDraftChange={(v) => setEditingTask((p) => ({ ...p, draft: v }))}
                                onTaskCommitEdit={onTaskCommitEdit}
                                onDeleteTask={onDeleteTask}
                                isColumnEditing={editingColumn.id === col.id}
                                columnDraft={editingColumn.id === col.id ? editingColumn.draft : ""}
                                columnError={editingColumn.id === col.id ? editingColumn.error : null}
                                onColumnDraftChange={onColumnDraftChange}
                                onColumnCommit={() => void commitEditColumn()}
                                onColumnCancel={cancelEditColumn}
                                isLoadingMore={statusLoadingMoreMap[col.id] ?? false}
                                hasMore={statusHasMoreMap[col.id] ?? false}
                                onLoadMore={loadMoreForStatus}
                                totalCount={statusTotalCountMap[col.id]}
                            />
                        ))}

                        {canAddStatus && (
                            <div className="min-w-[300px] max-w-[300px] self-start">
                                <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                            </div>
                        )}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={collisionDetection}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragCancel={handleDragCancel}
                        onDragEnd={handleDragEnd}>
                        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                            <div
                                ref={boardScrollRef}
                                onScroll={handleBoardScroll}
                                onPointerDown={handleBoardPointerDown}
                                onPointerMove={handleBoardPointerMove}
                                onPointerUp={handleBoardPointerUp}
                                onPointerCancel={handleBoardPointerCancel}
                                className={boardScrollClassName}>
                                {columns.map((col) => (
                                    <SortableColumn
                                        key={col.id}
                                        col={col}
                                        tasks={filteredBoard[col.id] ?? []}
                                        taskIds={taskIdsByCol[col.id] ?? []}
                                        statusId={col.id}
                                        isTasksLoaded={statusLoadedMap[col.id] ?? false}
                                        isTasksLoading={statusLoadingMap[col.id] ?? false}
                                        taskLoadError={statusLoadErrors[col.id] ?? null}
                                        onRetryLoadTasks={loadTasksForStatus}
                                        onOpenCreateTask={openCreateTask}
                                        onOpenTaskDetail={openTaskDetail}
                                        dndEnabled={!isRestricted}
                                        canEditTask={canEditTask}
                                        canEditStatus={canEditStatus}
                                        canDeleteStatus={canDeleteStatus}
                                        canDeleteTask={canDeleteTask}
                                        canAddTask={canAddTask}
                                        ghost={ghost}
                                        creatingTask={creatingTask}
                                        onRenameColumnInline={startEditColumn}
                                        onDeleteColumn={onDeleteColumn}
                                        taskEditState={editingTask}
                                        onTaskStartEdit={onTaskStartEdit}
                                        onTaskCancelEdit={onTaskCancelEdit}
                                        onTaskDraftChange={(v) => setEditingTask((p) => ({ ...p, draft: v }))}
                                        onTaskCommitEdit={onTaskCommitEdit}
                                        onDeleteTask={onDeleteTask}
                                        isColumnEditing={editingColumn.id === col.id}
                                        columnDraft={editingColumn.id === col.id ? editingColumn.draft : ""}
                                        columnError={editingColumn.id === col.id ? editingColumn.error : null}
                                        onColumnDraftChange={onColumnDraftChange}
                                        onColumnCommit={() => void commitEditColumn()}
                                        onColumnCancel={cancelEditColumn}
                                        isLoadingMore={statusLoadingMoreMap[col.id] ?? false}
                                        hasMore={statusHasMoreMap[col.id] ?? false}
                                        onLoadMore={loadMoreForStatus}
                                        totalCount={statusTotalCountMap[col.id]}
                                    />
                                ))}

                                {canAddStatus && (
                                    <div className="min-w-[300px] max-w-[300px] self-start">
                                        <AddColumnInline isSubmitting={creatingColumn} onSubmit={submitAddColumn} />
                                    </div>
                                )}
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeTask ? (
                                <TaskOverlay task={activeTask} />
                            ) : activeColumn ? (
                                <ColumnOverlay col={activeColumn} tasks={board[activeColumn.id] ?? []} />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
}

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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { enUS, vi as viLocale } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import "react-day-picker/dist/style.css";
import {
    CalendarDays,
    CheckSquare2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
    X
} from "lucide-react";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
import { TaskProgressEditor } from "@/components/features/home/Editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type PersonalTaskBoardResponse = components["schemas"]["PersonalTaskBoardResponse"];
type PersonalTaskBoardResponseApiResponse = components["schemas"]["PersonalTaskBoardResponseApiResponse"];
type PersonalTaskStatusResponseApiResponse = components["schemas"]["PersonalTaskStatusResponseApiResponse"];
type TaskItemResponseApiResponse = components["schemas"]["TaskItemResponseApiResponse"];
type ObjectApiResponse = components["schemas"]["ObjectApiResponse"];
type TaskItemResponse = components["schemas"]["TaskItemResponse"];

type PersonalTaskStatusDto = {
    statusId?: string;
    position?: number;
    statusName?: string | null;
    userId?: string;
    taskList?: TaskItemResponse[] | null;
};

type PersonalTaskItemResponse = TaskItemResponse & {
    personalStatus?: PersonalTaskStatusDto | null;
};

type InlineTaskFormValues = {
    title: string;
    description: string;
    statusId: string | null;
    priority: "low" | "medium" | "high";
    severity: "minor" | "moderate" | "major" | "critical";
    startDate?: string;
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
};

type InlineTaskFormOption = {
    value: string;
    label: string;
};

type PopupPosition = {
    top: number;
    left: number;
    width: number;
};

type ColumnId = string;

const DROP_PREFIX = "drop:";
const END_PREFIX = "drop-end:";

const selectItemClassName =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isInteractiveElement(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return false;

    return !!el.closest('button, input, textarea, select, option, a, [role="button"], [data-no-pan="true"]');
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

function toApiDateTime(value?: string | null) {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!(y && m && d)) return null;
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    return date.toISOString();
}

function addDays(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getTodayDateValue() {
    return formatDateToInputValue(startOfDay(new Date()));
}

function formatDateDisplay(value?: string, locale?: string, t?: (key: string) => string) {
    const date = parseDateString(value);
    const selectDateLabel = t ? t("selectDate") : "Select a date";
    if (!date) return selectDateLabel;

    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return t ? t("today") : "Today";
    if (diffDays === 1) return t ? t("tomorrow") : "Tomorrow";

    const normalizedLocale = locale?.includes("-") ? locale : locale === "vi" ? "vi-VN" : "en-US";

    return new Intl.DateTimeFormat(normalizedLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    }).format(target);
}

function normalizeIntlLocale(locale?: string) {
    if (!locale) return "en-US";
    if (locale.includes("-")) return locale;
    return locale === "vi" ? "vi-VN" : "en-US";
}

function formatMonthLabel(date: Date, locale?: string) {
    return new Intl.DateTimeFormat(normalizeIntlLocale(locale), { month: "long" }).format(date);
}

function buildApiUrl(path: string) {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const base = rawBase.replace(/\/+$/, "");

    if (!base) return "";
    if (/\/api$/i.test(base)) return `${base}${path.startsWith("/") ? path : `/${path}`}`;
    return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function buildPersonalTaskUrl() {
    return buildApiUrl("/Home/personal-task");
}

function buildCreatePersonalStatusUrl() {
    return buildApiUrl("/Home/personal-status");
}

function buildUpdatePersonalStatusUrl(statusId: string) {
    return buildApiUrl(`/Home/personal-status/${statusId}/update-detail`);
}

function buildDeletePersonalStatusUrl(statusId: string) {
    return buildApiUrl(`/Home/personal-status/${statusId}`);
}

function buildReorderPersonalStatusUrl() {
    return buildApiUrl("/Home/personal-status/reorder");
}

function buildCreatePersonalTaskUrl() {
    return buildApiUrl("/Task/create-personal-task");
}

function buildUpdatePersonalTaskUrl(taskId: string) {
    return buildApiUrl(`/Task/update-personal-task/${taskId}`);
}

function buildDeletePersonalTaskUrl(taskId: string) {
    return buildApiUrl(`/Task/delete-personal-task/${taskId}`);
}

function buildReorderPersonalTaskUrl() {
    return buildApiUrl("/Task/reorder-personal-task");
}

function extractBoardData(payload: unknown): PersonalTaskBoardResponse | null {
    const source = payload as
        | PersonalTaskBoardResponseApiResponse
        | {
            status?: string;
            data?: PersonalTaskBoardResponseApiResponse | PersonalTaskBoardResponse | null;
        }
        | null
        | undefined;

    const firstLayer = source?.data;

    if (firstLayer && typeof firstLayer === "object" && "personalTaskStatuses" in firstLayer) {
        return firstLayer as PersonalTaskBoardResponse;
    }

    if (
        firstLayer &&
        typeof firstLayer === "object" &&
        "data" in firstLayer &&
        (firstLayer as PersonalTaskBoardResponseApiResponse).data
    ) {
        return (firstLayer as PersonalTaskBoardResponseApiResponse).data ?? null;
    }

    if (
        source &&
        typeof source === "object" &&
        "data" in source &&
        (source as PersonalTaskBoardResponseApiResponse).data
    ) {
        return (source as PersonalTaskBoardResponseApiResponse).data ?? null;
    }

    return null;
}

function formatDueDate(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
}

function isOverdue(value?: string | null) {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
}

function priorityTone(value: "low" | "medium" | "high") {
    if (value === "high") return "text-rose-600";
    if (value === "medium") return "text-yellow-500";
    return "text-emerald-700";
}

function severityTone(value: "minor" | "moderate" | "major" | "critical") {
    if (value === "critical") return "text-red-600";
    if (value === "major") return "text-orange-600";
    if (value === "moderate") return "text-sky-600";
    return "text-emerald-600";
}

function priorityLabel(value: "low" | "medium" | "high") {
    if (value === "high") return "High";
    if (value === "medium") return "Medium";
    return "Low";
}

function severityLabel(value: "minor" | "moderate" | "major" | "critical", t?: (key: string) => string) {
    if (value === "critical") return t ? t("severityCritical") : "Critical";
    if (value === "major") return t ? t("severityMajor") : "Major";
    if (value === "moderate") return t ? t("severityModerate") : "Moderate";
    return t ? t("severityMinor") : "Minor";
}

function parseHoursInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return parsed;
}

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100] as const;

function normalizeProgressValue(n?: number | null) {
    if (typeof n !== "number" || !Number.isFinite(n)) return 0;
    const value = Math.floor(n);
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function shouldShowProgress(task?: Pick<TaskItemResponse, "progress"> | null) {
    const p = Number(task?.progress ?? 0);
    return p > 0 && p < 100;
}

function isTaskDone(task?: Pick<TaskItemResponse, "progress"> | null) {
    return Number(task?.progress ?? 0) >= 100;
}

function ProgressPill({ progress }: { progress: number }) {
    return (
        <span className="inline-flex h-7 items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 text-xs">
            {progress}%
        </span>
    );
}

import { CheckCircle2 } from "lucide-react";

function DonePill({ label = "Done" }: { label?: string } = {}) {
    return (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {label}
        </span>
    );
}

function taskSeverityToFormValue(value?: number | null): "minor" | "moderate" | "major" | "critical" {
    if (value === 3) return "critical";
    if (value === 2) return "major";
    if (value === 1) return "moderate";
    return "minor";
}

function priorityFromTask(value?: number | null): "low" | "medium" | "high" {
    if (value === 2) return "high";
    if (value === 1) return "medium";
    return "low";
}

function priorityDotColor(priority?: number | null) {
    if (priority === 2) return "bg-rose-500";
    if (priority === 1) return "bg-yellow-500";
    return "bg-emerald-500";
}

function findColumnOfTask(statuses: PersonalTaskStatusDto[], taskId: string): ColumnId | null {
    for (const status of statuses) {
        const found = (status.taskList ?? []).some((task) => String(task.taskId ?? "") === taskId);
        if (found && status.statusId) return String(status.statusId);
    }
    return null;
}

function findTaskInStatuses(statuses: PersonalTaskStatusDto[], taskId: string): PersonalTaskItemResponse | null {
    for (const status of statuses) {
        const found = ((status.taskList ?? []) as PersonalTaskItemResponse[]).find(
            (task) => String(task.taskId ?? "") === taskId
        );
        if (found) return found;
    }
    return null;
}

function resolveTaskStatusId(task: PersonalTaskItemResponse | null | undefined, statuses: PersonalTaskStatusDto[]) {
    const directStatusId = String(task?.personalStatus?.statusId ?? "").trim();
    if (directStatusId) return directStatusId;

    const taskId = String(task?.taskId ?? "").trim();
    if (!taskId) return null;

    return findColumnOfTask(statuses, taskId);
}

function normalizeBoardStatuses(input: PersonalTaskStatusDto[] | null | undefined): PersonalTaskStatusDto[] {
    return [...(input ?? [])]
        .map((status) => {
            const normalizedStatus: PersonalTaskStatusDto = {
                ...status,
                taskList: []
            };

            normalizedStatus.taskList = ((status.taskList ?? []) as PersonalTaskItemResponse[])
                .map((task) => ({
                    ...task,
                    personalStatus: {
                        ...(task.personalStatus ?? {}),
                        statusId: task.personalStatus?.statusId ?? status.statusId,
                        statusName: task.personalStatus?.statusName ?? status.statusName,
                        position: task.personalStatus?.position ?? status.position,
                        userId: task.personalStatus?.userId ?? status.userId
                    }
                }))
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            return normalizedStatus;
        })
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function filterDroppablesByType(droppables: DroppableContainer[], allow: Array<string>) {
    return droppables.filter((d) => {
        const t = d.data?.current?.type;
        return typeof t === "string" && allow.includes(t);
    });
}

function applyTaskDrop(args: { statuses: PersonalTaskStatusDto[]; activeTaskId: string; overRaw: string }) {
    const { statuses, activeTaskId, overRaw } = args;

    const overIsEnd = overRaw.startsWith(END_PREFIX);
    const overKey = overRaw.startsWith(DROP_PREFIX)
        ? overRaw.replace(DROP_PREFIX, "")
        : overRaw.startsWith(END_PREFIX)
            ? overRaw.replace(END_PREFIX, "")
            : overRaw;

    const fromCol = findColumnOfTask(statuses, activeTaskId);
    if (!fromCol) return null;

    let toCol: ColumnId | null = null;
    if (statuses.some((s) => String(s.statusId ?? "") === overKey)) toCol = overKey;
    else toCol = findColumnOfTask(statuses, overKey);

    if (!toCol) return null;

    const nextStatuses = statuses.map((s) => ({
        ...s,
        taskList: [...((s.taskList ?? []) as PersonalTaskItemResponse[])]
    }));

    const fromStatus = nextStatuses.find((s) => String(s.statusId ?? "") === fromCol);
    const toStatus = nextStatuses.find((s) => String(s.statusId ?? "") === toCol);

    if (!(fromStatus && toStatus)) return null;

    const fromTasks = fromStatus.taskList as PersonalTaskItemResponse[];
    const toTasks = fromCol === toCol ? fromTasks : (toStatus.taskList as PersonalTaskItemResponse[]);

    const fromIndex = fromTasks.findIndex((t) => String(t.taskId ?? "") === activeTaskId);
    if (fromIndex === -1) return null;

    const [moving] = fromTasks.splice(fromIndex, 1);

    if (fromCol === toCol) {
        if (overIsEnd) {
            fromTasks.push(moving);
        } else {
            const toIndex = fromTasks.findIndex((t) => String(t.taskId ?? "") === overKey);
            if (toIndex === -1) fromTasks.unshift(moving);
            else fromTasks.splice(Math.max(0, toIndex), 0, moving);
        }

        const newIndex = fromTasks.findIndex((t) => String(t.taskId ?? "") === activeTaskId);
        const prevTaskId = newIndex > 0 ? String(fromTasks[newIndex - 1].taskId ?? "") : null;
        const nextTaskId =
            newIndex >= 0 && newIndex < fromTasks.length - 1 ? String(fromTasks[newIndex + 1].taskId ?? "") : null;

        return {
            nextStatuses,
            fromCol,
            toCol,
            prevTaskId,
            nextTaskId
        };
    }

    moving.personalStatus = {
        ...(moving.personalStatus ?? {}),
        statusId: toStatus.statusId,
        statusName: toStatus.statusName,
        position: toStatus.position,
        userId: toStatus.userId
    };

    if (overIsEnd) {
        toTasks.push(moving);
    } else {
        const idx = toTasks.findIndex((t) => String(t.taskId ?? "") === overKey);
        if (idx !== -1) toTasks.splice(Math.max(0, idx), 0, moving);
        else toTasks.unshift(moving);
    }

    const newIndex = toTasks.findIndex((t) => String(t.taskId ?? "") === activeTaskId);
    const prevTaskId = newIndex > 0 ? String(toTasks[newIndex - 1].taskId ?? "") : null;
    const nextTaskId =
        newIndex >= 0 && newIndex < toTasks.length - 1 ? String(toTasks[newIndex + 1].taskId ?? "") : null;

    return {
        nextStatuses,
        fromCol,
        toCol,
        prevTaskId,
        nextTaskId
    };
}

function DuePill({
    due,
    overdue,
    done,
    t
}: {
    due: string;
    overdue: boolean;
    done?: boolean;
    t: (key: string) => string;
}) {
    if (done) return null;

    return (
        <div
            className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-2",
                overdue ? "text-rose-700" : "text-zinc-700"
            )}>
            <div className="flex min-w-0 items-center gap-2 leading-none">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <div className="whitespace-nowrap font-semibold text-xs">{due}</div>
            </div>
        </div>
    );
}

function SummaryCount({ count }: { count: number }) {
    return (
        <span
            className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2",
                "border border-zinc-200/70 bg-white",
                "font-semibold text-xs text-zinc-700",
                "shadow-[0_1px_0_rgba(0,0,0,0.03)]"
            )}>
            {count}
        </span>
    );
}

type HeaderDragProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef">;

function PortalDropdown({
    open,
    onClose,
    anchorRef,
    children
}: {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
    children: React.ReactNode;
}) {
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = React.useState(false);
    const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({
        top: 0,
        left: 0,
        width: 208
    });

    React.useEffect(() => setMounted(true), []);

    const syncPos = React.useCallback(() => {
        const a = anchorRef.current;
        if (!a) return;
        const r = a.getBoundingClientRect();
        const width = 208;
        const top = r.bottom + 8;
        const left = Math.max(8, r.right - width);
        setPos({ top, left, width });
    }, [anchorRef]);

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
            if (m && m.contains(t)) return;
            if (a && a.contains(t)) return;
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
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                danger ? "text-orange-700 hover:bg-orange-50" : "text-zinc-700 hover:bg-zinc-100"
            )}>
            <span className="grid h-5 w-5 place-items-center">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    zIndexClassName = "z-[10000]",
    onConfirm,
    onCancel
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    zIndexClassName?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;

    return createPortal(
        <div
            className={cn("fixed inset-0 flex items-center justify-center p-4", zIndexClassName)}
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
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-sm text-zinc-700 transition hover:bg-zinc-100">
                        {cancelLabel}
                    </button>
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

function AddColumnInline({
    isSubmitting,
    onSubmit,
    labels
}: {
    isSubmitting: boolean;
    onSubmit: (title: string) => Promise<void>;
    labels: {
        errorMessage: string;
        failedMessage: string;
        createStatus: string;
        enterStatusName: string;
        confirm: string;
        cancel: string;
    };
}) {
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
            setError(labels.errorMessage);
            inputRef.current?.focus();
            return;
        }

        try {
            setError(null);
            await onSubmit(trimmed);
            close();
        } catch (e: any) {
            setError(e?.message ?? labels.failedMessage);
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
                    "w-full rounded-[22px] bg-[linear-gradient(135deg,#F97316_0%,#F54A00_100%)] px-5 py-3.5 text-left font-semibold text-sm text-white shadow-[0_14px_28px_rgba(245,74,0,0.24)]",
                    "transition hover:brightness-105"
                )}>
                {labels.createStatus}
            </button>
        );
    }

    return (
        <div className="rounded-[24px] border border-white/85 bg-white/92 p-4 shadow-[0_12px_28px_rgba(148,163,184,0.14)]">
            <input
                ref={inputRef}
                value={title}
                maxLength={30}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                onKeyDown={onKeyDown}
                disabled={isSubmitting}
                placeholder={labels.enterStatusName}
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
                        "rounded-[18px] px-3.5 py-2 font-semibold text-sm text-white",
                        "bg-[linear-gradient(135deg,#F97316_0%,#F54A00_100%)] transition hover:brightness-105",
                        isSubmitting && "pointer-events-none opacity-60"
                    )}>
                    {labels.confirm}
                </button>
                <button
                    type="button"
                    onClick={close}
                    disabled={isSubmitting}
                    aria-label={labels.cancel}
                    className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700",
                        "transition hover:bg-zinc-50",
                        isSubmitting && "pointer-events-none opacity-60"
                    )}>
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function AddTaskButton({
    disabled,
    onClick,
    labels
}: {
    disabled: boolean;
    onClick: () => void;
    labels: { addTask: string };
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "mt-3 flex w-full items-center justify-center gap-2 rounded-[20px] px-3 py-3 font-semibold text-sm",
                "bg-[linear-gradient(135deg,#F97316_0%,#F54A00_100%)] text-white shadow-[0_14px_28px_rgba(245,74,0,0.20)]",
                "transition hover:brightness-105",
                disabled && "pointer-events-none opacity-60"
            )}>
            <Plus className="h-4 w-4" />
            {labels.addTask}
        </button>
    );
}

function PersonalTaskCard({
    task,
    columnId,
    isSubmitting,
    isDropTarget = false,
    onOpen,
    onRename,
    onDelete,
    t
}: {
    task: PersonalTaskItemResponse;
    columnId: string;
    isSubmitting: boolean;
    isDropTarget?: boolean;
    onOpen: (task: PersonalTaskItemResponse) => void;
    onRename: (task: PersonalTaskItemResponse, nextTitle: string) => Promise<void>;
    onDelete: (task: PersonalTaskItemResponse) => Promise<void>;
    t: (key: string) => string;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: String(task.taskId ?? ""),
        data: { type: "task", columnId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none"
    };

    const [openMenu, setOpenMenu] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [draftTitle, setDraftTitle] = React.useState((task.taskTitle || "").slice(0, 30));
    const btnRef = React.useRef<HTMLButtonElement | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        setDraftTitle((task.taskTitle || "").slice(0, 30));
    }, [task.taskTitle]);

    React.useEffect(() => {
        if (isEditing) {
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 0);
        }
    }, [isEditing]);

    const dueText = formatDueDate(task.dueDate);
    const overdue = isOverdue(task.dueDate);
    const untitledLabel = t ? t("untitledTask") : "Untitled task";
    const title = task.taskTitle || untitledLabel;
    const severity = taskSeverityToFormValue(task.taskSeverity);

    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const normalizedProgress = normalizeProgressValue(task.progress);

    const cancelEdit = () => {
        setDraftTitle(task.taskTitle || "");
        setIsEditing(false);
    };

    const submitEdit = async () => {
        const nextTitle = draftTitle.trim();

        if (!nextTitle) {
            cancelEdit();
            return;
        }

        if (nextTitle === (task.taskTitle || "").trim()) {
            setIsEditing(false);
            return;
        }

        try {
            await onRename(task, nextTitle);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to rename task:", error);
        }
    };

    return (
        <div
            ref={setNodeRef}
            data-no-pan="true"
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => {
                if (!isEditing) onOpen(task);
            }}
            onKeyDown={(e) => {
                if (isEditing) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(task);
                }
            }}
            className={cn(
                "group relative w-full select-none rounded-xl p-3",
                "cursor-grab border border-black/5 shadow-[0_1px_1px_rgba(9,30,66,0.08),0_0_0_1px_rgba(9,30,66,0.04)]",
                "transition focus-within:ring-2 focus-within:ring-blue-200/60 active:cursor-grabbing",
                isDropTarget && "ring-2 ring-blue-200/70 ring-offset-2 ring-offset-white",
                done
                    ? "bg-zinc-50 hover:bg-zinc-100/90 hover:shadow-[0_2px_6px_rgba(9,30,66,0.10),0_0_0_1px_rgba(9,30,66,0.04)]"
                    : "bg-white hover:bg-white hover:shadow-[0_4px_8px_rgba(9,30,66,0.16),0_0_0_1px_rgba(9,30,66,0.04)]"
            )}>
            {isDropTarget ? (
                <div className="-top-2 pointer-events-none absolute right-3 left-3 z-10 flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-[0_4px_14px_rgba(59,130,246,0.28)]" />
                    <div className="ml-2 h-1 flex-1 rounded-full bg-[linear-gradient(90deg,#3B82F6_0%,#60A5FA_100%)] shadow-[0_0_0_3px_rgba(59,130,246,0.10)]" />
                </div>
            ) : null}
            <div className="min-w-0">
                {!isEditing ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                                <div
                                    className={cn(
                                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                        priorityDotColor(task.taskPriority)
                                    )}
                                />
                                <div className="min-w-0 flex flex-1 flex-wrap items-center gap-1.5">
                                    <p
                                        className={cn(
                                            "min-w-0 flex-1 line-clamp-2 pr-1 font-medium text-sm leading-snug tracking-tight",
                                            done ? "text-zinc-500 line-through" : "text-zinc-900"
                                        )}>
                                        {title}
                                    </p>
                                </div>
                            </div>

                            <div
                                className="relative shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}>
                                <button
                                    ref={btnRef}
                                    type="button"
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMenu((v) => !v);
                                    }}
                                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                                    aria-label={t("menu")}>
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>

                                <PortalDropdown
                                    open={openMenu}
                                    onClose={() => setOpenMenu(false)}
                                    anchorRef={btnRef as React.RefObject<HTMLElement>}>
                                    <MenuItem
                                        icon={<Pencil className="h-4 w-4" />}
                                        label={t("editTaskName")}
                                        onClick={() => {
                                            setOpenMenu(false);
                                            setIsEditing(true);
                                        }}
                                    />
                                    <MenuItem
                                        icon={<Trash2 className="h-4 w-4" />}
                                        label={t("delete")}
                                        danger
                                        onClick={() => {
                                            setOpenMenu(false);
                                            void onDelete(task);
                                        }}
                                    />
                                </PortalDropdown>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {dueText ? <DuePill due={dueText} overdue={overdue} done={done} t={t} /> : null}
                            {severity ? (
                                <span
                                    className={cn(
                                        "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 py-1 font-semibold text-xs",
                                        done
                                            ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                                            : severity === "critical"
                                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                            : severity === "major"
                                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                            : severity === "moderate"
                                                        ? "border-sky-200 bg-sky-50 text-sky-700"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    )}>
                                    {severityLabel(severity, t)}
                                </span>
                            ) : null}
                            {showProgress ? <ProgressPill progress={normalizedProgress} /> : null}
                            {done ? <DonePill label={t("progressDone")} /> : null}
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
                        <input
                            ref={inputRef}
                            value={draftTitle}
                            maxLength={30}
                            disabled={isSubmitting}
                            onChange={(e) => setDraftTitle(e.target.value.slice(0, 30))}
                            onBlur={() => void submitEdit()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    void submitEdit();
                                }
                                if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelEdit();
                                }
                            }}
                            className={cn(
                                "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2",
                                "select-text font-semibold text-sm text-zinc-900 outline-none",
                                "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                            )}
                        />

                        <div className="text-right text-[11px] text-zinc-500">{draftTitle.length}/30</div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void submitEdit();
                                }}
                                className="rounded-lg bg-[#f54a00] px-3 py-2 font-semibold text-sm text-white hover:bg-[#f54a00]/70">
                                {t("save")}
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    cancelEdit();
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

function GhostTaskCard({ task, t }: { task: PersonalTaskItemResponse; t: (key: string) => string }) {
    const dueText = formatDueDate(task.dueDate);
    const severity = taskSeverityToFormValue(task.taskSeverity);
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const overdue = isOverdue(task.dueDate);
    const normalizedProgress = normalizeProgressValue(task.progress);
    const untitledLabel = t("untitledTask");
    const title = task.taskTitle || untitledLabel;

    return (
        <div className="rounded-xl border-2 border-blue-300 border-dashed bg-blue-50/70 p-3">
            <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-2">
                    <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", priorityDotColor(task.taskPriority))} />
                    <div className="min-w-0 flex flex-1 flex-wrap items-center gap-1.5">
                        <p
                            className={cn(
                                "min-w-0 flex-1 line-clamp-2 font-medium text-sm leading-snug tracking-tight",
                                done ? "text-zinc-500 line-through" : "text-zinc-800"
                            )}>
                            {title}
                        </p>
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {dueText ? <DuePill due={dueText} overdue={overdue} done={done} t={t} /> : null}
                    {severity ? (
                        <span
                            className={cn(
                                "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 py-1 font-semibold text-xs",
                                done
                                    ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                                    : severity === "critical"
                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                        : severity === "major"
                                            ? "border-orange-200 bg-orange-50 text-orange-700"
                                        : severity === "moderate"
                                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            )}>
                            {severityLabel(severity, t)}
                        </span>
                    ) : null}
                    {showProgress ? <ProgressPill progress={normalizedProgress} /> : null}
                    {done ? <DonePill label={t("progressDone")} /> : null}
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

function TaskOverlay({ task, t }: { task: PersonalTaskItemResponse; t: (key: string) => string }) {
    const dueText = formatDueDate(task.dueDate);
    const overdue = isOverdue(task.dueDate);
    const untitledLabel = t ? t("untitledTask") : "Untitled task";
    const severity = taskSeverityToFormValue(task.taskSeverity);
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const normalizedProgress = normalizeProgressValue(task.progress);

    return (
        <div className="min-w-[300px] rounded-xl border border-black/5 bg-white p-4 shadow-xl">
            <p className={cn("font-semibold text-sm leading-5", done ? "text-zinc-500 line-through" : "text-zinc-900")}>
                {task.taskTitle || untitledLabel}
            </p>

            {dueText || severity || done || showProgress ? (
                <div className="mt-3 space-y-2">
                    {dueText ? <DuePill due={dueText} overdue={overdue} done={done} t={t} /> : null}

                    {severity || done || showProgress ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {severity ? (
                                <span
                                    className={cn(
                                        "inline-flex shrink-0 items-center rounded-xl border px-3 py-2 font-semibold text-xs",
                                        done
                                            ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                                            : severity === "critical"
                                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                            : severity === "major"
                                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                            : severity === "moderate"
                                                        ? "border-sky-200 bg-sky-50 text-sky-700"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    )}>
                                    {severityLabel(severity, t)}
                                </span>
                            ) : null}

                            {showProgress ? <ProgressPill progress={normalizedProgress} /> : null}
                            {done ? <DonePill label={t("progressDone")} /> : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function ColumnOverlay({ status, t }: { status: PersonalTaskStatusDto; t: (key: string) => string }) {
    const tasks = ((status.taskList ?? []) as PersonalTaskItemResponse[]).slice(0, 3);

    return (
        <div className="min-w-[300px] max-w-[300px]">
            <div className="rounded-[28px] border border-[#E7DDD3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,241,0.98))] shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
                <div className="rounded-t-[28px] border-[#EFE6DD] border-b bg-[linear-gradient(180deg,rgba(248,244,240,0.98),rgba(241,236,231,0.96))] px-4 pt-4 pb-3">
                    <p className="truncate font-bold text-sm text-zinc-900">{status.statusName || t("untitledStatus")}</p>
                    <p className="text-[11px] text-zinc-600">{t("movingStatus")}</p>
                </div>

                <div className="px-3 pb-3">
                    <div className="rounded-b-[24px] bg-transparent pt-3">
                        {tasks.map((task) => (
                            <div key={String(task.taskId)} className="mb-2 last:mb-0">
                                <div className="rounded-[24px] border border-white/85 bg-white/95 p-3 shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                                    <p className="font-semibold text-sm text-zinc-900">
                                        {task.taskTitle || t("untitledTask")}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {tasks.length === 0 ? (
                            <div className="rounded-[24px] border border-[#D8D1CA] border-dashed bg-white/95 px-3 py-8 text-center text-sm text-zinc-500">
                                {t("emptyStatus")}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ColumnView({
    status,
    isSubmitting,
    onCreateTask,
    onOpenTask,
    onRenameStatus,
    onDeleteStatus,
    onRenameTask,
    onDeleteTask,
    ghost,
    dropTargetTaskId,
    isEditing,
    columnDraft,
    columnError,
    onColumnDraftChange,
    onColumnCommit,
    onColumnCancel,
    headerDragProps,
    t
}: {
    status: PersonalTaskStatusDto;
    isSubmitting: boolean;
    onCreateTask: (status: PersonalTaskStatusDto) => Promise<void>;
    onOpenTask: (task: PersonalTaskItemResponse) => void;
    onRenameStatus: (status: PersonalTaskStatusDto) => void;
    onDeleteStatus: (status: PersonalTaskStatusDto) => Promise<void>;
    onRenameTask: (task: PersonalTaskItemResponse, nextTitle: string) => Promise<void>;
    onDeleteTask: (task: PersonalTaskItemResponse) => Promise<void>;
    ghost?: { task: PersonalTaskItemResponse; toCol: ColumnId; index: number } | null;
    dropTargetTaskId?: string | null;
    isEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (value: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
    headerDragProps?: HeaderDragProps;
    t: (key: string) => string;
}) {
    const statusId = String(status.statusId ?? "");
    const tasks = [...((status.taskList ?? []) as PersonalTaskItemResponse[])];
    const taskIds = tasks.map((task) => String(task.taskId ?? ""));
    const statusName = status.statusName || "Untitled";

    const dropId = `${DROP_PREFIX}${statusId}`;
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: dropId,
        data: { type: "column-drop", columnId: statusId }
    });

    const endDropId = `${END_PREFIX}${statusId}`;
    const { setNodeRef: setEndRef, isOver: isOverEnd } = useDroppable({
        id: endDropId,
        data: { type: "column-end", columnId: statusId }
    });

    const shouldShowGhost = !!ghost && ghost.toCol === statusId;

    const btnRef = React.useRef<HTMLButtonElement | null>(null);
    const [openMenu, setOpenMenu] = React.useState(false);

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (isEditing) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isEditing]);

    return (
        <div className="rounded-[28px] border border-[#E7DDD3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,241,0.98))] shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
            <div
                ref={(node) => headerDragProps?.setActivatorNodeRef?.(node as HTMLElement | null)}
                data-no-pan="true"
                {...(headerDragProps?.attributes ?? {})}
                {...(headerDragProps?.listeners ?? {})}
                style={{ touchAction: "none" }}
                className={cn(
                    "sticky top-0 z-10 rounded-t-[28px] border-[#EFE6DD] border-b bg-[linear-gradient(180deg,rgba(248,244,240,0.98),rgba(241,236,231,0.96))] px-4 pt-4 pb-3",
                    "cursor-grab select-none active:cursor-grabbing"
                )}>
                <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0 flex-1">
                            {!isEditing ? (
                                <p className="truncate font-bold text-sm text-zinc-900">{statusName}</p>
                            ) : (
                                <div className="space-y-1">
                                    <input
                                        ref={inputRef}
                                        value={columnDraft}
                                        maxLength={30}
                                        disabled={isSubmitting}
                                        onChange={(e) => onColumnDraftChange(e.target.value)}
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
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#D9D2CC] bg-white px-2 font-semibold text-xs text-zinc-700 shadow-sm">
                            {tasks.length}
                        </span>

                        <div className="relative">
                            <button
                                ref={btnRef}
                                type="button"
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenu((v) => !v);
                                }}
                                className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-700"
                                aria-label={t("columnMenu")}>
                                <MoreHorizontal className="h-5 w-5" />
                            </button>

                            <PortalDropdown
                                open={openMenu}
                                onClose={() => setOpenMenu(false)}
                                anchorRef={btnRef as React.RefObject<HTMLElement>}>
                                <MenuItem
                                    icon={<Pencil className="h-4 w-4" />}
                                    label={t("editStatusName")}
                                    onClick={() => {
                                        setOpenMenu(false);
                                        void onRenameStatus(status);
                                    }}
                                />
                                <MenuItem
                                    icon={<Trash2 className="h-4 w-4" />}
                                    label={t("deleteStatus")}
                                    danger
                                    onClick={() => {
                                        setOpenMenu(false);
                                        void onDeleteStatus(status);
                                    }}
                                />
                            </PortalDropdown>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-3 pb-3">
                <div
                    ref={setDroppableRef}
                    className={cn(
                        "rounded-b-[24px] bg-transparent pt-3 transition",
                        isOver && "bg-[linear-gradient(180deg,rgba(250,246,241,0.9),rgba(245,239,233,0.82))]"
                    )}>
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        <div className="relative max-h-[68vh] space-y-2 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {tasks.map((task) => (
                                <PersonalTaskCard
                                    key={String(task.taskId)}
                                    task={task}
                                    columnId={statusId}
                                    isSubmitting={isSubmitting}
                                    isDropTarget={dropTargetTaskId === String(task.taskId ?? "")}
                                    onOpen={onOpenTask}
                                    onRename={onRenameTask}
                                    onDelete={onDeleteTask}
                                    t={t}
                                />
                            ))}

                            {tasks.length === 0 ? (
                                <div className="rounded-xl border border-[#D8D1CA] border-dashed bg-white px-3 py-8 text-center">
                                    <div className="font-semibold text-sm text-zinc-700">
                                        {t("noTasksInStatus")}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">{t("addTaskHint")}</div>
                                </div>
                            ) : null}

                            <div
                                ref={setEndRef}
                                className={cn(
                                    "rounded-xl transition-all duration-150",
                                    shouldShowGhost && ghost?.index === tasks.length ? "h-6" : "h-3",
                                    isOverEnd
                                        ? "border border-blue-300/80 bg-[linear-gradient(90deg,rgba(191,219,254,0.72),rgba(219,234,254,0.96))] shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
                                        : "border border-transparent bg-transparent"
                                )}
                            />
                        </div>
                    </SortableContext>

                    <AddTaskButton
                        disabled={isSubmitting}
                        onClick={() => void onCreateTask(status)}
                        labels={{ addTask: t("addTask") }}
                    />
                </div>
            </div>
        </div>
    );
}

function SortableColumn(props: {
    status: PersonalTaskStatusDto;
    isSubmitting: boolean;
    onCreateTask: (status: PersonalTaskStatusDto) => Promise<void>;
    onOpenTask: (task: PersonalTaskItemResponse) => void;
    onRenameStatus: (status: PersonalTaskStatusDto) => void;
    onDeleteStatus: (status: PersonalTaskStatusDto) => Promise<void>;
    onRenameTask: (task: PersonalTaskItemResponse, nextTitle: string) => Promise<void>;
    onDeleteTask: (task: PersonalTaskItemResponse) => Promise<void>;
    ghost?: { task: PersonalTaskItemResponse; toCol: ColumnId; index: number } | null;
    dropTargetTaskId?: string | null;
    isEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (value: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
    t: (key: string) => string;
}) {
    const {
        status,
        isSubmitting,
        onCreateTask,
        onOpenTask,
        onRenameStatus,
        onDeleteStatus,
        onRenameTask,
        onDeleteTask,
        ghost,
        dropTargetTaskId,
        isEditing,
        columnDraft,
        columnError,
        onColumnDraftChange,
        onColumnCommit,
        onColumnCancel,
        t
    } = props;

    const statusId = String(status.statusId ?? "");

    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: statusId,
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
        <div ref={setNodeRef} style={style} className="min-w-[300px] max-w-[300px] self-start">
            <ColumnView
                status={status}
                isSubmitting={isSubmitting}
                onCreateTask={onCreateTask}
                onOpenTask={onOpenTask}
                onRenameStatus={onRenameStatus}
                onDeleteStatus={onDeleteStatus}
                onRenameTask={onRenameTask}
                onDeleteTask={onDeleteTask}
                ghost={ghost}
                dropTargetTaskId={dropTargetTaskId}
                isEditing={isEditing}
                columnDraft={columnDraft}
                columnError={columnError}
                onColumnDraftChange={onColumnDraftChange}
                onColumnCommit={onColumnCommit}
                onColumnCancel={onColumnCancel}
                headerDragProps={{ attributes, listeners, setActivatorNodeRef }}
                t={t}
            />
        </div>
    );
}

function InlineDatePicker({
    label,
    value,
    onChange,
    min,
    disabled = false,
    error,
    t
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    disabled?: boolean;
    error?: string | null;
    t: (key: string) => string;
}) {
    const locale = useLocale();
    const pickerLocale = React.useMemo(() => (locale === "vi" ? viLocale : enUS), [locale]);
    const monthOptions = React.useMemo(
        () =>
            Array.from({ length: 12 }, (_, index) => {
                const value = String(index);
                const label = formatMonthLabel(new Date(2026, index, 1), locale);
                return { value, label };
            }),
        [locale]
    );
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

        let left = rect.left;
        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }
        if (left < viewportPadding) {
            left = viewportPadding;
        }

        setPopupPosition({
            top: 20,
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

    const handleMonthChange = (value: string) => {
        const nextMonth = Number(value);
        setMonth(new Date(month.getFullYear(), nextMonth, 1));
    };

    const handleYearChange = (value: string) => {
        const nextYear = Number(value);
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

    return (
        <>
            <div className="relative">
                <div className="font-semibold text-sm text-zinc-600">{label}</div>

                <button
                    ref={triggerRef}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        if (!disabled) setOpen((v) => !v);
                    }}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        error ? "border-rose-300 bg-white text-zinc-800" : "",
                        disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-500 opacity-70"
                            : open
                                ? "border-orange-400 bg-orange-50 text-zinc-900 ring-2 ring-orange-100"
                                : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                    )}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                disabled
                                    ? "bg-zinc-100 text-zinc-400"
                                    : open
                                        ? "bg-orange-100 text-orange-600"
                                        : "bg-zinc-100 text-zinc-500"
                            )}>
                            <CalendarDays className="h-4 w-4" />
                        </div>

                        <span
                            className={cn(
                                "truncate text-left",
                                value ? "font-medium text-zinc-900" : "text-zinc-400",
                                disabled && "text-zinc-500"
                            )}>
                            {formatDateDisplay(value, locale, t)}
                        </span>
                    </div>
                </button>
                {error ? <div className="mt-1 font-medium text-rose-600 text-xs">{error}</div> : null}
            </div>

            {mounted && open && popupPosition
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
                        }}>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex-1">
                                <Select value={String(month.getMonth())} onValueChange={handleMonthChange}>
                                    <SelectTrigger className="h-12 w-full font-semibold text-base">
                                        <SelectValue placeholder={monthOptions[month.getMonth()]?.label} />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                    {monthOptions[month.getMonth()]?.label} {month.getFullYear()}
                                </div>

                                <button
                                    type="button"
                                    onClick={goNextMonth}
                                    className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>

                            <DayPicker
                                mode="single"
                                locale={pickerLocale}
                                month={month}
                                onMonthChange={setMonth}
                                selected={selectedDate}
                                onSelect={pickDate}
                                disabled={minDate ? { before: minDate } : undefined}
                                showOutsideDays
                                className="w-full"
                                styles={{
                                    day: { outline: "none", boxShadow: "none" },
                                    button: { outline: "none", boxShadow: "none" }
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
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                                {t("today")}
                            </button>

                            <button
                                type="button"
                                onClick={() => pickDate(addDays(new Date(), 1))}
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                                {t("tomorrow")}
                            </button>

                            <button
                                type="button"
                                onClick={() => pickDate(addDays(new Date(), 7))}
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                                {t("nextWeek")}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                }}
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-rose-500 hover:bg-rose-50">
                                {t("noDate")}
                            </button>
                        </div>
                    </div>,
                    document.body
                )
                : null}
        </>
    );
}

function InlineTaskFormModal({
    open,
    onClose,
    onSubmit,
    statuses,
    defaultStatusId,
    t
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: InlineTaskFormValues) => Promise<void> | void;
    statuses: InlineTaskFormOption[];
    defaultStatusId?: string | null;
    t: (key: string) => string;
}) {
    const [mounted, setMounted] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [statusId, setStatusId] = React.useState<string | null>(defaultStatusId ?? statuses[0]?.value ?? null);
    const [priority, setPriority] = React.useState<"low" | "medium" | "high">("low");
    const [severity, setSeverity] = React.useState<"minor" | "moderate" | "major" | "critical">("minor");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [estimatedHours, setEstimatedHours] = React.useState("");
    const [actualHours, setActualHours] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!open) return;

        setError(null);
        setSubmitting(false);
        setTitle("");
        setDescription("");
        setStatusId(defaultStatusId ?? statuses[0]?.value ?? null);
        setPriority("low");
        setSeverity("minor");
        setStartDate("");
        setDueDate("");
        setEstimatedHours("");
        setActualHours("");
    }, [open, defaultStatusId, statuses]);

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const selectedStatusName = React.useMemo(() => {
        return statuses.find((s) => s.value === statusId)?.label ?? statuses[0]?.label ?? "";
    }, [statuses, statusId]);

    const canSubmit = title.trim().length > 0 && !submitting;

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();
        const desc = description.trim();

        if (!trimmedTitle) {
            setError(t("pleaseEnterTaskTitle"));
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setError(t("startDateAfterDueDate"));
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await onSubmit({
                title: trimmedTitle,
                description: desc,
                statusId,
                priority,
                severity,
                startDate: startDate || undefined,
                dueDate: dueDate || undefined,
                estimatedHours: parseHoursInput(estimatedHours),
                actualHours: parseHoursInput(actualHours)
            });

            onClose();
        } catch (e: any) {
            setError(e?.message ?? t("createTaskFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (!(open && mounted)) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}>
            <div
                className="w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-zinc-200 border-b px-7 py-5">
                    <div className="min-w-0 flex-1">
                        <div className="relative max-w-[520px]">
                            <input
                                value={title}
                                maxLength={30}
                                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                                placeholder={t("enterTaskName")}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 pb-7 pt-2 font-extrabold text-[28px] text-zinc-900 leading-none outline-none"
                            />

                            <div className="pointer-events-none absolute right-3 bottom-2 text-[11px] text-zinc-500">
                                {title.length}/30
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label={t("close")}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-7 py-5">
                    {error ? (
                        <div className="mt-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("status")}</div>
                            <Select
                                value={statusId ?? statuses[0]?.value ?? ""}
                                onValueChange={setStatusId}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800">
                                    <span className="truncate">{selectedStatusName}</span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-54 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    {statuses.map((s) => (
                                        <SelectItem key={s.value} value={s.value} className={selectItemClassName}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("priority")}</div>
                            <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm">
                                    <span className={cn("inline-flex items-center gap-2", priorityTone(priority))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {priority === "high"
                                            ? t("priorityHigh")
                                            : priority === "medium"
                                                ? t("priorityMedium")
                                                : t("priorityLow")}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="low" className={selectItemClassName}>
                                        {t("priorityLow")}
                                    </SelectItem>
                                    <SelectItem value="medium" className={selectItemClassName}>
                                        {t("priorityMedium")}
                                    </SelectItem>
                                    <SelectItem value="high" className={selectItemClassName}>
                                        {t("priorityHigh")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("severity")}</div>
                            <Select
                                value={severity}
                                onValueChange={(v) => setSeverity(v as "minor" | "moderate" | "major" | "critical")}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm">
                                    <span className={cn("inline-flex items-center gap-2", severityTone(severity))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {severity === "critical"
                                            ? t("severityCritical")
                                            : severity === "major"
                                                ? t("severityMajor")
                                                : severity === "moderate"
                                                    ? t("severityModerate")
                                                    : t("severityMinor")}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="minor" className={selectItemClassName}>
                                        {t("severityMinor")}
                                    </SelectItem>
                                    <SelectItem value="moderate" className={selectItemClassName}>
                                        {t("severityModerate")}
                                    </SelectItem>
                                    <SelectItem value="major" className={selectItemClassName}>
                                        {t("severityMajor")}
                                    </SelectItem>
                                    <SelectItem value="critical" className={selectItemClassName}>
                                        {t("severityCritical")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="sm:col-span-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <InlineDatePicker
                                label={t("startDate")}
                                value={startDate}
                                onChange={setStartDate}
                                t={t}
                            />

                            <InlineDatePicker
                                label={t("dueDate")}
                                value={dueDate}
                                onChange={setDueDate}
                                min={startDate || undefined}
                                t={t}
                            />
                        </div>

                        <div className="sm:col-span-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <div className="font-semibold text-sm text-zinc-600">{t("estimatedHours")}</div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                    placeholder={t("estimatedHoursPlaceholder")}
                                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none"
                                />
                            </div>

                            <div>
                                <div className="font-semibold text-sm text-zinc-600">{t("actualHours")}</div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={actualHours}
                                    onChange={(e) => setActualHours(e.target.value)}
                                    placeholder={t("actualHoursPlaceholder")}
                                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="font-semibold text-sm text-zinc-600">{t("description")}</div>
                        <div className="relative mt-2">
                            <textarea
                                value={description}
                                maxLength={200}
                                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                                placeholder={t("enterTaskDescription")}
                                className="min-h-30 w-full rounded-xl border border-zinc-200 bg-white p-4 pb-8 text-sm text-zinc-800 outline-none"
                            />

                            <div className="pointer-events-none absolute right-4 bottom-3 text-[11px] text-zinc-500">
                                {description.length}/200
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-zinc-200 border-t bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 rounded-xl border border-zinc-300 bg-white px-8 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                        {t("cancel")}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            void handleSubmit();
                        }}
                        disabled={!canSubmit}
                        className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                        {submitting ? t("creatingTask") : t("createTask")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function PersonalTaskDetailModal({
    open,
    task,
    statuses,
    saving,
    onClose,
    onSave,
    onDelete,
    t
}: {
    open: boolean;
    task: PersonalTaskItemResponse | null;
    statuses: InlineTaskFormOption[];
    saving: boolean;
    onClose: () => void;
    onSave: (args: {
        task: PersonalTaskItemResponse;
        values: {
            title: string;
            description: string;
            statusId: string | null;
            priority: "low" | "medium" | "high";
            severity: "minor" | "moderate" | "major" | "critical";
            startDate: string;
            dueDate: string;
            progress: number;
            estimatedHours?: number;
            actualHours?: number;
        };
    }) => Promise<void>;
    onDelete: (task: PersonalTaskItemResponse) => Promise<void>;
    t: (key: string) => string;
}) {
    const locale = useLocale();
    const [mounted, setMounted] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [titleError, setTitleError] = React.useState<string | null>(null);
    const [startDateError, setStartDateError] = React.useState<string | null>(null);
    const [dueDateError, setDueDateError] = React.useState<string | null>(null);
    const lastEditedDateFieldRef = React.useRef<"start" | "due" | null>(null);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [statusId, setStatusId] = React.useState<string | null>(null);
    const [priority, setPriority] = React.useState<"low" | "medium" | "high">("low");
    const [severity, setSeverity] = React.useState<"minor" | "moderate" | "major" | "critical">("minor");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [progress, setProgress] = React.useState("0");
    const [estimatedHours, setEstimatedHours] = React.useState("");
    const [actualHours, setActualHours] = React.useState("");
    const clearDateErrors = React.useCallback(() => {
        setStartDateError(null);
        setDueDateError(null);
    }, []);
    const originalDueDateValue = React.useMemo(() => toDateInputValue(task?.dueDate ?? null), [task?.dueDate]);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!(open && task)) return;

        setError(null);
        setTitleError(null);
        clearDateErrors();
        lastEditedDateFieldRef.current = null;
        setIsEditing(false);
        setTitle((task.taskTitle ?? "").slice(0, 30));
        setDescription((task.taskDescription ?? "").slice(0, 200));
        setStatusId(task.personalStatus?.statusId ?? statuses[0]?.value ?? null);
        setPriority(priorityFromTask(task.taskPriority));
        setSeverity(taskSeverityToFormValue(task.taskSeverity));
        setStartDate(toDateInputValue(task.startDate ?? null));
        setDueDate(toDateInputValue(task.dueDate ?? null));
        setProgress(String(normalizeProgressValue(task.progress)));
        setEstimatedHours(task.estimatedHours != null ? String(task.estimatedHours) : "");
        setActualHours(task.actualHours != null ? String(task.actualHours) : "");
    }, [open, task, statuses, clearDateErrors]);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const selectedStatusName = React.useMemo(() => {
        return statuses.find((s) => s.value === statusId)?.label ?? task?.personalStatus?.statusName ?? statuses[0]?.label ?? "";
    }, [statuses, statusId, task?.personalStatus?.statusName]);

    const applyDateRangeValidation = React.useCallback(
        (changedField: "start" | "due", nextStartDate: string, nextDueDate: string) => {
            clearDateErrors();

            if (!(nextStartDate && nextDueDate) || nextStartDate <= nextDueDate) {
                return true;
            }

            if (changedField === "start") {
                setStartDateError(t("startDateAfterDueDate"));
            } else {
                setDueDateError(t("dueDateBeforeStartDate"));
            }

            return false;
        },
        [clearDateErrors, t]
    );
    const hasValidationErrors = Boolean(titleError || startDateError || dueDateError);

    const handleSave = async () => {
        if (!task) return;

        setError(null);
        setTitleError(null);
        clearDateErrors();

        const nextTitle = title.trim();

        if (!nextTitle) {
            setTitleError(t("taskNameRequired"));
            return;
        }

        if (!applyDateRangeValidation(lastEditedDateFieldRef.current ?? "start", startDate, dueDate)) {
            return;
        }

        try {
            await onSave({
                task,
                values: {
                    title: nextTitle,
                    description,
                    statusId,
                    priority,
                    severity,
                    startDate,
                    dueDate,
                    progress: normalizeProgressValue(Number(progress)),
                    estimatedHours: parseHoursInput(estimatedHours),
                    actualHours: parseHoursInput(actualHours)
                }
            });

            setIsEditing(false);
        } catch (e: any) {
            setError(e?.message ?? t("updateTaskFailed"));
        }
    };

    if (!(open && mounted && task)) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}>
            <div
                className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-zinc-200 border-b px-7 py-5">
                    <div className="min-w-0 flex-1">
                        {isEditing ? (
                            <div className="max-w-[520px]">
                                <div className="relative">
                                    <input
                                        value={title}
                                        maxLength={30}
                                        onChange={(e) => {
                                            const nextValue = e.target.value.slice(0, 30);
                                            setTitle(nextValue);

                                            if (titleError && nextValue.trim()) {
                                                setTitleError(null);
                                            }
                                        }}
                                        placeholder={t("taskName")}
                                        className="mt-0 w-full rounded-xl border border-zinc-200 bg-white px-3 pb-7 pt-2 font-extrabold text-[28px] text-zinc-900 leading-none outline-none"
                                    />
                                    <div className="pointer-events-none absolute right-3 bottom-2 text-[11px] text-zinc-500">
                                        {title.length}/30
                                    </div>
                                </div>
                                {titleError ? (
                                    <div className="mt-2 font-medium text-rose-600 text-sm">{titleError}</div>
                                ) : null}
                            </div>
                        ) : (
                            <h2 className="mt-0 min-w-0 truncate whitespace-nowrap font-extrabold text-[30px] text-zinc-900 leading-none">
                                {title || t("untitledTask")}
                            </h2>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label={t("close")}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-5">
                    {error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("status")}</div>
                            <Select
                                value={statusId ?? statuses[0]?.value ?? ""}
                                onValueChange={setStatusId}
                                disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className="truncate">{selectedStatusName}</span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-54 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    {statuses.map((s) => (
                                        <SelectItem key={s.value} value={s.value} className={selectItemClassName}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("priority")}</div>
                            <Select
                                value={priority}
                                onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
                                disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className={cn("inline-flex items-center gap-2", priorityTone(priority))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {priority === "high"
                                            ? t("priorityHigh")
                                            : priority === "medium"
                                                ? t("priorityMedium")
                                                : t("priorityLow")}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="low" className={selectItemClassName}>
                                        {t("priorityLow")}
                                    </SelectItem>
                                    <SelectItem value="medium" className={selectItemClassName}>
                                        {t("priorityMedium")}
                                    </SelectItem>
                                    <SelectItem value="high" className={selectItemClassName}>
                                        {t("priorityHigh")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("severity")}</div>
                            <Select
                                value={severity}
                                onValueChange={(v) => setSeverity(v as "minor" | "moderate" | "major" | "critical")}
                                disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className={cn("inline-flex items-center gap-2", severityTone(severity))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {severity === "critical"
                                            ? t("severityCritical")
                                            : severity === "major"
                                                ? t("severityMajor")
                                                : severity === "moderate"
                                                    ? t("severityModerate")
                                                    : t("severityMinor")}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="minor" className={selectItemClassName}>
                                        {t("severityMinor")}
                                    </SelectItem>
                                    <SelectItem value="moderate" className={selectItemClassName}>
                                        {t("severityModerate")}
                                    </SelectItem>
                                    <SelectItem value="major" className={selectItemClassName}>
                                        {t("severityMajor")}
                                    </SelectItem>
                                    <SelectItem value="critical" className={selectItemClassName}>
                                        {t("severityCritical")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="sm:col-span-2 xl:col-span-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <InlineDatePicker
                                label={t("startDate")}
                                value={startDate}
                                onChange={(nextValue) => {
                                    setError(null);
                                    lastEditedDateFieldRef.current = "start";
                                    setStartDate(nextValue);
                                    applyDateRangeValidation("start", nextValue, dueDate);
                                }}
                                disabled={!isEditing}
                                error={startDateError}
                                t={t}
                            />

                            <InlineDatePicker
                                label={t("dueDate")}
                                value={dueDate}
                                onChange={(nextValue) => {
                                    setError(null);
                                    lastEditedDateFieldRef.current = "due";
                                    setDueDate(nextValue);
                                    applyDateRangeValidation("due", startDate, nextValue);
                                }}
                                disabled={!isEditing}
                                error={dueDateError}
                                t={t}
                            />
                        </div>

                        <div className="sm:col-span-2 xl:col-span-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <div className="font-semibold text-sm text-zinc-600">{t("estimatedHours")}</div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                    disabled={!isEditing}
                                    placeholder={t("estimatedHoursPlaceholder")}
                                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                                />
                            </div>

                            <div>
                                <div className="font-semibold text-sm text-zinc-600">{t("actualHours")}</div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={actualHours}
                                    onChange={(e) => setActualHours(e.target.value)}
                                    disabled={!isEditing}
                                    placeholder={t("actualHoursPlaceholder")}
                                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                                />
                            </div>
                        </div>

                        <TaskProgressEditor value={progress} onChange={setProgress} disabled={!isEditing} />
                    </div>

                    <div className="mt-6">
                        <div className="font-semibold text-sm text-zinc-600">{t("description")}</div>
                        <div className="relative mt-2">
                            <textarea
                                value={description}
                                maxLength={200}
                                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                                disabled={!isEditing}
                                placeholder={t("noDescription")}
                                className="min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white p-4 pb-8 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                            />

                            {isEditing ? (
                                <div className="pointer-events-none absolute right-4 bottom-3 text-[11px] text-zinc-500">
                                    {description.length}/200
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-zinc-200 border-t bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={() => void onDelete(task)}
                        disabled={saving}
                        className="h-11 rounded-xl border border-rose-200 bg-white px-6 font-semibold text-rose-600 text-sm hover:bg-rose-50 disabled:opacity-60">
                        {t("delete")}
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 rounded-xl border border-zinc-300 bg-white px-8 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                            {t("cancel")}
                        </button>

                        {isEditing ? (
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving || hasValidationErrors}
                                className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:cursor-not-allowed disabled:bg-[#f54a00]/40 disabled:text-white/90 disabled:hover:bg-[#f54a00]/40">
                                {saving ? t("saving") : t("saveChange")}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80">
                                {t("edit")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function HomePersonalTaskScreen() {
    const t = useTranslations("HomePersonalTask");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [board, setBoard] = React.useState<PersonalTaskBoardResponse | null>(null);
    const [statuses, setStatuses] = React.useState<PersonalTaskStatusDto[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [mounted, setMounted] = React.useState(false);

    const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
    const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);
    const [overId, setOverId] = React.useState<string | null>(null);

    const [confirmDeleteColumn, setConfirmDeleteColumn] = React.useState<{
        open: boolean;
        status: PersonalTaskStatusDto | null;
    }>({
        open: false,
        status: null
    });

    const [confirmDeleteTask, setConfirmDeleteTask] = React.useState<{
        open: boolean;
        task: PersonalTaskItemResponse | null;
        fromDetail?: boolean;
    }>({
        open: false,
        task: null,
        fromDetail: false
    });

    const [taskFormOpen, setTaskFormOpen] = React.useState(false);
    const [taskFormStatusId, setTaskFormStatusId] = React.useState<string | null>(null);

    const [detailTask, setDetailTask] = React.useState<PersonalTaskItemResponse | null>(null);
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [pendingExternalTaskId, setPendingExternalTaskId] = React.useState<string | null>(null);

    const [editingColumn, setEditingColumn] = React.useState<{
        id: string | null;
        draft: string;
        error: string | null;
    }>({
        id: null,
        draft: "",
        error: null
    });

    const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
    const dragScrollRef = React.useRef({
        isDown: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        moved: false
    });

    React.useEffect(() => setMounted(true), []);

    const handleBoardPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (isInteractiveElement(e.target)) return;

        const el = boardScrollRef.current;
        if (!el) return;

        dragScrollRef.current = {
            isDown: true,
            startX: e.clientX,
            startY: e.clientY,
            scrollLeft: el.scrollLeft,
            scrollTop: el.scrollTop,
            moved: false
        };

        el.setPointerCapture(e.pointerId);
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

    const endBoardPointerDrag = React.useCallback(() => {
        dragScrollRef.current.isDown = false;
    }, []);

    const handleBoardPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
        endBoardPointerDrag();
    };

    const handleBoardPointerCancel: React.PointerEventHandler<HTMLDivElement> = () => {
        endBoardPointerDrag();
    };

    const fetchBoard = React.useCallback(async () => {
        try {
            const url = buildPersonalTaskUrl();

            if (!url) {
                setBoard(null);
                setLoadError("Thiếu NEXT_PUBLIC_API_BASE_URL.");
                return;
            }

            const response = await apiFetch<PersonalTaskBoardResponseApiResponse>(url, {
                method: "GET"
            });

            const nextBoard = extractBoardData(response);

            if (nextBoard) {
                setBoard(nextBoard);
                setLoadError(null);
            } else {
                console.error("Home personal task response format unexpected:", response);
                setBoard(null);
                setLoadError(t("failedLoadPersonalTask"));
            }
        } catch (error: any) {
            console.error("Failed to fetch personal board:", error);
            setBoard(null);
            setLoadError(error?.message ?? t("failedLoadPersonalTaskData"));
        }
    }, []);

    React.useEffect(() => {
        let isMounted = true;

        const run = async () => {
            try {
                await fetchBoard();
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void run();

        return () => {
            isMounted = false;
        };
    }, [fetchBoard]);

    React.useEffect(() => {
        const nextStatuses = normalizeBoardStatuses(board?.personalTaskStatuses as PersonalTaskStatusDto[] | null | undefined);

        setStatuses(nextStatuses);
    }, [board]);

    const statusOptions = React.useMemo<InlineTaskFormOption[]>(
        () =>
            statuses.map((status) => ({
                value: String(status.statusId ?? ""),
                label: String(status.statusName ?? "Untitled")
            })),
        [statuses]
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    React.useEffect(() => {
        const isDragging = !!(activeTaskId || activeColumnId);
        if (!isDragging) return;

        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        const prevHtmlOverscroll = html.style.overscrollBehavior;
        const prevBodyOverscroll = body.style.overscrollBehavior;
        const prevBodyTouchAction = body.style.touchAction;

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        html.style.overscrollBehavior = "none";
        body.style.overscrollBehavior = "none";
        body.style.touchAction = "none";

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
            html.style.overscrollBehavior = prevHtmlOverscroll;
            body.style.overscrollBehavior = prevBodyOverscroll;
            body.style.touchAction = prevBodyTouchAction;
        };
    }, [activeTaskId, activeColumnId]);

    const columnIds = React.useMemo(() => statuses.map((s) => String(s.statusId ?? "")), [statuses]);

    const activeTask = React.useMemo(() => {
        if (!activeTaskId) return null;
        return findTaskInStatuses(statuses, activeTaskId);
    }, [statuses, activeTaskId]);

    const activeColumn = React.useMemo(() => {
        if (!activeColumnId) return null;
        return statuses.find((s) => String(s.statusId ?? "") === activeColumnId) ?? null;
    }, [statuses, activeColumnId]);

    const ghost = React.useMemo(() => {
        if (!(activeTaskId && overId)) return null;

        const task = findTaskInStatuses(statuses, activeTaskId);
        if (!task) return null;

        const overKey = overId.startsWith(DROP_PREFIX)
            ? overId.replace(DROP_PREFIX, "")
            : overId.startsWith(END_PREFIX)
                ? overId.replace(END_PREFIX, "")
                : overId;

        let toCol: ColumnId | null = null;
        if (statuses.some((s) => String(s.statusId ?? "") === overKey)) toCol = overKey;
        else toCol = findColumnOfTask(statuses, overKey);

        if (!toCol) return null;

        const toStatus = statuses.find((s) => String(s.statusId ?? "") === toCol);
        const toTasks = (toStatus?.taskList ?? []) as PersonalTaskItemResponse[];

        if (overId.startsWith(END_PREFIX)) {
            return { task, toCol, index: toTasks.length };
        }

        const idx = toTasks.findIndex((t) => String(t.taskId ?? "") === overKey);
        return { task, toCol, index: idx !== -1 ? idx : 0 };
    }, [statuses, activeTaskId, overId]);

    const dropTargetTaskId = React.useMemo(() => {
        if (!overId) return null;
        if (overId.startsWith(DROP_PREFIX) || overId.startsWith(END_PREFIX)) return null;
        return overId;
    }, [overId]);

    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;

        if (activeType === "column") {
            const onlyColumns = filterDroppablesByType(args.droppableContainers, ["column"]);
            return closestCenter({ ...args, droppableContainers: onlyColumns });
        }

        const allow = filterDroppablesByType(args.droppableContainers, ["task", "column-drop", "column-end"]);
        const pointerHits = pointerWithin({ ...args, droppableContainers: allow });
        if (pointerHits.length > 0) return pointerHits;
        return closestCorners({ ...args, droppableContainers: allow });
    }, []);

    const handleOpenTaskDetail = React.useCallback((task: PersonalTaskItemResponse) => {
        const resolvedStatusId = resolveTaskStatusId(task, statuses);
        const resolvedStatus = statuses.find((status) => String(status.statusId ?? "") === String(resolvedStatusId ?? ""));

        setDetailTask({
            ...task,
            personalStatus: {
                ...(task.personalStatus ?? {}),
                statusId: resolvedStatusId ?? task.personalStatus?.statusId,
                statusName: resolvedStatus?.statusName ?? task.personalStatus?.statusName,
                position: resolvedStatus?.position ?? task.personalStatus?.position,
                userId: resolvedStatus?.userId ?? task.personalStatus?.userId
            }
        });
        setDetailOpen(true);
    }, [statuses]);

    const openTaskById = React.useCallback((taskId: string) => {
        const normalizedTaskId = String(taskId ?? "").trim();
        if (!normalizedTaskId) return false;

        const foundTask = findTaskInStatuses(statuses, normalizedTaskId);
        if (!foundTask) {
            setPendingExternalTaskId(normalizedTaskId);
            return false;
        }

        setPendingExternalTaskId(null);
        handleOpenTaskDetail(foundTask);
        return true;
    }, [handleOpenTaskDetail, statuses]);

    React.useEffect(() => {
        const onOpenExternal = (event: Event) => {
            const customEvent = event as CustomEvent<{ taskId?: string }>;
            openTaskById(String(customEvent.detail?.taskId ?? ""));
        };

        window.addEventListener("home:open-personal-task-detail", onOpenExternal as EventListener);
        return () => window.removeEventListener("home:open-personal-task-detail", onOpenExternal as EventListener);
    }, [openTaskById]);

    React.useEffect(() => {
        if (!pendingExternalTaskId) return;
        openTaskById(pendingExternalTaskId);
    }, [openTaskById, pendingExternalTaskId]);

    React.useEffect(() => {
        const requestedTaskId = String(searchParams?.get("personalTaskId") ?? "").trim();
        if (!requestedTaskId) return;

        document.getElementById("home-personal-task-section")?.scrollIntoView({ behavior: "smooth", block: "start" });

        if (!openTaskById(requestedTaskId)) return;

        const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
        nextParams.delete("personalTaskId");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [openTaskById, pathname, router, searchParams]);

    const handleCloseTaskDetail = React.useCallback(() => {
        if (confirmDeleteTask.open && confirmDeleteTask.fromDetail) return;
        setDetailOpen(false);
        setDetailTask(null);
    }, [confirmDeleteTask.open, confirmDeleteTask.fromDetail]);

    const handleCreateColumn = React.useCallback(
        async (title: string) => {
            try {
                setIsSubmitting(true);

                await apiFetch<PersonalTaskStatusResponseApiResponse>(buildCreatePersonalStatusUrl(), {
                    method: "POST",
                    body: JSON.stringify({
                        statusName: title.trim()
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                void fetchBoard().catch((error) => {
                    console.error("Failed to refresh personal task board after creating column:", error);
                });
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard]
    );

    const handleRenameColumn = React.useCallback((status: PersonalTaskStatusDto) => {
        if (!status.statusId) return;

        setEditingColumn({
            id: String(status.statusId),
            draft: String(status.statusName ?? "").slice(0, 30),
            error: null
        });
    }, []);

    const handleColumnDraftChange = React.useCallback(
        (value: string) => {
            setEditingColumn((prev) => {
                const nextDraft = value.slice(0, 30);
                const trimmed = nextDraft.trim();

                if (!trimmed) {
                    return {
                        ...prev,
                        draft: nextDraft,
                        error: t("pleaseEnterStatusName")
                    };
                }

                const duplicated = statuses.some(
                    (s) =>
                        String(s.statusId ?? "") !== String(prev.id ?? "") &&
                        String(s.statusName ?? "")
                            .trim()
                            .toLowerCase() === trimmed.toLowerCase()
                );

                return {
                    ...prev,
                    draft: nextDraft,
                    error: duplicated ? t("statusNameDuplicated") : null
                };
            });
        },
        [statuses]
    );

    const cancelEditColumn = React.useCallback(() => {
        setEditingColumn({
            id: null,
            draft: "",
            error: null
        });
    }, []);

    const commitEditColumn = React.useCallback(async () => {
        const id = editingColumn.id;
        const nextName = editingColumn.draft.trim();

        if (!id) return;

        if (!nextName) {
            setEditingColumn((prev) => ({
                ...prev,
                error: t("pleaseEnterStatusName")
            }));
            return;
        }

        const duplicated = statuses.some(
            (s) =>
                String(s.statusId ?? "") !== String(id) &&
                String(s.statusName ?? "")
                    .trim()
                    .toLowerCase() === nextName.toLowerCase()
        );

        if (duplicated) {
            setEditingColumn((prev) => ({
                ...prev,
                error: t("statusNameDuplicated")
            }));
            return;
        }

        try {
            setIsSubmitting(true);

            await apiFetch<PersonalTaskStatusResponseApiResponse>(buildUpdatePersonalStatusUrl(String(id)), {
                method: "PUT",
                body: JSON.stringify({
                    statusName: nextName
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            });

            void fetchBoard().catch((error) => {
                console.error("Failed to refresh personal task board after updating column:", error);
            });

            setEditingColumn({
                id: null,
                draft: "",
                error: null
            });
        } catch (error: any) {
            console.error("Failed to update personal status:", error);
            setEditingColumn((prev) => ({
                ...prev,
                error: error?.message ?? t("updateStatusFailed")
            }));
        } finally {
            setIsSubmitting(false);
        }
    }, [editingColumn, statuses, fetchBoard]);

    const handleDeleteColumn = React.useCallback(async () => {
        const status = confirmDeleteColumn.status;
        if (!status?.statusId) return;

        try {
            setIsSubmitting(true);

            const tasks = status.taskList ?? [];
            for (const task of tasks) {
                if (task.taskId) {
                    try {
                        await apiFetch<ObjectApiResponse>(buildDeletePersonalTaskUrl(String(task.taskId)), {
                            method: "DELETE"
                        });
                    } catch (error) {
                        console.error("Failed to delete personal task:", error);
                    }
                }
            }

            await apiFetch<ObjectApiResponse>(buildDeletePersonalStatusUrl(String(status.statusId)), {
                method: "DELETE"
            });

            void fetchBoard().catch((error) => {
                console.error("Failed to refresh personal task board after deleting column:", error);
            });
        } catch (error) {
            console.error("Failed to delete personal status:", error);
        } finally {
            setIsSubmitting(false);
            setConfirmDeleteColumn({ open: false, status: null });
        }
    }, [confirmDeleteColumn.status, fetchBoard]);

    const handleOpenCreateTask = React.useCallback(async (status: PersonalTaskStatusDto) => {
        setTaskFormStatusId(status.statusId ?? null);
        setTaskFormOpen(true);
    }, []);

    const handleCloseCreateTask = React.useCallback(() => {
        setTaskFormOpen(false);
        setTaskFormStatusId(null);
    }, []);

    const handleSubmitCreateTask = React.useCallback(
        async (values: InlineTaskFormValues) => {
            try {
                setIsSubmitting(true);

                const payload = {
                    taskName: values.title.trim(),
                    taskDescription: values.description.trim() || null,
                    personalStatusId: values.statusId ?? null,
                    startDate: toApiDateTime(values.startDate),
                    dueDate: toApiDateTime(values.dueDate),
                    estimatedHours: values.estimatedHours ?? null,
                    actualHours: values.actualHours ?? null,
                    taskPriority: values.priority === "high" ? 2 : values.priority === "medium" ? 1 : 0,
                    taskSeverity:
                        values.severity === "critical"
                            ? 3
                            : values.severity === "major"
                                ? 2
                                : values.severity === "moderate"
                                    ? 1
                                    : 0
                };

                console.log("create-personal-task payload:", payload);

                await apiFetch<TaskItemResponseApiResponse>(buildCreatePersonalTaskUrl(), {
                    method: "POST",
                    body: JSON.stringify(payload),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                void fetchBoard().catch((error) => {
                    console.error("Failed to refresh personal task board after creating task:", error);
                });
                handleCloseCreateTask();
            } catch (error) {
                console.error("Failed to create personal task:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard, handleCloseCreateTask, t]
    );

    const handleRenameTask = React.useCallback(
        async (task: PersonalTaskItemResponse, nextTitle: string) => {
            if (!task.taskId) return;
            if (!nextTitle.trim()) return;

            try {
                setIsSubmitting(true);

                await apiFetch<TaskItemResponseApiResponse>(buildUpdatePersonalTaskUrl(String(task.taskId)), {
                    method: "PUT",
                    body: JSON.stringify({
                        taskName: nextTitle.trim(),
                        dueDate: task.dueDate ?? null,
                        startDate: task.startDate ?? null,
                        progress: task.progress ?? null,
                        estimatedHours: task.estimatedHours ?? null,
                        actualHours: task.actualHours ?? null,
                        taskDescription: task.taskDescription ?? null,
                        taskPriority: task.taskPriority,
                        taskSeverity: task.taskSeverity,
                        personalStatusId: resolveTaskStatusId(task, statuses)
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                void fetchBoard().catch((error) => {
                    console.error("Failed to refresh personal task board after renaming task:", error);
                });
            } catch (error) {
                console.error("Failed to update personal task:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard, statuses]
    );

    const handleSaveTaskDetail = React.useCallback(
        async ({
            task,
            values
        }: {
            task: PersonalTaskItemResponse;
            values: {
                title: string;
                description: string;
                statusId: string | null;
                priority: "low" | "medium" | "high";
                severity: "minor" | "moderate" | "major" | "critical";
                startDate: string;
                dueDate: string;
                progress: number;
                estimatedHours?: number;
                actualHours?: number;
            };
        }) => {
            if (!task.taskId) return;

            try {
                setIsSubmitting(true);
                const resolvedStatusId = values.statusId ?? resolveTaskStatusId(task, statuses);
                const nextStatus = statuses.find((s) => String(s.statusId ?? "") === String(resolvedStatusId ?? ""));
                const originalDueDateValue = toDateInputValue(task.dueDate ?? null);

                const nextStartDate = toApiDateTime(values.startDate) ?? undefined;
                const nextDueDate = toApiDateTime(values.dueDate) ?? undefined;
                const nextPriority: 0 | 1 | 2 = values.priority === "high" ? 2 : values.priority === "medium" ? 1 : 0;
                const nextSeverity: 0 | 1 | 2 | 3 =
                    values.severity === "critical"
                        ? 3
                        : values.severity === "major"
                            ? 2
                            : values.severity === "moderate"
                                ? 1
                                : 0;

                await apiFetch<TaskItemResponseApiResponse>(buildUpdatePersonalTaskUrl(String(task.taskId)), {
                    method: "PUT",
                    body: JSON.stringify({
                        taskName: values.title.trim(),
                        taskDescription: values.description.trim() || null,
                        personalStatusId: resolvedStatusId,
                        startDate: nextStartDate ?? null,
                        dueDate: nextDueDate ?? null,
                        progress: values.progress,
                        estimatedHours: values.estimatedHours ?? null,
                        actualHours: values.actualHours ?? null,
                        taskPriority: nextPriority,
                        taskSeverity: nextSeverity
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                setStatuses((prevStatuses) => {
                    const normalizedTaskId = String(task.taskId ?? "");
                    const nextStatuses = prevStatuses.map((status) => ({
                        ...status,
                        taskList: [...((status.taskList ?? []) as PersonalTaskItemResponse[])]
                    }));

                    let updatedTask: PersonalTaskItemResponse | null = null;
                    let sourceStatusId: string | null = null;
                    let sourceTaskIndex = -1;

                    for (const status of nextStatuses) {
                        const tasks = status.taskList as PersonalTaskItemResponse[];
                        const taskIndex = tasks.findIndex((item) => String(item.taskId ?? "") === normalizedTaskId);
                        if (taskIndex === -1) continue;

                        const [currentTask] = tasks.splice(taskIndex, 1);
                        sourceStatusId = String(status.statusId ?? "");
                        sourceTaskIndex = taskIndex;
                        updatedTask = {
                            ...currentTask,
                            taskTitle: values.title.trim(),
                            taskDescription: values.description.trim() || null,
                            progress: values.progress,
                            personalStatus: {
                                ...(currentTask.personalStatus ?? {}),
                                statusId: resolvedStatusId ?? undefined,
                                statusName: nextStatus?.statusName ?? currentTask.personalStatus?.statusName ?? null,
                                position: nextStatus?.position ?? currentTask.personalStatus?.position,
                                userId: nextStatus?.userId ?? currentTask.personalStatus?.userId
                            },
                            startDate: nextStartDate,
                            dueDate: nextDueDate,
                            estimatedHours: values.estimatedHours ?? undefined,
                            actualHours: values.actualHours ?? undefined,
                            taskPriority: nextPriority,
                            taskSeverity: nextSeverity
                        };
                        break;
                    }

                    if (!updatedTask) return prevStatuses;

                    const targetStatusId = String(resolvedStatusId ?? "");
                    const targetStatus = nextStatuses.find((status) => String(status.statusId ?? "") === targetStatusId);

                    if (!targetStatus) {
                        if (sourceStatusId) {
                            const sourceStatus = nextStatuses.find(
                                (status) => String(status.statusId ?? "") === sourceStatusId
                            );
                            if (sourceStatus?.taskList) {
                                sourceStatus.taskList.splice(Math.max(0, sourceTaskIndex), 0, updatedTask);
                            }
                        }
                        return nextStatuses;
                    }

                    if (sourceStatusId === targetStatusId && targetStatus.taskList) {
                        targetStatus.taskList.splice(Math.max(0, sourceTaskIndex), 0, updatedTask);
                    } else {
                        targetStatus.taskList?.push(updatedTask);
                    }
                    return nextStatuses;
                });

                setDetailTask((prev) => {
                    if (!prev || String(prev.taskId) !== String(task.taskId)) return prev;

                    return {
                        ...prev,
                        taskTitle: values.title.trim(),
                        taskDescription: values.description.trim() || null,
                        progress: values.progress,
                        personalStatus: {
                            ...(prev.personalStatus ?? {}),
                            statusId: resolvedStatusId ?? undefined,
                            statusName: nextStatus?.statusName ?? prev.personalStatus?.statusName ?? null,
                            position: nextStatus?.position ?? prev.personalStatus?.position,
                            userId: nextStatus?.userId ?? prev.personalStatus?.userId
                        },
                        startDate: nextStartDate,
                        dueDate: nextDueDate,
                        estimatedHours: values.estimatedHours ?? undefined,
                        actualHours: values.actualHours ?? undefined,
                        taskPriority: nextPriority,
                        taskSeverity: nextSeverity
                    };
                });

                                toast({
                                    description: t("saveSuccess"),
                                    variant: "success"
                                });

                                void fetchBoard().catch((error) => {
                                    console.error("Failed to refresh personal task board after update:", error);
                                });
            } catch (error) {
                console.error("Failed to update personal task detail:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard, statuses, t, toast]
    );

    const handleDeleteTask = React.useCallback(async () => {
        const task = confirmDeleteTask.task;
        if (!task?.taskId) return;

        try {
            setIsSubmitting(true);

            await apiFetch<ObjectApiResponse>(buildDeletePersonalTaskUrl(String(task.taskId)), {
                method: "DELETE"
            });

            void fetchBoard().catch((error) => {
                console.error("Failed to refresh personal task board after deleting task:", error);
            });

            if (detailTask?.taskId && String(detailTask.taskId) === String(task.taskId)) {
                setDetailOpen(false);
                setDetailTask(null);
            }
        } catch (error) {
            console.error("Failed to delete personal task:", error);
        } finally {
            setIsSubmitting(false);
            setConfirmDeleteTask({ open: false, task: null, fromDetail: false });
        }
    }, [confirmDeleteTask.task, detailTask?.taskId, fetchBoard]);

    const handleReorderColumns = React.useCallback(
        async (statusId: string, prevStatusId?: string | null, nextStatusId?: string | null) => {
            try {
                await apiFetch<ObjectApiResponse>(buildReorderPersonalStatusUrl(), {
                    method: "PUT",
                    body: JSON.stringify({
                        statusId,
                        prevStatusId: prevStatusId ?? null,
                        nextStatusId: nextStatusId ?? null
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            } catch (error) {
                console.error("Failed to reorder personal status:", error);
                throw error;
            }
        },
        []
    );

    const handleReorderTasks = React.useCallback(
        async (
            taskId: string,
            targetStatusId?: string | null,
            prevTaskId?: string | null,
            nextTaskId?: string | null
        ) => {
            try {
                await apiFetch<ObjectApiResponse>(buildReorderPersonalTaskUrl(), {
                    method: "PUT",
                    body: JSON.stringify({
                        taskId,
                        targetStatusId: targetStatusId ?? null,
                        prevTaskId: prevTaskId ?? null,
                        nextTaskId: nextTaskId ?? null
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            } catch (error) {
                console.error("Failed to reorder personal task:", error);
                throw error;
            }
        },
        []
    );

    const handleDragStart = React.useCallback((e: DragStartEvent) => {
        setOverId(null);
        const type = e.active.data.current?.type;
        if (type === "task") setActiveTaskId(String(e.active.id));
        if (type === "column") setActiveColumnId(String(e.active.id));
    }, []);

    const handleDragOver = React.useCallback((e: DragOverEvent) => {
        const next = e.over?.id ? String(e.over.id) : null;
        setOverId(next);
    }, []);

    const handleDragCancel = React.useCallback((_e: DragCancelEvent) => {
        setActiveTaskId(null);
        setActiveColumnId(null);
        setOverId(null);
    }, []);

    const handleDragEnd = React.useCallback(
        (e: DragEndEvent) => {
            const activeType = e.active.data.current?.type;
            const overRaw = e.over?.id ? String(e.over.id) : null;

            setActiveTaskId(null);
            setActiveColumnId(null);
            setOverId(null);

            if (!overRaw) return;

            if (activeType === "task") {
                const activeId = String(e.active.id);
                const prevStatuses = statuses;

                const dropped = applyTaskDrop({
                    statuses,
                    activeTaskId: activeId,
                    overRaw
                });

                if (!dropped) return;

                setStatuses(dropped.nextStatuses);

                void (async () => {
                    try {
                        await handleReorderTasks(activeId, dropped.toCol, dropped.prevTaskId, dropped.nextTaskId);
                    } catch {
                        setStatuses(prevStatuses);
                    }
                })();

                return;
            }

            if (activeType === "column") {
                const activeColId = String(e.active.id);
                let overColId = String(overRaw);

                if (overColId.startsWith(DROP_PREFIX)) overColId = overColId.replace(DROP_PREFIX, "");
                if (overColId.startsWith(END_PREFIX)) overColId = overColId.replace(END_PREFIX, "");

                if (!statuses.some((s) => String(s.statusId ?? "") === overColId)) {
                    const maybeTaskCol = findColumnOfTask(statuses, overColId);
                    if (maybeTaskCol) overColId = maybeTaskCol;
                }

                if (!statuses.some((s) => String(s.statusId ?? "") === overColId)) return;
                if (activeColId === overColId) return;

                const oldIndex = statuses.findIndex((s) => String(s.statusId ?? "") === activeColId);
                const newIndex = statuses.findIndex((s) => String(s.statusId ?? "") === overColId);
                if (oldIndex === -1 || newIndex === -1) return;

                const prevStatuses = statuses;
                const nextStatuses = arrayMove(statuses, oldIndex, newIndex);

                setStatuses(nextStatuses);

                const movedIndex = nextStatuses.findIndex((s) => String(s.statusId ?? "") === activeColId);
                const prevStatusId = movedIndex > 0 ? String(nextStatuses[movedIndex - 1].statusId ?? "") : null;
                const nextStatusId =
                    movedIndex < nextStatuses.length - 1 ? String(nextStatuses[movedIndex + 1].statusId ?? "") : null;

                void (async () => {
                    try {
                        await handleReorderColumns(activeColId, prevStatusId, nextStatusId);
                    } catch {
                        setStatuses(prevStatuses);
                    }
                })();
            }
        },
        [statuses, handleReorderColumns, handleReorderTasks]
    );

    if (isLoading) {
        return (
            <div className="bg-white">
                <Container>
                    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
                        {t("loadingBoard")}
                    </div>
                </Container>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="bg-white">
                <Container>
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-white px-4 py-4 text-rose-700 text-sm">
                        {loadError}
                    </div>
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => void fetchBoard()}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-semibold text-sm text-zinc-900 hover:bg-zinc-100">
                            Tải lại
                        </button>
                    </div>
                </Container>
            </div>
        );
    }

    const totalTaskCount = statuses.reduce(
        (sum, s) => sum + ((s.taskList ?? []) as PersonalTaskItemResponse[]).length,
        0
    );

    return (
        <div id="home-personal-task-section" className="scroll-mt-24 bg-white">
            <InlineTaskFormModal
                open={taskFormOpen}
                onClose={handleCloseCreateTask}
                onSubmit={handleSubmitCreateTask}
                statuses={statusOptions}
                defaultStatusId={taskFormStatusId}
                t={t}
            />

            <PersonalTaskDetailModal
                open={detailOpen}
                task={detailTask}
                statuses={statusOptions}
                saving={isSubmitting}
                onClose={handleCloseTaskDetail}
                onSave={handleSaveTaskDetail}
                onDelete={async (task) => {
                    setConfirmDeleteTask({ open: true, task, fromDetail: true });
                }}
                t={t}
            />

            <ConfirmModal
                open={confirmDeleteColumn.open}
                title={t("confirmedDeleteStatus")}
                description={`${t("confirmedDeleteStatus")}: "${confirmDeleteColumn.status?.statusName ?? ""}"`}
                confirmLabel={t("deleteStatus")}
                cancelLabel={t("cancel")}
                onConfirm={() => void handleDeleteColumn()}
                onCancel={() => setConfirmDeleteColumn({ open: false, status: null })}
            />

            <ConfirmModal
                open={confirmDeleteTask.open}
                title={t("confirmDeleteTask")}
                description={`${t("confirmDeleteTask")}: "${confirmDeleteTask.task?.taskTitle ?? ""}"?`}
                confirmLabel={t("deleteTask")}
                cancelLabel={t("cancel")}
                zIndexClassName={confirmDeleteTask.fromDetail ? "z-[10020]" : "z-[10000]"}
                onConfirm={() => void handleDeleteTask()}
                onCancel={() => setConfirmDeleteTask({ open: false, task: null, fromDetail: false })}
            />

            <Container>
                <div className="mt-5 overflow-hidden rounded-[40px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,250,245,0.96)_0%,rgba(255,255,255,0.92)_42%,rgba(248,250,255,0.9)_100%)] p-6 shadow-[0_22px_70px_rgba(180,83,9,0.10)] backdrop-blur-xl">
                    <div className="mb-6 overflow-hidden rounded-[32px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_28%),linear-gradient(180deg,rgba(255,252,248,0.92),rgba(249,241,233,0.82))] px-6 py-6 shadow-[0_14px_40px_rgba(180,83,9,0.08)] backdrop-blur-xl">
                        <h2 className="bg-[linear-gradient(135deg,#7C2D12_0%,#EA580C_48%,#FB923C_100%)] bg-clip-text font-bold text-[30px] text-transparent leading-tight tracking-[-0.02em] md:text-[36px]">
                            {t("title")}
                        </h2>
                    </div>

                    {!mounted ? (
                        <div
                            ref={boardScrollRef}
                            onPointerDown={handleBoardPointerDown}
                            onPointerMove={handleBoardPointerMove}
                            onPointerUp={handleBoardPointerUp}
                            onPointerCancel={handleBoardPointerCancel}
                            className="flex items-start gap-4 overflow-x-auto pb-6">
                            {statuses.map((status, index) => (
                                <SortableColumn
                                    key={status.statusId ?? `${status.statusName ?? "status"}-${index}`}
                                    status={status}
                                    isSubmitting={isSubmitting}
                                    onCreateTask={handleOpenCreateTask}
                                    onOpenTask={handleOpenTaskDetail}
                                    onRenameStatus={handleRenameColumn}
                                    onDeleteStatus={async (s) => {
                                        setConfirmDeleteColumn({ open: true, status: s });
                                    }}
                                    onRenameTask={handleRenameTask}
                                    onDeleteTask={async (task) => {
                                        setConfirmDeleteTask({ open: true, task, fromDetail: false });
                                    }}
                                    ghost={ghost}
                                    isEditing={editingColumn.id === String(status.statusId ?? "")}
                                    columnDraft={
                                        editingColumn.id === String(status.statusId ?? "")
                                            ? editingColumn.draft
                                            : ""
                                    }
                                    columnError={
                                        editingColumn.id === String(status.statusId ?? "")
                                            ? editingColumn.error
                                            : null
                                    }
                                    onColumnDraftChange={handleColumnDraftChange}
                                    onColumnCommit={() => void commitEditColumn()}
                                    onColumnCancel={cancelEditColumn}
                                    t={t}
                                />
                            ))}

                            <div className="min-w-[300px] max-w-[300px] self-start">
                                <AddColumnInline
                                    isSubmitting={isSubmitting}
                                    onSubmit={handleCreateColumn}
                                    labels={{
                                        errorMessage: t("pleaseEnterStatusName"),
                                        failedMessage: t("createStatusFailed"),
                                        createStatus: t("createStatus"),
                                        enterStatusName: t("enterStatusName"),
                                        confirm: t("createStatus"),
                                        cancel: t("cancel")
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            autoScroll={false}
                            collisionDetection={collisionDetection}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragCancel={handleDragCancel}
                            onDragEnd={handleDragEnd}>
                            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                                <div
                                    ref={boardScrollRef}
                                    onPointerDown={handleBoardPointerDown}
                                    onPointerMove={handleBoardPointerMove}
                                    onPointerUp={handleBoardPointerUp}
                                    onPointerCancel={handleBoardPointerCancel}
                                    className="flex items-start gap-4 overflow-x-auto pb-6">
                                    {statuses.map((status, index) => (
                                        <SortableColumn
                                            key={status.statusId ?? `${status.statusName ?? "status"}-${index}`}
                                            status={status}
                                            isSubmitting={isSubmitting}
                                            onCreateTask={handleOpenCreateTask}
                                            onOpenTask={handleOpenTaskDetail}
                                            onRenameStatus={handleRenameColumn}
                                            onDeleteStatus={async (s) => {
                                                setConfirmDeleteColumn({ open: true, status: s });
                                            }}
                                            onRenameTask={handleRenameTask}
                                            onDeleteTask={async (task) => {
                                                setConfirmDeleteTask({ open: true, task, fromDetail: false });
                                            }}
                                            ghost={ghost}
                                            dropTargetTaskId={dropTargetTaskId}
                                            isEditing={editingColumn.id === String(status.statusId ?? "")}
                                            columnDraft={
                                                editingColumn.id === String(status.statusId ?? "")
                                                    ? editingColumn.draft
                                                    : ""
                                            }
                                            columnError={
                                                editingColumn.id === String(status.statusId ?? "")
                                                    ? editingColumn.error
                                                    : null
                                            }
                                            onColumnDraftChange={handleColumnDraftChange}
                                            onColumnCommit={() => void commitEditColumn()}
                                            onColumnCancel={cancelEditColumn}
                                            t={t}
                                        />
                                    ))}

                                    <div className="min-w-[300px] max-w-[300px] self-start">
                                        <AddColumnInline
                                            isSubmitting={isSubmitting}
                                            onSubmit={handleCreateColumn}
                                            labels={{
                                                errorMessage: t("pleaseEnterStatusName"),
                                                failedMessage: t("createStatusFailed"),
                                                createStatus: t("createStatus"),
                                                enterStatusName: t("enterStatusName"),
                                                confirm: t("createStatus"),
                                                cancel: t("cancel")
                                            }}
                                        />
                                    </div>
                                </div>
                            </SortableContext>

                            {mounted
                                ? createPortal(
                                    <DragOverlay>
                                        {activeTask ? (
                                            <TaskOverlay task={activeTask} t={t} />
                                        ) : activeColumn ? (
                                            <ColumnOverlay status={activeColumn} t={t} />
                                        ) : null}
                                    </DragOverlay>,
                                    document.body
                                )
                                : null}
                        </DndContext>
                    )}
                </div>
            </Container>
        </div>
    );
}

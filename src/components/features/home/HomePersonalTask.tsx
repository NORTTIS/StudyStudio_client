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
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

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

const selectItemClassName =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";

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
    if (value === "moderate") return "text-yellow-500";
    return "text-sky-600";
}

function priorityLabel(value: "low" | "medium" | "high") {
    if (value === "high") return "High";
    if (value === "medium") return "Medium";
    return "Low";
}

function severityLabel(value: "minor" | "moderate" | "major" | "critical") {
    if (value === "critical") return "Critical";
    if (value === "major") return "Major";
    if (value === "moderate") return "Moderate";
    return "Minor";
}

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100] as const;

function normalizeProgressValue(n?: number | null) {
    if (typeof n !== "number" || !Number.isFinite(n)) return 0;
    const value = Math.floor(n);
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function progressLabelOf(n?: number | null) {
    const value = normalizeProgressValue(n);
    if (value === 0) return "To do";
    if (value < 50) return "Started";
    if (value < 75) return "In progress";
    if (value < 100) return "Review";
    return "Done";
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
        <span className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 font-semibold text-indigo-700 text-xs">
            {progress}%
        </span>
    );
}

import { CheckCircle2 } from "lucide-react";

function DonePill() {
    return (
        <span className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-emerald-300 bg-emerald-50 px-4 font-medium text-emerald-700 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Done
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

function DuePill({ due, overdue, done }: { due: string; overdue: boolean; done?: boolean }) {
    return (
        <div
            className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border px-3 py-2",
                done
                    ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                    : overdue
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700"
            )}>
            <Clock3 className="h-4 w-4 shrink-0" />
            <div className="flex min-w-0 items-center gap-2">
                <div className="whitespace-nowrap font-semibold text-xs">{due}</div>
                {!done && overdue ? (
                    <span className="whitespace-nowrap rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-700 text-xs">
                        Quá hạn
                    </span>
                ) : null}
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
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
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
    onSubmit
}: {
    isSubmitting: boolean;
    onSubmit: (title: string) => Promise<void>;
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
            setError("Vui lòng nhập tên trạng thái.");
            inputRef.current?.focus();
            return;
        }

        try {
            setError(null);
            await onSubmit(trimmed);
            close();
        } catch (e: any) {
            setError(e?.message ?? "Tạo trạng thái thất bại");
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
                    "w-full rounded-xl bg-[#f54a00] px-4 py-3 text-left font-semibold text-sm text-white shadow-sm",
                    "transition hover:bg-[#f54a00]/80"
                )}>
                + Tạo trạng thái
            </button>
        );
    }

    return (
        <div className="rounded-xl bg-white p-3 shadow-sm">
            <input
                ref={inputRef}
                value={title}
                maxLength={30}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                onKeyDown={onKeyDown}
                disabled={isSubmitting}
                placeholder="Nhập tên trạng thái..."
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
                    Thêm trạng thái
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
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-sm",
                "bg-[#f54a00] text-white",
                "transition hover:bg-[#f54a00]/80",
                disabled && "pointer-events-none opacity-60"
            )}>
            <Plus className="h-4 w-4" />
            Thêm công việc
        </button>
    );
}

function PersonalTaskCard({
    task,
    columnId,
    isSubmitting,
    onOpen,
    onRename,
    onDelete
}: {
    task: PersonalTaskItemResponse;
    columnId: string;
    isSubmitting: boolean;
    onOpen: (task: PersonalTaskItemResponse) => void;
    onRename: (task: PersonalTaskItemResponse, nextTitle: string) => Promise<void>;
    onDelete: (task: PersonalTaskItemResponse) => Promise<void>;
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
    const title = task.taskTitle || "Untitled task";
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
                done
                    ? "bg-zinc-50 hover:bg-zinc-100/90 hover:shadow-[0_2px_6px_rgba(9,30,66,0.10),0_0_0_1px_rgba(9,30,66,0.04)]"
                    : "bg-white hover:bg-white hover:shadow-[0_4px_8px_rgba(9,30,66,0.16),0_0_0_1px_rgba(9,30,66,0.04)]"
            )}>
            <div className="flex items-start gap-3">
                <div className="pt-1">
                    <div className={cn("h-2.5 w-2.5 rounded-full", priorityDotColor(task.taskPriority))} />
                </div>

                <div className="min-w-0 flex-1">
                    {!isEditing ? (
                        <>
                            <div className="flex items-start justify-between gap-3">
                                <p
                                    className={cn(
                                        "line-clamp-3 pr-2 font-semibold text-sm leading-5",
                                        done ? "text-zinc-500 line-through" : "text-zinc-900"
                                    )}>
                                    {title}
                                </p>

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
                                            setOpenMenu((v) => !v);
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                                        aria-label="Menu">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>

                                    <PortalDropdown
                                        open={openMenu}
                                        onClose={() => setOpenMenu(false)}
                                        anchorRef={btnRef as React.RefObject<HTMLElement>}>
                                        <MenuItem
                                            icon={<Pencil className="h-4 w-4" />}
                                            label="Chỉnh sửa tên"
                                            onClick={() => {
                                                setOpenMenu(false);
                                                setIsEditing(true);
                                            }}
                                        />
                                        <MenuItem
                                            icon={<Trash2 className="h-4 w-4" />}
                                            label="Xóa"
                                            danger
                                            onClick={() => {
                                                setOpenMenu(false);
                                                void onDelete(task);
                                            }}
                                        />
                                    </PortalDropdown>
                                </div>
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
                                    Lưu
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        cancelEdit();
                                    }}
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                                    aria-label="Hủy">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {dueText || severity || done || showProgress ? (
                        <div className="mt-3 space-y-2">
                            {dueText ? <DuePill due={dueText} overdue={overdue} done={done} /> : null}

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
                                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                : "border-sky-200 bg-sky-50 text-sky-700"
                                            )}>
                                            {severityLabel(severity)}
                                        </span>
                                    ) : null}

                                    {showProgress ? <ProgressPill progress={normalizedProgress} /> : null}

                                    {done ? <DonePill /> : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function GhostTaskCard({ task }: { task: PersonalTaskItemResponse }) {
    const dueText = formatDueDate(task.dueDate);
    const severity = taskSeverityToFormValue(task.taskSeverity);
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const overdue = isOverdue(task.dueDate);
    const normalizedProgress = normalizeProgressValue(task.progress);

    return (
        <div className="rounded-xl border-2 border-blue-300 border-dashed bg-blue-50/70 p-3">
            <div className="flex items-start gap-3">
                <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", priorityDotColor(task.taskPriority))} />
                <div className="min-w-0 flex-1">
                    <p
                        className={cn(
                            "line-clamp-3 font-semibold text-sm leading-5",
                            done ? "text-zinc-500 line-through" : "text-zinc-800"
                        )}>
                        {task.taskTitle || "Untitled task"}
                    </p>

                    {dueText || severity || done || showProgress ? (
                        <div className="mt-3 space-y-2">
                            {dueText ? <DuePill due={dueText} overdue={overdue} done={done} /> : null}

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
                                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                : "border-sky-200 bg-sky-50 text-sky-700"
                                            )}>
                                            {severityLabel(severity)}
                                        </span>
                                    ) : null}

                                    {showProgress ? <ProgressPill progress={normalizedProgress} /> : null}
                                    {done ? <DonePill /> : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function TaskOverlay({ task }: { task: PersonalTaskItemResponse }) {
    const dueText = formatDueDate(task.dueDate);
    const overdue = isOverdue(task.dueDate);
    const severity = taskSeverityToFormValue(task.taskSeverity);
    const done = isTaskDone(task);
    const showProgress = shouldShowProgress(task);
    const normalizedProgress = normalizeProgressValue(task.progress);

    return (
        <div className="min-w-[300px] rounded-xl border border-black/5 bg-white p-4 shadow-xl">
            <p className={cn("font-semibold text-sm leading-5", done ? "text-zinc-500 line-through" : "text-zinc-900")}>
                {task.taskTitle || "Untitled task"}
            </p>

            {dueText || severity || done || showProgress ? (
                <div className="mt-3 space-y-2">
                    {dueText ? <DuePill due={dueText} overdue={overdue} done={done} /> : null}

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
                                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                                        : "border-sky-200 bg-sky-50 text-sky-700"
                                    )}>
                                    {severityLabel(severity)}
                                </span>
                            ) : null}

                            {showProgress ? <ProgressPill progress={normalizedProgress} /> : null}
                            {done ? <DonePill /> : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function ColumnOverlay({ status }: { status: PersonalTaskStatusDto }) {
    const tasks = ((status.taskList ?? []) as PersonalTaskItemResponse[]).slice(0, 3);

    return (
        <div className="min-w-[300px] max-w-[300px]">
            <div className="rounded-xl bg-[#f1f2f4] shadow-xl">
                <div className="rounded-t-xl bg-[#f1f2f4] px-3 pt-3 pb-2">
                    <p className="truncate font-bold text-sm text-zinc-900">{status.statusName || "Untitled"}</p>
                    <p className="text-[11px] text-zinc-500">Đang di chuyển trạng thái…</p>
                </div>

                <div className="px-2 pb-2">
                    <div className="rounded-b-xl bg-[#f1f2f4]">
                        {tasks.map((task) => (
                            <div key={String(task.taskId)} className="mb-2 last:mb-0">
                                <div className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
                                    <p className="font-semibold text-sm text-zinc-900">
                                        {task.taskTitle || "Untitled task"}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {tasks.length === 0 ? (
                            <div className="rounded-xl border border-zinc-300 border-dashed bg-white px-3 py-8 text-center text-sm text-zinc-500">
                                (Trạng thái trống)
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BoardColumn({
    status,
    isSubmitting,
    onCreateTask,
    onOpenTask,
    onRenameStatus,
    onDeleteStatus,
    onRenameTask,
    onDeleteTask,
    ghost,
    isEditing,
    columnDraft,
    columnError,
    onColumnDraftChange,
    onColumnCommit,
    onColumnCancel
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
    isEditing: boolean;
    columnDraft: string;
    columnError: string | null;
    onColumnDraftChange: (value: string) => void;
    onColumnCommit: () => void;
    onColumnCancel: () => void;
}) {
    const statusId = String(status.statusId ?? "");
    const tasks = [...((status.taskList ?? []) as PersonalTaskItemResponse[])];
    const taskIds = tasks.map((task) => String(task.taskId ?? ""));
    const statusName = status.statusName || "Untitled";

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

    type RenderedBoardItem =
        | { kind: "task"; task: PersonalTaskItemResponse }
        | { kind: "ghost"; task: PersonalTaskItemResponse };

    const rendered = React.useMemo<RenderedBoardItem[]>(() => {
        const base: RenderedBoardItem[] = tasks.map((t) => ({
            kind: "task",
            task: t
        }));

        if (!(shouldShowGhost && ghost)) return base;

        const idx = Math.max(0, Math.min(ghost.index, base.length));
        const next = [...base];
        next.splice(idx, 0, {
            kind: "ghost",
            task: ghost.task
        });
        return next;
    }, [tasks, shouldShowGhost, ghost]);

    const btnRef = React.useRef<HTMLButtonElement | null>(null);
    const [openMenu, setOpenMenu] = React.useState(false);

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (isEditing) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isEditing]);

    return (
        <div ref={setNodeRef} style={style} className="min-w-[300px] max-w-[300px] self-start">
            <div className="rounded-xl bg-[#f1f2f4]">
                <div
                    ref={(node) => setActivatorNodeRef(node as HTMLElement | null)}
                    {...attributes}
                    {...listeners}
                    style={{ touchAction: "none" }}
                    className={cn(
                        "sticky top-0 z-10 rounded-t-xl bg-[#f1f2f4] px-3 pt-3 pb-2",
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
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 font-semibold text-xs text-zinc-700">
                                {tasks.length}
                            </span>

                            <div className="relative">
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
                                    }}
                                    className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-black/5"
                                    aria-label="Column menu">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>

                                <PortalDropdown
                                    open={openMenu}
                                    onClose={() => setOpenMenu(false)}
                                    anchorRef={btnRef as React.RefObject<HTMLElement>}>
                                    <MenuItem
                                        icon={<Pencil className="h-4 w-4" />}
                                        label="Chỉnh sửa tên trạng thái"
                                        onClick={() => {
                                            setOpenMenu(false);
                                            void onRenameStatus(status);
                                        }}
                                    />
                                    <MenuItem
                                        icon={<Trash2 className="h-4 w-4" />}
                                        label="Xóa trạng thái"
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

                <div className="px-2 pb-2">
                    <div
                        ref={setDroppableRef}
                        className={cn("rounded-b-xl bg-[#f1f2f4] transition", isOver && "bg-[#e9f2ff]")}>
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <div className="relative max-h-[68vh] space-y-2 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {rendered.map((item, index) =>
                                    item.kind === "ghost" ? (
                                        <GhostTaskCard key={`ghost-${statusId}-${index}`} task={item.task} />
                                    ) : (
                                        <PersonalTaskCard
                                            key={String(item.task.taskId)}
                                            task={item.task}
                                            columnId={statusId}
                                            isSubmitting={isSubmitting}
                                            onOpen={onOpenTask}
                                            onRename={onRenameTask}
                                            onDelete={onDeleteTask}
                                        />
                                    )
                                )}

                                {tasks.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-300 border-dashed bg-white px-3 py-8 text-center">
                                        <div className="font-semibold text-sm text-zinc-700">Chưa có công việc</div>
                                        <div className="mt-1 text-xs text-zinc-500">
                                            Bấm “Thêm công việc” để tạo mới
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    ref={setEndRef}
                                    className={cn(
                                        "absolute right-0 bottom-0 left-0 h-12 rounded-xl border border-dashed transition",
                                        isOverEnd ? "border-blue-300 bg-blue-50/60" : "border-transparent"
                                    )}
                                />
                            </div>
                        </SortableContext>

                        <AddTaskButton disabled={isSubmitting} onClick={() => void onCreateTask(status)} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InlineDatePicker({
    label,
    value,
    onChange,
    min,
    disabled = false
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    disabled?: boolean;
}) {
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
                            {formatDateDisplay(value)}
                        </span>
                    </div>
                </button>
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
                            <div className="relative flex-1">
                                <select
                                    value={month.getMonth()}
                                    onChange={handleMonthChange}
                                    className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 font-semibold text-base text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400">
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
                                    className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 font-semibold text-base text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400">
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
                                Today
                            </button>

                            <button
                                type="button"
                                onClick={() => pickDate(addDays(new Date(), 1))}
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                                Tomorrow
                            </button>

                            <button
                                type="button"
                                onClick={() => pickDate(addDays(new Date(), 7))}
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                                Next week
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                }}
                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-rose-500 hover:bg-rose-50">
                                No date
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
    defaultStatusId
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: InlineTaskFormValues) => Promise<void> | void;
    statuses: InlineTaskFormOption[];
    defaultStatusId?: string | null;
}) {
    const [mounted, setMounted] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [statusId, setStatusId] = React.useState<string | null>(defaultStatusId ?? statuses[0]?.value ?? null);
    const [priority, setPriority] = React.useState<"low" | "medium" | "high">("low");
    const [severity, setSeverity] = React.useState<"minor" | "moderate" | "major" | "critical">("minor");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");

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
        return statuses.find((s) => s.value === statusId)?.label ?? "No status";
    }, [statuses, statusId]);

    const canSubmit = title.trim().length > 0 && !submitting;

    const handleSubmit = async () => {
        const t = title.trim();
        const desc = description.trim();

        if (!t) {
            setError("Vui lòng nhập tên công việc.");
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setError("Ngày bắt đầu phải nhỏ hơn hoặc bằng hạn hoàn thành.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await onSubmit({
                title: t,
                description: desc,
                statusId,
                priority,
                severity,
                startDate: startDate || undefined,
                dueDate: dueDate || undefined
            });

            onClose();
        } catch (e: any) {
            setError(e?.message ?? "Tạo công việc thất bại");
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
                        <input
                            value={title}
                            maxLength={30}
                            onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                            placeholder="Task name"
                            className="w-full max-w-[520px] rounded-xl border border-zinc-200 bg-white px-3 py-2 font-extrabold text-[28px] text-zinc-900 leading-none outline-none"
                        />

                        <div className="mt-1 max-w-[520px] text-right text-[11px] text-zinc-500">{title.length}/30</div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label="Close">
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
                            <div className="font-semibold text-sm text-zinc-600">Status</div>
                            <Select
                                value={statusId ?? "no-status"}
                                onValueChange={(v) => setStatusId(v === "no-status" ? null : v)}>
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
                                    <SelectItem value="no-status" className={selectItemClassName}>
                                        No status
                                    </SelectItem>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.value} value={s.value} className={selectItemClassName}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Priority</div>
                            <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm">
                                    <span className={cn("inline-flex items-center gap-2", priorityTone(priority))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {priorityLabel(priority)}
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
                                        Low
                                    </SelectItem>
                                    <SelectItem value="medium" className={selectItemClassName}>
                                        Medium
                                    </SelectItem>
                                    <SelectItem value="high" className={selectItemClassName}>
                                        High
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Severity</div>
                            <Select
                                value={severity}
                                onValueChange={(v) => setSeverity(v as "minor" | "moderate" | "major" | "critical")}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm">
                                    <span className={cn("inline-flex items-center gap-2", severityTone(severity))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {severityLabel(severity)}
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
                                        Minor
                                    </SelectItem>
                                    <SelectItem value="moderate" className={selectItemClassName}>
                                        Moderate
                                    </SelectItem>
                                    <SelectItem value="major" className={selectItemClassName}>
                                        Major
                                    </SelectItem>
                                    <SelectItem value="critical" className={selectItemClassName}>
                                        Critical
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <InlineDatePicker label="Start Date" value={startDate} onChange={setStartDate} />

                        <InlineDatePicker
                            label="Due Date"
                            value={dueDate}
                            onChange={setDueDate}
                            min={startDate || undefined}
                        />
                    </div>

                    <div className="mt-6">
                        <div className="font-semibold text-sm text-zinc-600">Description</div>
                        <textarea
                            value={description}
                            maxLength={200}
                            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                            placeholder="Nhập mô tả công việc"
                            className="mt-2 min-h-30 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none"
                        />

                        <div className="mt-1 text-right text-[11px] text-zinc-500">{description.length}/200</div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-zinc-200 border-t bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 rounded-xl border border-zinc-300 bg-white px-8 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            void handleSubmit();
                        }}
                        disabled={!canSubmit}
                        className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                        {submitting ? "Creating..." : "Create task"}
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
    onDelete
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
        };
    }) => Promise<void>;
    onDelete: (task: PersonalTaskItemResponse) => Promise<void>;
}) {
    const [mounted, setMounted] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [statusId, setStatusId] = React.useState<string | null>(null);
    const [priority, setPriority] = React.useState<"low" | "medium" | "high">("low");
    const [severity, setSeverity] = React.useState<"minor" | "moderate" | "major" | "critical">("minor");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [progress, setProgress] = React.useState("0");

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!(open && task)) return;

        setError(null);
        setIsEditing(false);
        setTitle((task.taskTitle ?? "").slice(0, 30));
        setDescription((task.taskDescription ?? "").slice(0, 200));
        setStatusId(task.personalStatus?.statusId ?? null);
        setPriority(priorityFromTask(task.taskPriority));
        setSeverity(taskSeverityToFormValue(task.taskSeverity));
        setStartDate(toDateInputValue(task.startDate ?? null));
        setDueDate(toDateInputValue(task.dueDate ?? null));
        setProgress(String(normalizeProgressValue(task.progress)));
    }, [open, task]);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const selectedStatusName = React.useMemo(() => {
        return statuses.find((s) => s.value === statusId)?.label ?? "No status";
    }, [statuses, statusId]);

    const handleSave = async () => {
        if (!task) return;

        const nextTitle = title.trim();

        if (!nextTitle) {
            setError("Vui lòng nhập tên công việc.");
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setError("Ngày bắt đầu phải nhỏ hơn hoặc bằng hạn hoàn thành.");
            return;
        }

        try {
            setError(null);

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
                    progress: normalizeProgressValue(Number(progress))
                }
            });

            setIsEditing(false);
        } catch (e: any) {
            setError(e?.message ?? "Cập nhật công việc thất bại");
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
                                <input
                                    value={title}
                                    maxLength={30}
                                    onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                                    placeholder="Task name"
                                    className="mt-0 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-extrabold text-[28px] text-zinc-900 leading-none outline-none"
                                />
                                <div className="mt-1 text-right text-[11px] text-zinc-500">{title.length}/30</div>
                            </div>
                        ) : (
                            <h2 className="mt-0 min-w-0 break-words font-extrabold text-[30px] text-zinc-900 leading-none">
                                {title || "Task"}
                            </h2>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label="Close">
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
                            <div className="font-semibold text-sm text-zinc-600">Status</div>
                            <Select
                                value={statusId ?? "no-status"}
                                onValueChange={(v) => setStatusId(v === "no-status" ? null : v)}
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
                                    <SelectItem value="no-status" className={selectItemClassName}>
                                        No status
                                    </SelectItem>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.value} value={s.value} className={selectItemClassName}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Priority</div>
                            <Select
                                value={priority}
                                onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
                                disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className={cn("inline-flex items-center gap-2", priorityTone(priority))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {priorityLabel(priority)}
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
                                        Low
                                    </SelectItem>
                                    <SelectItem value="medium" className={selectItemClassName}>
                                        Medium
                                    </SelectItem>
                                    <SelectItem value="high" className={selectItemClassName}>
                                        High
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">Severity</div>
                            <Select
                                value={severity}
                                onValueChange={(v) => setSeverity(v as "minor" | "moderate" | "major" | "critical")}
                                disabled={!isEditing}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className={cn("inline-flex items-center gap-2", severityTone(severity))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {severityLabel(severity)}
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
                                        Minor
                                    </SelectItem>
                                    <SelectItem value="moderate" className={selectItemClassName}>
                                        Moderate
                                    </SelectItem>
                                    <SelectItem value="major" className={selectItemClassName}>
                                        Major
                                    </SelectItem>
                                    <SelectItem value="critical" className={selectItemClassName}>
                                        Critical
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <InlineDatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={setStartDate}
                            disabled={!isEditing}
                        />

                        <InlineDatePicker
                            label="Due Date"
                            value={dueDate}
                            onChange={setDueDate}
                            min={startDate || undefined}
                            disabled={!isEditing}
                        />

                        <TaskProgressEditor value={progress} onChange={setProgress} disabled={!isEditing} />
                    </div>

                    <div className="mt-6">
                        <div className="font-semibold text-sm text-zinc-600">Description</div>
                        <textarea
                            value={description}
                            maxLength={200}
                            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                            disabled={!isEditing}
                            placeholder="(No description)"
                            className="mt-2 min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                        />

                        {isEditing ? (
                            <div className="mt-1 text-right text-[11px] text-zinc-500">{description.length}/200</div>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-zinc-200 border-t bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={() => void onDelete(task)}
                        disabled={saving}
                        className="h-11 rounded-xl border border-rose-200 bg-white px-6 font-semibold text-rose-600 text-sm hover:bg-rose-50 disabled:opacity-60">
                        Xóa
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 rounded-xl border border-zinc-300 bg-white px-8 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                            Cancel
                        </button>

                        {isEditing ? (
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving}
                                className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                                {saving ? "Saving..." : "Save change"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80">
                                Edit
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

    const [editingColumn, setEditingColumn] = React.useState<{
        id: string | null;
        draft: string;
        error: string | null;
    }>({
        id: null,
        draft: "",
        error: null
    });

    React.useEffect(() => setMounted(true), []);

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
                setLoadError("Không đọc được dữ liệu personal task.");
            }
        } catch (error: any) {
            console.error("Failed to fetch personal board:", error);
            setBoard(null);
            setLoadError(error?.message ?? "Không tải được dữ liệu personal task.");
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
        const nextStatuses = [...((board?.personalTaskStatuses as PersonalTaskStatusDto[] | null | undefined) ?? [])]
            .map((status) => ({
                ...status,
                taskList: [...((status.taskList ?? []) as PersonalTaskItemResponse[])]
            }))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

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
            activationConstraint: { delay: 200, tolerance: 5 }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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

    const collisionDetection: CollisionDetection = React.useCallback((args) => {
        const activeType = args.active.data.current?.type;

        if (activeType === "column") {
            const onlyColumns = filterDroppablesByType(args.droppableContainers, ["column"]);
            return closestCenter({ ...args, droppableContainers: onlyColumns });
        }

        const allow = filterDroppablesByType(args.droppableContainers, ["task", "column-drop", "column-end"]);
        return closestCorners({ ...args, droppableContainers: allow });
    }, []);

    const handleOpenTaskDetail = React.useCallback((task: PersonalTaskItemResponse) => {
        setDetailTask(task);
        setDetailOpen(true);
    }, []);

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

                await fetchBoard();
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
                        error: "Vui lòng nhập tên trạng thái."
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
                    error: duplicated ? "Tên trạng thái đã tồn tại. Hãy nhập tên khác." : null
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
                error: "Vui lòng nhập tên trạng thái."
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
                error: "Tên trạng thái đã tồn tại. Hãy nhập tên khác."
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

            await fetchBoard();

            setEditingColumn({
                id: null,
                draft: "",
                error: null
            });
        } catch (error: any) {
            console.error("Failed to update personal status:", error);
            setEditingColumn((prev) => ({
                ...prev,
                error: error?.message ?? "Cập nhật trạng thái thất bại"
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

            await apiFetch<ObjectApiResponse>(buildDeletePersonalStatusUrl(String(status.statusId)), {
                method: "DELETE"
            });

            await fetchBoard();
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

                await fetchBoard();
                handleCloseCreateTask();
            } catch (error) {
                console.error("Failed to create personal task:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard, handleCloseCreateTask]
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
                        taskDescription: task.taskDescription ?? null,
                        taskPriority: task.taskPriority,
                        taskSeverity: task.taskSeverity,
                        personalStatusId: task.personalStatus?.statusId ?? null
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                await fetchBoard();
            } catch (error) {
                console.error("Failed to update personal task:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard]
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
            };
        }) => {
            if (!task.taskId) return;

            try {
                setIsSubmitting(true);

                await apiFetch<TaskItemResponseApiResponse>(buildUpdatePersonalTaskUrl(String(task.taskId)), {
                    method: "PUT",
                    body: JSON.stringify({
                        taskName: values.title.trim(),
                        taskDescription: values.description.trim() || null,
                        personalStatusId: values.statusId ?? null,
                        startDate: toApiDateTime(values.startDate),
                        dueDate: toApiDateTime(values.dueDate),
                        progress: values.progress,
                        taskPriority: values.priority === "high" ? 2 : values.priority === "medium" ? 1 : 0,
                        taskSeverity:
                            values.severity === "critical"
                                ? 3
                                : values.severity === "major"
                                    ? 2
                                    : values.severity === "moderate"
                                        ? 1
                                        : 0
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                await fetchBoard();

                setDetailTask((prev) => {
                    if (!prev || String(prev.taskId) !== String(task.taskId)) return prev;

                    const nextStatus = statuses.find((s) => String(s.statusId ?? "") === String(values.statusId ?? ""));

                    return {
                        ...prev,
                        taskTitle: values.title.trim(),
                        taskDescription: values.description.trim() || null,
                        progress: values.progress,
                        personalStatus: {
                            ...(prev.personalStatus ?? {}),
                            statusId: values.statusId ?? undefined,
                            statusName: nextStatus?.statusName ?? prev.personalStatus?.statusName ?? null
                        },
                        startDate: toApiDateTime(values.startDate) ?? undefined,
                        dueDate: toApiDateTime(values.dueDate) ?? undefined,
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
                });
            } catch (error) {
                console.error("Failed to update personal task detail:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard, statuses]
    );

    const handleDeleteTask = React.useCallback(async () => {
        const task = confirmDeleteTask.task;
        if (!task?.taskId) return;

        try {
            setIsSubmitting(true);

            await apiFetch<ObjectApiResponse>(buildDeletePersonalTaskUrl(String(task.taskId)), {
                method: "DELETE"
            });

            await fetchBoard();

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
                setIsSubmitting(true);

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

                await fetchBoard();
            } catch (error) {
                console.error("Failed to reorder personal status:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard]
    );

    const handleReorderTasks = React.useCallback(
        async (
            taskId: string,
            targetStatusId?: string | null,
            prevTaskId?: string | null,
            nextTaskId?: string | null
        ) => {
            try {
                setIsSubmitting(true);

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

                await fetchBoard();
            } catch (error) {
                console.error("Failed to reorder personal task:", error);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBoard]
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
        async (e: DragEndEvent) => {
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

                try {
                    await handleReorderTasks(activeId, dropped.toCol, dropped.prevTaskId, dropped.nextTaskId);
                } catch {
                    setStatuses(prevStatuses);
                }

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

                const prevStatusId = newIndex > 0 ? String(nextStatuses[newIndex - 1].statusId ?? "") : null;
                const nextStatusId =
                    newIndex < nextStatuses.length - 1 ? String(nextStatuses[newIndex + 1].statusId ?? "") : null;

                try {
                    await handleReorderColumns(activeColId, prevStatusId, nextStatusId);
                } catch {
                    setStatuses(prevStatuses);
                }
            }
        },
        [statuses, handleReorderColumns, handleReorderTasks]
    );

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-[linear-gradient(180deg,#F8FAFC_0%,#F7F7FF_38%,#F3F7FB_100%)]">
                <Container>
                    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
                        Đang tải board…
                    </div>
                </Container>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-[calc(100vh-0px)] bg-[linear-gradient(180deg,#F8FAFC_0%,#F7F7FF_38%,#F3F7FB_100%)]">
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
        <div
            id="home-personal-task-section"
            className="min-h-[calc(100vh-0px)] scroll-mt-24 bg-[linear-gradient(180deg,#F8FAFC_0%,#F7F7FF_38%,#F3F7FB_100%)]"
        >
            <InlineTaskFormModal
                open={taskFormOpen}
                onClose={handleCloseCreateTask}
                onSubmit={handleSubmitCreateTask}
                statuses={statusOptions}
                defaultStatusId={taskFormStatusId}
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
            />

            <ConfirmModal
                open={confirmDeleteColumn.open}
                title="Xác nhận xóa trạng thái"
                description={`Bạn có chắc chắn muốn xóa trạng thái "${confirmDeleteColumn.status?.statusName ?? ""}" không?`}
                confirmLabel="Xóa trạng thái"
                cancelLabel="Hủy"
                onConfirm={() => void handleDeleteColumn()}
                onCancel={() => setConfirmDeleteColumn({ open: false, status: null })}
            />

            <ConfirmModal
                open={confirmDeleteTask.open}
                title="Xác nhận xóa công việc"
                description={`Bạn có chắc chắn muốn xóa công việc "${confirmDeleteTask.task?.taskTitle ?? ""}" không? Công việc này sẽ bị xóa vĩnh viễn và không thể hoàn tác.`}
                confirmLabel="Xóa công việc"
                cancelLabel="Hủy"
                zIndexClassName={confirmDeleteTask.fromDetail ? "z-[10020]" : "z-[10000]"}
                onConfirm={() => void handleDeleteTask()}
                onCancel={() => setConfirmDeleteTask({ open: false, task: null, fromDetail: false })}
            />

            <Container>
                <div className="mt-5 rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,250,252,0.76))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    <div className="mb-6 overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.06),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.78))] px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                        <h2 className="font-bold text-[30px] text-slate-900 leading-tight tracking-[-0.02em] md:text-[36px]">
                            Quản lý công việc cá nhân
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                            Theo dõi và sắp xếp các công việc cá nhân của bạn theo từng trạng thái.
                        </p>
                    </div>

                    {!mounted ? (
                        <div className="flex items-start gap-4 overflow-x-auto pb-6">
                            {statuses.map((status, index) => (
                                <div
                                    key={status.statusId ?? `${status.statusName ?? "status"}-${index}`}
                                    className="min-w-[300px] max-w-[300px] self-start">
                                    <BoardColumn
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
                                        ghost={null}
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
                                    />
                                </div>
                            ))}

                            <div className="min-w-[300px] max-w-[300px] self-start">
                                <AddColumnInline isSubmitting={isSubmitting} onSubmit={handleCreateColumn} />
                            </div>
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
                                <div className="flex items-start gap-4 overflow-x-auto pb-6">
                                    {statuses.map((status, index) => (
                                        <div
                                            key={status.statusId ?? `${status.statusName ?? "status"}-${index}`}
                                            className="min-w-[300px] max-w-[300px] self-start">
                                            <BoardColumn
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
                                            />
                                        </div>
                                    ))}

                                    <div className="min-w-[300px] max-w-[300px] self-start">
                                        <AddColumnInline isSubmitting={isSubmitting} onSubmit={handleCreateColumn} />
                                    </div>
                                </div>
                            </SortableContext>

                            <DragOverlay>
                                {activeTask ? (
                                    <TaskOverlay task={activeTask} />
                                ) : activeColumn ? (
                                    <ColumnOverlay status={activeColumn} />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </Container>
        </div>
    );
}

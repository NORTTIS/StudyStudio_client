"use client";

import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Loader2,
    MessageSquare,
    MoreHorizontal,
    SendHorizontal,
    Trash2,
    X
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import "react-day-picker/dist/style.css";
import type { components } from "@/api/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type UserDto = {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type TaskItemResponse = {
    taskId?: string;
    taskTitle?: string | null;
    dueDate?: string;
    startDate?: string;
    position?: number;
    taskPriority?: number;
    taskSeverity?: number;
    progress?: number;
    taskDescription?: string | null;
    assignee?: UserDto | null;
    groupStatus?: { groupId?: string; statusId?: string; position?: number; statusName?: string | null } | null;
};

type TaskStatusDto = {
    position?: number;
    statusId?: string;
    statusName?: string | null;
    taskList?: TaskItemResponse[] | null;
};

type StatusOption = {
    statusId: string;
    statusName: string;
};

type GroupMemberDto = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
};

type GroupMemberListResponse = {
    groupId?: string;
    groupName?: string | null;
    members?: GroupMemberDto[] | null;
    totalMembers?: number;
};

type UserProfileResponse = {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type GroupDetailResponse = {
    groupId?: string;
    groupName?: string | null;
    taskStatuses?: TaskStatusDto[] | null;
    userRole?: string | null;
};

export type TaskDetail = {
    id: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    assigneeAvatarUrl?: string | null;
    statusId?: string | null;
    statusName?: string | null;
    priorityValue: number;
    priorityLabel: string;
    severityValue: number;
    severityLabel: string;
    progressValue: number;
    progressLabel: string;
    startDateRaw?: string | null;
    dueDateRaw?: string | null;
    startDateFmt?: string | null;
    dueDateFmt?: string | null;
    raw?: unknown;
};

type TaskCommentDto = {
    commentId?: string;
    content?: string | null;
    createdAt?: string;
    updatedAt?: string | null;
    isDeleted?: boolean;
    user?: UserDto;
    userId?: string;
    parentCommentId?: string | null;
};

type TaskCommentWithReplies = TaskCommentDto & {
    replies?: TaskCommentDto[] | null;
    replyCount?: number;
};

type TaskCommentListResponse = {
    taskId?: string;
    totalComments?: number;
    comments?: TaskCommentWithReplies[] | null;
};

type MentionUser = { id: string; name: string };

type MentionTextareaHandle = {
    getPayloadText: () => string;
};

function isWordChar(ch: string) {
    return /[\p{L}\p{N}._-]/u.test(ch);
}

function safeInitialsFromName(name?: string | null) {
    const s = String(name ?? "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return `${a}${b}`.toUpperCase() || "U";
}

function renderAllMentions(segment: string) {
    const re = /@all\b/g;
    const nodes: React.ReactNode[] = [];
    let last = 0;

    for (const m of segment.matchAll(re)) {
        const idx = m.index ?? 0;
        const whole = m[0];

        if (idx > last) nodes.push(segment.slice(last, idx));

        nodes.push(
            <span key={`all-${idx}`} className="font-semibold text-blue-600">
                {whole}
            </span>
        );

        last = idx + whole.length;
    }

    if (last < segment.length) nodes.push(segment.slice(last));
    return nodes.length ? nodes : segment;
}

function compressAllMentionsForDisplay(text: string) {
    return text;
}

function expandMentionAll(payloadText: string, membersById: Record<string, string>, authorId: string) {
    if (!payloadText.includes("@__all__")) return payloadText;

    const normalizedAuthorId = String(authorId || "").trim();

    const otherMemberIds = Object.keys(membersById).filter((id) => {
        const normalizedId = String(id || "").trim();
        return normalizedId && normalizedId !== normalizedAuthorId;
    });

    if (otherMemberIds.length === 0) {
        return payloadText
            .replace(/@__all__\b/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    const mentions = otherMemberIds.map((id) => `@${id}`).join(" ");
    return payloadText.replace(/@__all__\b/g, mentions);
}

type UpdateTaskRequest = components["schemas"]["UpdateTaskRequest"];

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
    disabled?: boolean;
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

const TASK_TITLE_MAX_LENGTH = 30;
const TASK_DESCRIPTION_MAX_LENGTH = 200;
const PROGRESS_OPTIONS = [0, 25, 50, 75, 100] as const;

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    return String(raw).replace(/\/+$/, "");
}

function apiUrl(path: string) {
    const base = getApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!base) return cleanPath;
    if (base.endsWith("/api")) return `${base}${cleanPath}`;
    return `${base}/api${cleanPath}`;
}

function RichTextWithMentions({
    text,
    membersById,
    authorId
}: {
    text: string;
    membersById: Record<string, string>;
    authorId: string;
}) {
    const displayText = React.useMemo(() => compressAllMentionsForDisplay(text), [text]);

    const re = /@(__all__|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
    const parts: React.ReactNode[] = [];
    let last = 0;

    for (const m of displayText.matchAll(re)) {
        const idx = m.index ?? 0;
        const whole = m[0];
        const id = (m[1] || "").trim();

        if (idx > last) parts.push(displayText.slice(last, idx));

        if (id === "__all__") {
            parts.push(
                <span key={`${id}-${idx}`} className="font-semibold text-blue-600 hover:text-blue-700">
                    @all
                </span>
            );
        } else {
            const display = membersById[id];
            if (display) {
                parts.push(
                    <span key={`${id}-${idx}`} className="font-semibold text-blue-600 hover:text-blue-700">
                        @{display}
                    </span>
                );
            } else {
                parts.push(whole);
            }
        }

        last = idx + whole.length;
    }

    if (last < displayText.length) parts.push(displayText.slice(last));
    return <>{parts}</>;
}

const MentionTextarea = React.forwardRef<
    MentionTextareaHandle,
    {
        value: string;
        onChange: (next: string) => void;
        members: MentionUser[];
        meId: string;
        placeholder?: string;
        className?: string;
        maxChars?: number;
        onSubmit?: () => void;
        disabled?: boolean;
    }
>(function MentionTextareaInner(
    { value, onChange, members, meId, placeholder, className, maxChars = 500, onSubmit, disabled = false },
    ref
) {
    const taRef = React.useRef<HTMLTextAreaElement | null>(null);

    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [query, setQuery] = React.useState("");
    const [anchor, setAnchor] = React.useState<{ start: number; end: number } | null>(null);

    const mentionsRef = React.useRef<{ id: string; name: string; start: number; end: number }[]>([]);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();

        const allOption: MentionUser = { id: "__all__", name: "all" };
        const baseUsers = members.filter((u) => u.id !== meId);
        const full = [allOption, ...baseUsers];

        if (!q) return full.slice(0, 8);
        return full.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 8);
    }, [members, meId, query]);

    const detectFromText = React.useCallback((text: string, caret: number) => {
        let i = caret - 1;

        if (i >= 0 && /\s/.test(text[i])) {
            setOpen(false);
            setAnchor(null);
            setQuery("");
            return;
        }

        while (i >= 0 && isWordChar(text[i])) i--;

        if (i >= 0 && text[i] === "@") {
            const q = text.slice(i + 1, caret);
            setQuery(q);
            setAnchor({ start: i, end: caret });
            setOpen(true);
            setActiveIndex(0);
            return;
        }

        setOpen(false);
        setAnchor(null);
        setQuery("");
    }, []);

    const insertMention = (user: MentionUser) => {
        const el = taRef.current;
        if (!(el && anchor) || disabled) return;

        const before = value.slice(0, anchor.start);
        const after = value.slice(anchor.end);

        const tokenVisible = `@${user.name}`;
        const tokenInsert = `${tokenVisible} `;

        const next = before + tokenInsert + after;
        onChange(next);

        const start = before.length;
        const end = start + tokenVisible.length;

        mentionsRef.current = mentionsRef.current.filter((m) => !(m.start < end && m.end > start));

        if (user.id !== "__all__") {
            mentionsRef.current.push({ id: user.id, name: user.name, start, end });
        }

        setOpen(false);
        setAnchor(null);
        setQuery("");

        requestAnimationFrame(() => {
            const pos = start + tokenInsert.length;
            el.focus();
            el.setSelectionRange(pos, pos);
        });
    };

    const onTextChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
        if (disabled) return;

        const next = e.target.value;
        const caret = e.target.selectionStart ?? next.length;

        if (next.length > maxChars) {
            onChange(next.slice(0, maxChars));
            return;
        }

        onChange(next);

        mentionsRef.current = mentionsRef.current.filter((m) => next.slice(m.start, m.end) === `@${m.name}`);
        detectFromText(next, caret);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (disabled) return;

        if (open) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((v) => Math.min(v + 1, filtered.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((v) => Math.max(v - 1, 0));
                return;
            }
            if (e.key === "Enter") {
                if (filtered[activeIndex]) {
                    e.preventDefault();
                    insertMention(filtered[activeIndex]);
                    return;
                }
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.();
        }
    };

    const getPayloadText = React.useCallback(() => {
        let text = value;

        const ms = [...mentionsRef.current]
            .filter((m) => text.slice(m.start, m.end) === `@${m.name}`)
            .sort((a, b) => b.start - a.start);

        for (const m of ms) {
            text = text.slice(0, m.start) + `@${m.id}` + text.slice(m.end);
        }

        text = text.replace(/@all\b/g, "@__all__");

        return text;
    }, [value]);

    React.useImperativeHandle(ref, () => ({ getPayloadText }), [getPayloadText]);

    const previewNodes = React.useMemo(() => {
        const text = value ?? "";
        if (!text) return null;

        const ms = [...mentionsRef.current]
            .filter((m) => text.slice(m.start, m.end) === `@${m.name}`)
            .sort((a, b) => a.start - b.start);

        const nodes: React.ReactNode[] = [];
        let last = 0;

        for (const m of ms) {
            if (m.start > last) {
                const seg = text.slice(last, m.start);
                const segNodes = renderAllMentions(seg);
                if (Array.isArray(segNodes)) nodes.push(...segNodes);
                else nodes.push(segNodes);
            }

            nodes.push(
                <span key={`${m.id}-${m.start}`} className="font-semibold text-blue-600">
                    {text.slice(m.start, m.end)}
                </span>
            );

            last = m.end;
        }

        if (last < text.length) {
            const tail = renderAllMentions(text.slice(last));
            if (Array.isArray(tail)) nodes.push(...tail);
            else nodes.push(tail);
        }

        return nodes.length ? nodes : text;
    }, [value]);

    return (
        <div className="relative w-full min-w-0">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words text-sm text-zinc-900 leading-6">
                {value ? <>{previewNodes}</> : <span className="text-zinc-400">{placeholder}</span>}
            </div>

            <textarea
                ref={taRef}
                data-task-comment-input="true"
                value={value}
                onChange={onTextChange}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder=""
                disabled={disabled}
                className={cn(
                    "relative z-10 block h-6 min-h-[24px] w-full resize-none overflow-hidden bg-transparent text-sm text-transparent leading-6 caret-zinc-900 outline-none selection:bg-blue-200",
                    "disabled:cursor-not-allowed disabled:caret-transparent",
                    className
                )}
            />

            {open && !disabled ? (
                filtered.length > 0 ? (
                    <div className="absolute top-full left-0 z-[12000] mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                        <div className="max-h-56 overflow-auto p-1">
                            {filtered.map((u, idx) => (
                                <button
                                    key={u.id}
                                    type="button"
                                    onMouseDown={(ev) => {
                                        ev.preventDefault();
                                        insertMention(u);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-50",
                                        idx === activeIndex && "bg-zinc-50"
                                    )}>
                                    <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 font-semibold text-xs text-zinc-800">
                                        {u.id === "__all__" ? "ALL" : safeInitialsFromName(u.name)}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="truncate font-semibold text-zinc-900">
                                            {u.id === "__all__" ? "@all" : u.name}
                                        </div>
                                        <div className="text-xs text-zinc-500">Enter để chọn</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="absolute top-full left-0 z-[12000] mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-500 shadow-xl">
                        Không có thành viên để mention.
                    </div>
                )
            ) : null}
        </div>
    );
});

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
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
        return { json: JSON.parse(cleaned), text };
    } catch {
        return { json: null as unknown, text };
    }
}

function getErrorMessage(e: unknown, fallback: string) {
    if (e instanceof Error && e.message.trim()) return e.message;
    return fallback;
}

function asObject(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

const okByJsonStatus = (obj: unknown) => {
    const value = asObject(obj)?.status;
    const s = String(value ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: unknown) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    if (msg) return msg;
    const t = (text ?? "").toString().trim();
    return t || "Đã xảy ra lỗi";
};

function formatDisplayDate(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    if (s.startsWith("0001-01-01")) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
        const onlyDate = parseDateString(s);
        if (onlyDate) {
            return onlyDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric"
            });
        }
        return s;
    }
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}

function initials(u?: UserDto) {
    const fn = (u?.firstName ?? "").trim();
    const ln = (u?.lastName ?? "").trim();
    const a = fn ? fn[0] : "";
    const b = ln ? ln[0] : "";
    const out = (a + b).toUpperCase();
    return out || "U";
}

function fullName(u?: UserDto | null) {
    if (!u) return null;
    const s = `${(u.firstName ?? "").trim()} ${(u.lastName ?? "").trim()}`.trim();
    return s || null;
}

function priorityLabelOf(n?: number) {
    if (n === 0) return "Low";
    if (n === 1) return "Medium";
    if (n === 2) return "High";
    return "Low";
}

function severityLabelOf(n?: number) {
    if (n === 0) return "Minor";
    if (n === 1) return "Moderate";
    if (n === 2) return "Major";
    if (n === 3) return "Critical";
    return "Minor";
}

function progressLabelOf(n?: number) {
    const value = normalizeProgressValue(n);
    if (value === 0) return "To do";
    if (value < 50) return "Started";
    if (value < 75) return "In progress";
    if (value < 100) return "Review";
    return "Done";
}

function normalizePriorityValue(n?: number) {
    if (n === 0 || n === 1 || n === 2) return n;
    return 0;
}

function normalizeSeverityValue(n?: number) {
    if (n === 0 || n === 1 || n === 2 || n === 3) return n;
    return 0;
}

function normalizeProgressValue(n?: number) {
    if (typeof n !== "number" || !Number.isFinite(n)) return 0;
    const value = Math.floor(n);
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function sanitizeProgressInput(value: string) {
    const digits = value.replace(/\D+/g, "");

    if (digits === "") return "";
    if (/^0+$/.test(digits)) return "0";
    if (digits === "100") return "100";
    if (digits.startsWith("100")) return "100";

    return digits.slice(0, 2);
}

function clampProgressInput(value: string) {
    if (value === "") return "0";
    if (value === "100") return "100";

    const n = Number(value);
    if (!Number.isFinite(n)) return "0";

    return String(Math.min(Math.max(Math.floor(n), 0), 100));
}

function relativeTimeOf(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = d.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
    if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
    return rtf.format(Math.round(diffMs / day), "day");
}

function priorityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "high") return "text-rose-600";
    if (v === "medium") return "text-amber-700";
    if (v === "low") return "text-emerald-700";
    return "text-zinc-700";
}

function severityTone(label?: string | null) {
    const v = String(label ?? "").toLowerCase();
    if (v === "critical") return "text-red-600";
    if (v === "major") return "text-orange-600";
    if (v === "moderate") return "text-yellow-500";
    if (v === "minor") return "text-sky-600";
    return "text-zinc-700";
}

const selectItemClassName =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";

function toDateInputValue(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s || s.startsWith("0001-01-01")) return "";
    const dateOnly = s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function safeAvatarUrl(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return "";
    return raw.replace("localhost", "127.0.0.1");
}

function buildInitials(name?: string | null) {
    const s = String(name ?? "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return `${a}${b}`.toUpperCase() || "U";
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

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return null;
}

function getGroupIdFromParams(params: Record<string, string | string[] | undefined>) {
    const direct = readParam(params, "groupId") || readParam(params, "id") || readParam(params, "slug") || null;
    if (direct) return direct;

    const firstKey = Object.keys(params).find((k) => {
        const value = params[k];
        return typeof value === "string" || (Array.isArray(value) && typeof value[0] === "string");
    });

    return firstKey ? readParam(params, firstKey) : null;
}

function TrelloDatePicker({ label, value, onChange, min, disabled = false }: TrelloDatePickerProps) {
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
        if (open) setMonth(selectedDate ?? minDate ?? new Date());
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
        const top = 20;

        let left = rect.left;
        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }
        if (left < viewportPadding) left = viewportPadding;

        setPopupPosition({
            top,
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

    const portalTarget = typeof document !== "undefined" ? document.body : null;

    const popup =
        mounted && open && popupPosition && portalTarget
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
                                  className="h-11 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 font-semibold text-sm text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400">
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
                                  className="h-11 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 font-semibold text-sm text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400">
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
                                  className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                  <ChevronLeft className="h-5 w-5" />
                              </button>

                              <div className="font-bold text-base text-zinc-900">
                                  {monthOptions[month.getMonth()]?.label} {month.getFullYear()}
                              </div>

                              <button
                                  type="button"
                                  onClick={goNextMonth}
                                  className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50">
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
                                  head_cell: "h-10 w-10 text-center text-[12px] font-semibold text-zinc-500",
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
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-sm text-zinc-700 hover:bg-zinc-50">
                              Today
                          </button>

                          <button
                              type="button"
                              onClick={() => pickDate(addDays(new Date(), 1))}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-sm text-zinc-700 hover:bg-zinc-50">
                              Tomorrow
                          </button>

                          <button
                              type="button"
                              onClick={() => pickDate(addDays(new Date(), 7))}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-sm text-zinc-700 hover:bg-zinc-50">
                              Next week
                          </button>

                          <button
                              type="button"
                              onClick={() => {
                                  onChange("");
                                  setOpen(false);
                              }}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-rose-500 text-sm hover:bg-rose-50">
                              No date
                          </button>
                      </div>
                  </div>,
                  portalTarget
              )
            : null;

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
                        "mt-2 flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
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
                                "truncate text-left text-sm",
                                value ? "font-medium text-zinc-900" : "text-zinc-400",
                                disabled && "text-zinc-500"
                            )}>
                            {formatDateDisplay(value)}
                        </span>
                    </div>
                </button>
            </div>
            {popup}
        </>
    );
}

async function apiGetGroupDetail(groupId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/detail`);
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<GroupDetailResponse> | null;
}

function findTaskInGroupDetail(detail: GroupDetailResponse | null | undefined, taskId: string) {
    const statuses = detail?.taskStatuses ?? [];

    for (const st of statuses) {
        const list = st?.taskList ?? [];
        const found = list.find((t) => String(t?.taskId ?? "") === taskId);
        if (found) {
            return {
                task: found,
                statusName: st?.statusName ?? null,
                statusId: st?.statusId ?? null
            };
        }
    }

    return null;
}

function mapTaskDetailFromTaskItem(
    task: TaskItemResponse,
    taskId: string,
    fallbackStatusName?: string | null,
    fallbackStatusId?: string | null
): TaskDetail {
    const title = String(task?.taskTitle ?? "").trim() || "Task";
    const description = task?.taskDescription ?? null;
    const assigneeName = fullName(task?.assignee) ?? null;
    const statusFromTask = String(task?.groupStatus?.statusName ?? "").trim();
    const statusFromColumn = String(fallbackStatusName ?? "").trim();
    const statusName = statusFromTask || statusFromColumn || null;
    const statusId = String(task?.groupStatus?.statusId ?? fallbackStatusId ?? "").trim() || null;
    const priorityValue = normalizePriorityValue(task?.taskPriority);
    const severityValue = normalizeSeverityValue(task?.taskSeverity);
    const progressValue = normalizeProgressValue(task?.progress);

    return {
        id: String(task?.taskId ?? taskId),
        title,
        description: description != null ? String(description) : null,
        assigneeId: task?.assignee?.id ?? null,
        assigneeName,
        assigneeAvatarUrl: task?.assignee?.avatarUrl ?? null,
        statusId,
        statusName,
        priorityValue,
        priorityLabel: priorityLabelOf(priorityValue),
        severityValue,
        severityLabel: severityLabelOf(severityValue),
        progressValue,
        progressLabel: progressLabelOf(progressValue),
        startDateRaw: task?.startDate ?? null,
        dueDateRaw: task?.dueDate ?? null,
        startDateFmt: task?.startDate ? formatDisplayDate(String(task.startDate)) : "",
        dueDateFmt: task?.dueDate ? formatDisplayDate(String(task.dueDate)) : "",
        raw: task
    };
}

function mapStatusOptions(detail: GroupDetailResponse | null | undefined): StatusOption[] {
    return (detail?.taskStatuses ?? [])
        .map((s) => {
            const statusId = String(s?.statusId ?? "").trim();
            const statusName = String(s?.statusName ?? "").trim();
            if (!(statusId && statusName)) return null;
            return { statusId, statusName };
        })
        .filter((s): s is StatusOption => s != null);
}

async function apiGetTaskDetailFromGroup(groupId: string, taskId: string) {
    const resp = await apiGetGroupDetail(groupId);
    const group = resp?.data ?? null;
    const hit = findTaskInGroupDetail(group, taskId);

    if (!hit) throw new Error("Không tìm thấy task trong group");

    return {
        task: mapTaskDetailFromTaskItem(hit.task, taskId, hit.statusName, hit.statusId),
        statusOptions: mapStatusOptions(group),
        userRole: String(group?.userRole ?? "").trim()
    };
}

async function apiGetGroupMembers(groupId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/group/${encodeURIComponent(groupId)}/members`);
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<GroupMemberListResponse> | null;
}

async function apiGetMyProfile() {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl("/user-profile");
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<UserProfileResponse> | null;
}

async function apiGetTaskComments(taskId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/task-comments/${encodeURIComponent(taskId)}?limit=50&offset=0`);
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<TaskCommentListResponse> | null;
}

async function apiSendTaskComment(taskId: string, content: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl("/task-comments");
    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            taskId,
            content
        })
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<TaskCommentDto> | null;
}

async function apiReplyTaskComment(taskId: string, parentCommentId: string, content: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl("/task-comments/reply");
    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            taskId,
            parentCommentId,
            content
        })
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<TaskCommentDto> | null;
}

async function apiDeleteTaskComment(commentId: string) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/task-comments/${encodeURIComponent(commentId)}`);
    const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return json;
}

function toApiDateTimeOrNull(input: string) {
    const s = String(input ?? "").trim();
    if (!s) return null;
    return `${s}T00:00:00`;
}

async function apiUpdateTask(args: { groupId: string; taskId: string; payload: UpdateTaskRequest }) {
    const token = getAccessTokenOrNull();
    const base = getApiBase();
    if (!base) throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.");

    const url = apiUrl(`/Task/${encodeURIComponent(args.groupId)}/${encodeURIComponent(args.taskId)}`);
    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "text/plain, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(args.payload)
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json));
    }

    return json;
}

type CommentActionProps = {
    onReply: () => void;
    onDelete: () => void;
    canShowMenu: boolean;
    canDelete: boolean;
    deleting: boolean;
    size?: "sm" | "md";
};

function CommentActions({ onReply, onDelete, canShowMenu, canDelete, deleting, size = "sm" }: CommentActionProps) {
    const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
    const iconSize = "h-4 w-4";
    const textSize = size === "sm" ? "text-xs" : "text-sm";

    if (!canShowMenu) return null;

    return (
        <div className="mt-2 flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "grid place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100",
                            buttonSize
                        )}
                        aria-label="More actions">
                        <MoreHorizontal className={iconSize} />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className={cn("z-[11001] w-44 rounded-xl border border-[#EDEDED] bg-white p-1 shadow-xl")}>
                    <DropdownMenuItem
                        onClick={() => {
                            onReply();
                        }}
                        className={cn(
                            "cursor-pointer rounded-lg px-3 py-2 text-zinc-700 outline-none",
                            "focus:bg-zinc-100 focus:text-zinc-900",
                            textSize
                        )}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Reply
                    </DropdownMenuItem>

                    {canDelete ? (
                        <DropdownMenuItem
                            onClick={() => {
                                onDelete();
                            }}
                            disabled={deleting}
                            className={cn(
                                "cursor-pointer rounded-lg px-3 py-2 text-red-600 outline-none",
                                "focus:bg-red-50 focus:text-red-600",
                                textSize
                            )}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleting ? "Đang xóa..." : "Xóa"}
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export default function TaskDetailModal(props: {
    open: boolean;
    onClose: () => void;
    taskId: string | null;
    onDelete?: (taskId: string) => void;
    onSaved?: () => Promise<void> | void;
}) {
    const { open, onClose, taskId, onSaved } = props;
    const params = useParams<Record<string, string | string[] | undefined>>();
    const groupId = React.useMemo(() => getGroupIdFromParams(params ?? {}), [params]);
    const commentMentionRef = React.useRef<MentionTextareaHandle | null>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (!(open && mounted)) return;

        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyPaddingRight = document.body.style.paddingRight;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.paddingRight = originalBodyPaddingRight;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, [open, mounted]);

    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [isRefreshingDetail, setIsRefreshingDetail] = React.useState(false);
    const [detailError, setDetailError] = React.useState<string | null>(null);
    const [task, setTask] = React.useState<TaskDetail | null>(null);

    const [loadingComments, setLoadingComments] = React.useState(false);
    const [comments, setComments] = React.useState<TaskCommentWithReplies[]>([]);
    const [commentError, setCommentError] = React.useState<string | null>(null);
    const [commentDraft, setCommentDraft] = React.useState("");
    const [sendingComment, setSendingComment] = React.useState(false);
    const [sendCommentError, setSendCommentError] = React.useState<string | null>(null);

    const [statusOptions, setStatusOptions] = React.useState<StatusOption[]>([]);
    const [members, setMembers] = React.useState<GroupMemberDto[]>([]);
    const [membersError, setMembersError] = React.useState<string | null>(null);
    const [myAvatarUrl, setMyAvatarUrl] = React.useState("");
    const [myUserId, setMyUserId] = React.useState("");
    const [myFullName, setMyFullName] = React.useState("");
    const [currentUserRole, setCurrentUserRole] = React.useState("");

    const [replyingTo, setReplyingTo] = React.useState<TaskCommentDto | null>(null);
    const [deletingCommentId, setDeletingCommentId] = React.useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<TaskCommentDto | null>(null);

    const [assigneeId, setAssigneeId] = React.useState("");
    const [statusId, setStatusId] = React.useState("");
    const [taskName, setTaskName] = React.useState("");
    const [priority, setPriority] = React.useState("");
    const [severity, setSeverity] = React.useState("");
    const [progress, setProgress] = React.useState("0");
    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [description, setDescription] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);

    const isAliveRef = React.useRef(true);

    React.useEffect(() => {
        isAliveRef.current = true;
        return () => {
            isAliveRef.current = false;
        };
    }, []);

    const normalizedRole = React.useMemo(() => currentUserRole.trim().toLowerCase(), [currentUserRole]);

    const isOwnerOrModerator = React.useMemo(() => {
        return normalizedRole === "owner" || normalizedRole === "moderator";
    }, [normalizedRole]);

    const isViewOnly = React.useMemo(() => {
        return normalizedRole === "view" || normalizedRole === "viewer";
    }, [normalizedRole]);

    const canComment = React.useMemo(() => {
        return !isViewOnly;
    }, [isViewOnly]);

    const canEditTask = React.useMemo(() => {
        return !isViewOnly;
    }, [isViewOnly]);

    const canDeleteComment = React.useCallback(
        (comment: TaskCommentDto) => {
            if (isViewOnly) return false;

            const commentUserId = String(comment.userId ?? comment.user?.id ?? "");
            if (!(commentUserId && myUserId)) return false;
            if (isOwnerOrModerator) return true;
            return commentUserId === myUserId;
        },
        [isOwnerOrModerator, myUserId, isViewOnly]
    );

    const canShowCommentMenu = React.useCallback(() => {
        return !!myUserId && canComment;
    }, [myUserId, canComment]);

    const reloadComments = React.useCallback(async () => {
        if (!taskId) return;
        const refreshResp = await apiGetTaskComments(taskId);
        const list = (refreshResp?.data?.comments ?? []) as TaskCommentWithReplies[];
        setComments((list ?? []).filter((c) => !c?.isDeleted));
    }, [taskId]);

    const handleReplyComment = (comment: TaskCommentDto) => {
        if (!canComment) return;

        setReplyingTo(comment);

        requestAnimationFrame(() => {
            const el = document.querySelector("[data-task-comment-input='true']") as HTMLTextAreaElement | null;
            el?.focus();
        });
    };

    const cancelReply = () => {
        setReplyingTo(null);
        setCommentDraft("");
    };

    const openDeleteConfirm = (comment: TaskCommentDto) => {
        if (!canDeleteComment(comment)) return;
        setDeleteTarget(comment);
        setDeleteOpen(true);
    };

    const closeDeleteConfirm = () => {
        if (deletingCommentId) return;
        setDeleteOpen(false);
        setDeleteTarget(null);
    };

    const membersById = React.useMemo<Record<string, string>>(
        () =>
            Object.fromEntries(
                members
                    .map((m) => {
                        const id = String(m.userId ?? "").trim();
                        const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email || "User";
                        return id ? [id, name] : null;
                    })
                    .filter(Boolean) as [string, string][]
            ),
        [members]
    );

    const mentionUsers = React.useMemo<MentionUser[]>(
        () =>
            Object.entries(membersById).map(([id, name]) => ({
                id,
                name
            })),
        [membersById]
    );

    const handleSendComment = async () => {
        if (!canComment || isViewOnly) return;

        const visibleText = commentDraft.trim();
        if (!(visibleText && taskId)) return;

        const rawPayload = commentMentionRef.current?.getPayloadText() ?? visibleText;
        const content = expandMentionAll(rawPayload, membersById, myUserId);

        try {
            setSendingComment(true);
            setSendCommentError(null);

            if (replyingTo?.commentId) {
                await apiReplyTaskComment(taskId, replyingTo.commentId, content);
            } else {
                await apiSendTaskComment(taskId, content);
            }

            await reloadComments();
            setCommentDraft("");
            setReplyingTo(null);
        } catch (e: unknown) {
            setSendCommentError(getErrorMessage(e, "Không gửi được comment"));
        } finally {
            setSendingComment(false);
        }
    };

    const handleConfirmDeleteComment = async () => {
        if (isViewOnly) return;

        const id = String(deleteTarget?.commentId ?? "").trim();
        if (!(id && taskId)) return;

        try {
            setDeletingCommentId(id);
            setSendCommentError(null);

            await apiDeleteTaskComment(id);
            await reloadComments();
            closeDeleteConfirm();
        } catch (e: unknown) {
            setSendCommentError(getErrorMessage(e, "Không xóa được comment"));
        } finally {
            setDeletingCommentId(null);
        }
    };

    const handleProgressInputChange = (value: string) => {
        setProgress(sanitizeProgressInput(value));
    };

    const handleProgressInputBlur = () => {
        setProgress((prev) => clampProgressInput(prev));
    };

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    React.useEffect(() => {
        if (!open) return;
        setIsEditing(false);
    }, [open, taskId]);

    React.useEffect(() => {
        if (!open) return;
        setSendCommentError(null);
        setCommentDraft("");
        setReplyingTo(null);
        setDeleteOpen(false);
        setDeleteTarget(null);
    }, [open, taskId]);

    React.useEffect(() => {
        if (isViewOnly && isEditing) {
            setIsEditing(false);
        }
    }, [isViewOnly, isEditing]);

    const refreshTaskDetailSilently = React.useCallback(async () => {
        if (!(open && taskId && groupId)) return;

        try {
            setIsRefreshingDetail(true);
            const result = await apiGetTaskDetailFromGroup(groupId, taskId);

            if (!isAliveRef.current) return;

            setTask(result.task);
            setStatusOptions(result.statusOptions);
            setCurrentUserRole(result.userRole);
            setDetailError(null);
        } catch (e: unknown) {
            if (!isAliveRef.current) return;
            setDetailError(getErrorMessage(e, "Không tải được task detail"));
        } finally {
            if (isAliveRef.current) setIsRefreshingDetail(false);
        }
    }, [open, taskId, groupId]);

    React.useEffect(() => {
        if (!(open && taskId)) return;
        let alive = true;

        (async () => {
            setLoadingDetail(true);
            setDetailError(null);

            try {
                if (!groupId) throw new Error("Thiếu groupId từ route");
                const result = await apiGetTaskDetailFromGroup(groupId, taskId);
                if (!alive) return;
                setTask(result.task);
                setStatusOptions(result.statusOptions);
                setCurrentUserRole(result.userRole);
            } catch (e: unknown) {
                if (!alive) return;
                setDetailError(getErrorMessage(e, "Không tải được task detail"));
                setTask(null);
                setStatusOptions([]);
                setCurrentUserRole("");
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId, groupId]);

    React.useEffect(() => {
        if (!(open && taskId)) return;
        let alive = true;

        (async () => {
            setLoadingComments(true);
            setCommentError(null);

            try {
                const resp = await apiGetTaskComments(taskId);
                const list = (resp?.data?.comments ?? []) as TaskCommentWithReplies[];
                if (!alive) return;
                setComments((list ?? []).filter((c) => !c?.isDeleted));
            } catch (e: unknown) {
                if (!alive) return;
                setCommentError(getErrorMessage(e, "Không tải được comments"));
                setComments([]);
            } finally {
                if (alive) setLoadingComments(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId]);

    React.useEffect(() => {
        if (!(open && groupId)) return;
        let alive = true;

        (async () => {
            setMembersError(null);

            try {
                const resp = await apiGetGroupMembers(groupId);
                const list = resp?.data?.members ?? [];
                if (!alive) return;
                setMembers((list ?? []).filter((m) => !!String(m?.userId ?? "").trim()));
            } catch (e: unknown) {
                if (!alive) return;
                setMembersError(getErrorMessage(e, "Không tải được danh sách thành viên"));
                setMembers([]);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, groupId]);

    React.useEffect(() => {
        if (!open) return;
        let alive = true;

        (async () => {
            try {
                const resp = await apiGetMyProfile();
                if (!alive) return;

                const profile = resp?.data;
                setMyAvatarUrl(safeAvatarUrl(profile?.avatarUrl ?? ""));
                setMyUserId(String(profile?.userId ?? ""));
                setMyFullName(`${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim());
            } catch {
                if (!alive) return;
                setMyAvatarUrl("");
                setMyUserId("");
                setMyFullName("");
            }
        })();

        return () => {
            alive = false;
        };
    }, [open]);

    React.useEffect(() => {
        setTaskName((task?.title ?? "").slice(0, TASK_TITLE_MAX_LENGTH));
        setAssigneeId(task?.assigneeId ?? "");
        setStatusId(task?.statusId ?? "");
        setPriority(String(normalizePriorityValue(task?.priorityValue)));
        setSeverity(String(normalizeSeverityValue(task?.severityValue)));
        setProgress(String(normalizeProgressValue(task?.progressValue)));
        setStartDate(toDateInputValue(task?.startDateRaw));
        setDueDate(toDateInputValue(task?.dueDateRaw));
        setDescription((task?.description ?? "").slice(0, TASK_DESCRIPTION_MAX_LENGTH));
        setSaveError(null);
        setIsEditing(false);
    }, [task]);

    const assigneeOptions = React.useMemo(
        () =>
            members.map((m) => {
                const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
                return {
                    userId: String(m.userId ?? ""),
                    label: name || m.email || "Unnamed",
                    avatarUrl: safeAvatarUrl(m.avatarUrl)
                };
            }),
        [members]
    );

    const selectedAssignee = React.useMemo(
        () => assigneeOptions.find((m) => m.userId === assigneeId) ?? null,
        [assigneeOptions, assigneeId]
    );

    const selectedAssigneeDisplay = React.useMemo(() => {
        if (selectedAssignee) return selectedAssignee;

        if (task?.assigneeId && task.assigneeName) {
            return {
                userId: task.assigneeId,
                label: task.assigneeName,
                avatarUrl: safeAvatarUrl(task.assigneeAvatarUrl)
            };
        }

        return { userId: "", label: "Unassigned", avatarUrl: "" };
    }, [selectedAssignee, task?.assigneeAvatarUrl, task?.assigneeId, task?.assigneeName]);

    const selectedStatusName = React.useMemo(() => {
        const hit = statusOptions.find((s) => s.statusId === statusId);
        return hit?.statusName ?? task?.statusName ?? "—";
    }, [statusId, statusOptions, task?.statusName]);

    const selectedPriorityValue = React.useMemo(() => normalizePriorityValue(Number(priority)), [priority]);
    const selectedPriorityLabel = React.useMemo(() => priorityLabelOf(selectedPriorityValue), [selectedPriorityValue]);

    const selectedSeverityValue = React.useMemo(() => normalizeSeverityValue(Number(severity)), [severity]);
    const selectedSeverityLabel = React.useMemo(() => severityLabelOf(selectedSeverityValue), [selectedSeverityValue]);

    const selectedProgressValue = React.useMemo(() => {
        if (progress === "") return 0;
        return normalizeProgressValue(Number(progress));
    }, [progress]);

    const selectedProgressLabel = React.useMemo(() => progressLabelOf(selectedProgressValue), [selectedProgressValue]);
    const descriptionLength = description.length;

    const handleSave = async () => {
        if (!canEditTask || isViewOnly) return;

        setSaveError(null);

        const taskNameTrimmed = taskName.trim().slice(0, TASK_TITLE_MAX_LENGTH);
        const descriptionTrimmed = description.trim().slice(0, TASK_DESCRIPTION_MAX_LENGTH);

        if (!taskNameTrimmed) {
            setSaveError("Tên task là bắt buộc.");
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setSaveError("Start Date phải nhỏ hơn hoặc bằng Due Date.");
            return;
        }

        if (groupId == null || taskId == null) {
            setSaveError("Thiếu groupId hoặc taskId.");
            return;
        }

        const normalizedProgressValue =
            progress === "" ? 0 : normalizeProgressValue(Number(clampProgressInput(progress)));

        try {
            setSubmitting(true);

            await apiUpdateTask({
                groupId,
                taskId,
                payload: {
                    taskName: taskNameTrimmed,
                    taskDescription: descriptionTrimmed || null,
                    assigneeId: assigneeId || null,
                    groupStatusId: statusId || null,
                    startDate: toApiDateTimeOrNull(startDate),
                    dueDate: toApiDateTimeOrNull(dueDate),
                    taskPriority: selectedPriorityValue,
                    taskSeverity: selectedSeverityValue,
                    progress: normalizedProgressValue
                }
            });

            setTask((prev) => {
                if (!prev) return prev;

                return {
                    ...prev,
                    title: taskNameTrimmed,
                    assigneeId: assigneeId || null,
                    assigneeName: selectedAssignee?.label ?? null,
                    assigneeAvatarUrl: selectedAssignee?.avatarUrl ?? null,
                    statusId: statusId || null,
                    statusName: selectedStatusName,
                    priorityValue: selectedPriorityValue,
                    priorityLabel: selectedPriorityLabel,
                    severityValue: selectedSeverityValue,
                    severityLabel: selectedSeverityLabel,
                    progressValue: normalizedProgressValue,
                    progressLabel: progressLabelOf(normalizedProgressValue),
                    startDateRaw: startDate ? toApiDateTimeOrNull(startDate) : null,
                    dueDateRaw: dueDate ? toApiDateTimeOrNull(dueDate) : null,
                    startDateFmt: startDate ? formatDisplayDate(startDate) : "",
                    dueDateFmt: dueDate ? formatDisplayDate(dueDate) : "",
                    description: descriptionTrimmed || null
                };
            });

            setDescription(descriptionTrimmed);
            setProgress(String(normalizedProgressValue));
            setIsEditing(false);

            void Promise.allSettled([refreshTaskDetailSilently(), Promise.resolve(onSaved?.())]);
        } catch (e: unknown) {
            setSaveError(getErrorMessage(e, "Không cập nhật được task"));
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
                className="relative flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-zinc-200 border-b px-7 py-5">
                    <div className="min-w-0 flex-1">
                        {loadingDetail ? (
                            <h2 className="min-w-0 truncate font-extrabold text-[26px] text-zinc-900 leading-none">
                                Loading...
                            </h2>
                        ) : isEditing ? (
                            <div className="max-w-[560px]">
                                <input
                                    value={taskName}
                                    maxLength={TASK_TITLE_MAX_LENGTH}
                                    onChange={(e) => setTaskName(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH))}
                                    placeholder="Task name"
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-extrabold text-[24px] text-zinc-900 leading-none outline-none"
                                />
                                <div className="mt-2 text-right font-medium text-xs text-zinc-500">
                                    {taskName.length}/{TASK_TITLE_MAX_LENGTH}
                                </div>
                            </div>
                        ) : (
                            <div className="flex min-w-0 items-center gap-3">
                                <h2 className="min-w-0 break-words font-extrabold text-[26px] text-zinc-900 leading-none">
                                    {taskName || "Task"}
                                </h2>

                                {isRefreshingDetail ? (
                                    <div className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 font-semibold text-[11px] text-zinc-500">
                                        Syncing...
                                    </div>
                                ) : null}
                            </div>
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

                <div className="flex-1 overflow-hidden px-7 py-5">
                    <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
                        <div className="min-w-0 overflow-y-auto pr-1">
                            {detailError ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                                    {detailError}
                                </div>
                            ) : null}

                            {loadingDetail ? (
                                <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang tải…
                                </div>
                            ) : null}

                            {membersError ? (
                                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                                    {membersError}
                                </div>
                            ) : null}

                            {saveError ? (
                                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                                    {saveError}
                                </div>
                            ) : null}

                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-bold text-lg text-zinc-900">Task information</div>
                                    <div className="text-sm text-zinc-500">Chi tiết và trạng thái của task</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {canEditTask ? (
                                        !isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                disabled={loadingDetail || !!detailError || !task}
                                                className="h-10 rounded-xl bg-[#f54a00] px-5 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                                                Edit
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleSave();
                                                }}
                                                disabled={submitting}
                                                className="h-10 rounded-xl bg-[#f54a00] px-5 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                                                {submitting ? "Saving..." : "Save change"}
                                            </button>
                                        )
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                                <div>
                                    <div className="font-semibold text-sm text-zinc-600">Assignee</div>
                                    <Select
                                        value={assigneeId || "unassigned"}
                                        onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                                            <div className="flex min-w-0 items-center gap-2">
                                                {selectedAssigneeDisplay.avatarUrl ? (
                                                    <Image
                                                        src={selectedAssigneeDisplay.avatarUrl}
                                                        alt={selectedAssigneeDisplay.label}
                                                        width={24}
                                                        height={24}
                                                        unoptimized
                                                        className="h-6 w-6 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 font-bold text-[11px] text-white">
                                                        {buildInitials(selectedAssigneeDisplay.label)}
                                                    </div>
                                                )}
                                                <span className="truncate">{selectedAssigneeDisplay.label}</span>
                                            </div>
                                        </SelectTrigger>

                                        <SelectContent
                                            position="popper"
                                            side="bottom"
                                            align="start"
                                            sideOffset={8}
                                            avoidCollisions
                                            className="z-[10010] min-w-[260px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                            <SelectItem value="unassigned" className={selectItemClassName}>
                                                <div className="flex items-center gap-2">
                                                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 font-bold text-[11px] text-white">
                                                        U
                                                    </div>
                                                    <span>Unassigned</span>
                                                </div>
                                            </SelectItem>

                                            {assigneeOptions.map((m) => (
                                                <SelectItem
                                                    key={m.userId}
                                                    value={m.userId}
                                                    className={selectItemClassName}>
                                                    <div className="flex items-center gap-2">
                                                        {m.avatarUrl ? (
                                                            <Image
                                                                src={m.avatarUrl}
                                                                alt={m.label}
                                                                width={24}
                                                                height={24}
                                                                unoptimized
                                                                className="h-6 w-6 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 font-bold text-[11px] text-white">
                                                                {buildInitials(m.label)}
                                                            </div>
                                                        )}
                                                        <span className="truncate">{m.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <div className="font-semibold text-sm text-zinc-600">Status</div>
                                    <Select
                                        value={statusId || "no-status"}
                                        onValueChange={(v) => setStatusId(v === "no-status" ? "" : v)}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                                            <span className="truncate">{selectedStatusName}</span>
                                        </SelectTrigger>

                                        <SelectContent
                                            position="popper"
                                            side="bottom"
                                            align="start"
                                            sideOffset={8}
                                            avoidCollisions
                                            className="z-[10010] min-w-[216px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                            <SelectItem value="no-status" className={selectItemClassName}>
                                                No status
                                            </SelectItem>

                                            {statusOptions.map((s) => (
                                                <SelectItem
                                                    key={s.statusId}
                                                    value={s.statusId}
                                                    className={selectItemClassName}>
                                                    {s.statusName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <div className="font-semibold text-sm text-zinc-600">Priority</div>
                                    <Select
                                        value={String(selectedPriorityValue)}
                                        onValueChange={setPriority}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm disabled:cursor-not-allowed disabled:opacity-70">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-2",
                                                    priorityTone(selectedPriorityLabel)
                                                )}>
                                                <span className="h-2 w-2 rounded-full bg-current" />
                                                {selectedPriorityLabel}
                                            </span>
                                        </SelectTrigger>

                                        <SelectContent
                                            position="popper"
                                            side="bottom"
                                            align="end"
                                            sideOffset={8}
                                            avoidCollisions
                                            className="z-[10010] min-w-[168px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                            <SelectItem value="0" className={selectItemClassName}>
                                                Low
                                            </SelectItem>
                                            <SelectItem value="1" className={selectItemClassName}>
                                                Medium
                                            </SelectItem>
                                            <SelectItem value="2" className={selectItemClassName}>
                                                High
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <TrelloDatePicker
                                    label="Start Date"
                                    value={startDate}
                                    onChange={setStartDate}
                                    disabled={!isEditing}
                                />

                                <TrelloDatePicker
                                    label="Due Date"
                                    value={dueDate}
                                    onChange={setDueDate}
                                    min={startDate || undefined}
                                    disabled={!isEditing}
                                />

                                <div>
                                    <div className="font-semibold text-sm text-zinc-600">Severity</div>
                                    <Select
                                        value={String(selectedSeverityValue)}
                                        onValueChange={setSeverity}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm disabled:cursor-not-allowed disabled:opacity-70">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-2",
                                                    severityTone(selectedSeverityLabel)
                                                )}>
                                                <span className="h-2 w-2 rounded-full bg-current" />
                                                {selectedSeverityLabel}
                                            </span>
                                        </SelectTrigger>

                                        <SelectContent
                                            position="popper"
                                            side="bottom"
                                            align="end"
                                            sideOffset={8}
                                            avoidCollisions
                                            className="z-[10010] min-w-[168px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                            <SelectItem value="0" className={selectItemClassName}>
                                                Minor
                                            </SelectItem>
                                            <SelectItem value="1" className={selectItemClassName}>
                                                Moderate
                                            </SelectItem>
                                            <SelectItem value="2" className={selectItemClassName}>
                                                Major
                                            </SelectItem>
                                            <SelectItem value="3" className={selectItemClassName}>
                                                Critical
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-2 xl:col-span-2">
                                    <div className="font-semibold text-sm text-zinc-600">Progress</div>

                                    <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                                            <span className="font-medium text-zinc-800">{selectedProgressLabel}</span>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={progress}
                                                    onChange={(e) => handleProgressInputChange(e.target.value)}
                                                    onBlur={handleProgressInputBlur}
                                                    disabled={!isEditing}
                                                    placeholder="0"
                                                    className="h-8 w-14 rounded-lg border border-zinc-200 px-0 text-center font-semibold text-sm text-zinc-900 leading-none outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                                                />
                                                <span className="font-bold text-zinc-900">%</span>
                                            </div>
                                        </div>

                                        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
                                            <div
                                                className="h-full rounded-full bg-orange-500 transition-all"
                                                style={{ width: `${selectedProgressValue}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-5 gap-2">
                                            {PROGRESS_OPTIONS.map((value) => {
                                                const active = selectedProgressValue === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        disabled={!isEditing}
                                                        onClick={() => setProgress(String(value))}
                                                        className={cn(
                                                            "h-9 rounded-xl border font-semibold text-sm transition",
                                                            active
                                                                ? "border-orange-500 bg-orange-500 text-white"
                                                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                                                            !isEditing && "cursor-not-allowed opacity-70"
                                                        )}>
                                                        {value}%
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="font-semibold text-sm text-zinc-600">Description</div>
                                    {isEditing ? (
                                        <div
                                            className={cn(
                                                "font-medium text-xs",
                                                descriptionLength >= TASK_DESCRIPTION_MAX_LENGTH
                                                    ? "text-rose-500"
                                                    : "text-zinc-500"
                                            )}>
                                            {descriptionLength}/{TASK_DESCRIPTION_MAX_LENGTH}
                                        </div>
                                    ) : null}
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value.slice(0, TASK_DESCRIPTION_MAX_LENGTH))
                                    }
                                    placeholder="(No description)"
                                    disabled={!isEditing}
                                    maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                                    className="min-h-[110px] w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="min-w-0 overflow-y-auto xl:border-zinc-200 xl:border-l xl:pr-0 xl:pl-4">
                            <div className="sticky top-0 z-10 bg-white pb-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-zinc-700" />
                                    <div className="font-extrabold text-xl text-zinc-900">Comments</div>
                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-xs text-zinc-600">
                                        {loadingComments ? "…" : comments.length}
                                    </span>
                                </div>

                                {replyingTo ? (
                                    <div className="mt-3 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                                        <div className="min-w-0 text-zinc-700">
                                            Đang trả lời{" "}
                                            <span className="font-semibold">{fullName(replyingTo.user) || "User"}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={cancelReply}
                                            className="ml-3 shrink-0 rounded-lg px-2 py-1 font-semibold text-orange-700 text-xs hover:bg-orange-100">
                                            Hủy
                                        </button>
                                    </div>
                                ) : null}

                                {commentError ? (
                                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                                        {commentError}
                                    </div>
                                ) : null}

                                {sendCommentError ? (
                                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                                        {sendCommentError}
                                    </div>
                                ) : null}
                            </div>

                            <div className="w-full space-y-4 pb-4">
                                {loadingComments ? (
                                    <div className="text-sm text-zinc-600">(Đang tải comments…)</div>
                                ) : comments.length === 0 ? (
                                    <div className="text-sm text-zinc-500">(Chưa có comment)</div>
                                ) : (
                                    comments.map((c) => {
                                        const u = c.user;
                                        const name =
                                            `${(u?.firstName ?? "").trim()} ${(u?.lastName ?? "").trim()}`.trim() ||
                                            "User";
                                        const when = c.createdAt ? relativeTimeOf(c.createdAt) : "";
                                        const replies = (c.replies ?? []).filter((r) => !r?.isDeleted);

                                        return (
                                            <div
                                                key={c.commentId ?? `${c.userId ?? "u"}-${c.createdAt ?? "t"}`}
                                                className="w-full space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
                                                <div className="flex items-start gap-3">
                                                    {safeAvatarUrl(u?.avatarUrl) ? (
                                                        <Image
                                                            src={safeAvatarUrl(u?.avatarUrl)}
                                                            alt={name}
                                                            width={36}
                                                            height={36}
                                                            unoptimized
                                                            className="h-9 w-9 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 font-extrabold text-white text-xs">
                                                            {initials(u)}
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-baseline gap-3">
                                                                    <div className="font-bold text-sm text-zinc-900">
                                                                        {name}
                                                                    </div>
                                                                    <div className="text-xs text-zinc-400">{when}</div>
                                                                </div>

                                                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                                                                    <RichTextWithMentions
                                                                        text={String(c.content ?? "")}
                                                                        membersById={membersById}
                                                                        authorId={String(c.userId ?? c.user?.id ?? "")}
                                                                    />
                                                                </div>

                                                                <CommentActions
                                                                    onReply={() => handleReplyComment(c)}
                                                                    onDelete={() => openDeleteConfirm(c)}
                                                                    canShowMenu={canShowCommentMenu()}
                                                                    canDelete={canDeleteComment(c)}
                                                                    deleting={deletingCommentId === c.commentId}
                                                                    size="sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {replies.length > 0 ? (
                                                    <div className="mt-4 w-full space-y-4 border-zinc-200 border-l-2 pl-4">
                                                        {replies.map((r) => {
                                                            const ru = r.user;
                                                            const rname =
                                                                `${(ru?.firstName ?? "").trim()} ${(ru?.lastName ?? "").trim()}`.trim() ||
                                                                "User";
                                                            const rwhen = r.createdAt
                                                                ? relativeTimeOf(r.createdAt)
                                                                : "";

                                                            return (
                                                                <div
                                                                    key={
                                                                        r.commentId ??
                                                                        `${r.userId ?? "u"}-${r.createdAt ?? "t"}`
                                                                    }
                                                                    className="flex gap-3">
                                                                    {safeAvatarUrl(ru?.avatarUrl) ? (
                                                                        <Image
                                                                            src={safeAvatarUrl(ru?.avatarUrl)}
                                                                            alt={rname}
                                                                            width={32}
                                                                            height={32}
                                                                            unoptimized
                                                                            className="h-8 w-8 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500 font-extrabold text-[11px] text-white">
                                                                            {initials(ru)}
                                                                        </div>
                                                                    )}

                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                                    <p className="font-semibold text-sm text-zinc-900">
                                                                                        {rname}
                                                                                    </p>
                                                                                    <span className="text-xs text-zinc-400">
                                                                                        • {rwhen}
                                                                                    </span>
                                                                                </div>

                                                                                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                                                                                    <RichTextWithMentions
                                                                                        text={String(r.content ?? "")}
                                                                                        membersById={membersById}
                                                                                        authorId={String(
                                                                                            r.userId ?? r.user?.id ?? ""
                                                                                        )}
                                                                                    />
                                                                                </p>

                                                                                <CommentActions
                                                                                    onReply={() =>
                                                                                        handleReplyComment(r)
                                                                                    }
                                                                                    onDelete={() =>
                                                                                        openDeleteConfirm(r)
                                                                                    }
                                                                                    canShowMenu={canShowCommentMenu()}
                                                                                    canDelete={canDeleteComment(r)}
                                                                                    deleting={
                                                                                        deletingCommentId ===
                                                                                        r.commentId
                                                                                    }
                                                                                    size="sm"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {canComment ? (
                                <div className="sticky bottom-0 mt-4 bg-white pt-3">
                                    <div className="flex w-full items-center gap-3">
                                        {myAvatarUrl ? (
                                            <Image
                                                src={myAvatarUrl}
                                                alt={myFullName || "Me"}
                                                width={36}
                                                height={36}
                                                unoptimized
                                                className="h-9 w-9 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 font-bold text-sm text-white">
                                                {buildInitials(myFullName || "D")}
                                            </div>
                                        )}

                                        <div className="w-full flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <MentionTextarea
                                                        ref={commentMentionRef}
                                                        value={commentDraft}
                                                        onChange={setCommentDraft}
                                                        members={mentionUsers}
                                                        meId={myUserId}
                                                        placeholder={
                                                            replyingTo ? "Write a reply..." : "Write a comment..."
                                                        }
                                                        maxChars={500}
                                                        disabled={!canComment || sendingComment}
                                                        onSubmit={() => {
                                                            void handleSendComment();
                                                        }}
                                                        className="disabled:cursor-not-allowed disabled:opacity-60"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void handleSendComment();
                                                    }}
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f54a00] text-white hover:bg-[#f54a00]/80 disabled:opacity-60"
                                                    aria-label="Send"
                                                    disabled={!commentDraft.trim() || sendingComment || !canComment}>
                                                    {sendingComment ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <SendHorizontal className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <AlertDialog open={deleteOpen} onOpenChange={(v) => (v ? setDeleteOpen(true) : closeDeleteConfirm())}>
                    <AlertDialogContent className="z-[11000] rounded-2xl sm:max-w-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg">Xác nhận xóa</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#111827] text-sm leading-6">
                                Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter className="gap-3 sm:gap-3">
                            <AlertDialogCancel
                                disabled={!!deletingCommentId}
                                className={cn(
                                    "rounded-xl bg-[#F3F4F6] text-[#111827]",
                                    "border-0 shadow-none",
                                    "hover:bg-[#E5E7EB]",
                                    "focus-visible:ring-0"
                                )}>
                                Hủy
                            </AlertDialogCancel>

                            <AlertDialogAction
                                disabled={!!deletingCommentId}
                                onClick={(e) => {
                                    e.preventDefault();
                                    void handleConfirmDeleteComment();
                                }}
                                className="rounded-xl bg-red-600 px-8 text-white hover:bg-red-700 focus-visible:ring-0">
                                {deletingCommentId ? "Đang xóa..." : "Xóa"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>,
        document.body
    );
}

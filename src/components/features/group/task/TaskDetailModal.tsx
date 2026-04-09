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
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import "react-day-picker/dist/style.css";
import type { components } from "@/api/types";
import { mapRole } from "@/components/features/group/group.api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    estimatedHours?: number | null;
    actualHours?: number | null;
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
    role?: string | null;
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
    estimatedHours?: number | null;
    actualHours?: number | null;
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

type MentionUser = {
    id: string;
    name: string;
    subtitle?: string;
    avatarUrl?: string | null;
    isAll?: boolean;
};

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

function renderAllMentions(segment: string, mentionAllAliases: string[] = []) {
    const aliases = mentionAllAliases.map((alias) => alias.trim()).filter(Boolean);
    if (aliases.length === 0) return segment;

    const re = new RegExp(`@(${aliases.map(escapeRegExp).join("|")})\\b`, "gi");
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

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compressAllMentionsForDisplay(text: string, membersById: Record<string, string>, authorId?: string) {
    const allMemberIds = Object.keys(membersById)
        .map((id) => String(id).trim())
        .filter(Boolean);

    if (allMemberIds.length === 0) return text;

    const normalizedAuthorId = normalizeUserId(authorId);
    const expectedAllIds = allMemberIds.filter((id) => normalizeUserId(id) !== normalizedAuthorId);

    if (expectedAllIds.length < 2) return text;

    const escaped = expectedAllIds.map((id) => `@${escapeRegExp(id)}`);

    const patterns: string[] = [];

    const permutations = (arr: string[]): string[][] => {
        if (arr.length <= 1) return [arr];
        const result: string[][] = [];
        for (let i = 0; i < arr.length; i++) {
            const current = arr[i];
            const rest = arr.slice(0, i).concat(arr.slice(i + 1));
            for (const tail of permutations(rest)) {
                result.push([current, ...tail]);
            }
        }
        return result;
    };

    if (escaped.length <= 6) {
        for (const perm of permutations(escaped)) {
            patterns.push(perm.join("\\s+"));
        }
    } else {
        patterns.push(escaped.join("\\s+"));
    }

    let output = text;

    for (const pattern of patterns) {
        const re = new RegExp(`(^|\\s)(${pattern})(?=\\s|$)`, "g");
        output = output.replace(re, (_match, prefix) => `${prefix}@__all__`);
    }

    return output;
}

function normalizeUserId(value?: string | null) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function expandMentionAll(payloadText: string, membersById: Record<string, string>, excludedIds: string[] = []) {
    if (!payloadText.includes("@__all__")) return payloadText;

    const excludedSet = new Set(excludedIds.map((id) => normalizeUserId(id)).filter(Boolean));

    const memberIds = Object.keys(membersById).filter((id) => {
        const normalizedId = normalizeUserId(id);
        return normalizedId && !excludedSet.has(normalizedId);
    });

    if (memberIds.length === 0) {
        return payloadText
            .replace(/@__all__\b/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    const mentions = memberIds.map((id) => `@${id}`).join(" ");

    return payloadText
        .replace(/@__all__\b/g, mentions)
        .replace(/\s{2,}/g, " ")
        .trim();
}

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
    locale: string;
    i18n: DatePickerTranslations;
};

type DatePickerTranslations = {
    selectDate: string;
    today: string;
    tomorrow: string;
    nextWeek: string;
    noDate: string;
    months: string[];
};

const TASK_TITLE_MAX_LENGTH = 30;
const TASK_DESCRIPTION_MAX_LENGTH = 200;
const TASK_COMMENT_MAX_LENGTH = 200;
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
    authorId,
    mentionAllLabel
}: {
    text: string;
    membersById: Record<string, string>;
    authorId: string;
    mentionAllLabel: string;
}) {
    const t = useTranslations("TaskDetailModal");
    const unknownMentionLabel = t("unknownMentionUser");
    const displayText = React.useMemo(
        () => compressAllMentionsForDisplay(text, membersById, authorId),
        [text, membersById, authorId]
    );

    const normalizedDisplayText = React.useMemo(() => {
        const aliases = ["all", "mọi người", mentionAllLabel]
            .map((alias) => alias.trim())
            .filter(Boolean);

        let output = displayText;
        for (const alias of aliases) {
            output = output.replace(new RegExp(`@${escapeRegExp(alias)}\\b`, "gi"), "@__all__");
        }

        return output;
    }, [displayText, mentionAllLabel]);

    const re = /@(__all__|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
    const parts: React.ReactNode[] = [];
    let last = 0;

    for (const m of normalizedDisplayText.matchAll(re)) {
        const idx = m.index ?? 0;
        const whole = m[0];
        const id = (m[1] || "").trim();

        if (idx > last) parts.push(normalizedDisplayText.slice(last, idx));

        if (id === "__all__") {
            parts.push(
                <span key={`${id}-${idx}`} className="font-semibold text-blue-600 hover:text-blue-700">
                    @{mentionAllLabel}
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
                parts.push(
                    <span key={`${id}-${idx}`} className="font-semibold text-blue-600 hover:text-blue-700">
                        @{unknownMentionLabel}
                    </span>
                );
            }
        }

        last = idx + whole.length;
    }

    if (last < normalizedDisplayText.length) parts.push(normalizedDisplayText.slice(last));
    return <>{parts}</>;
}

function limitLineBreaks(text: string, maxBreaks = 2) {
    let breaks = 0;
    let result = "";

    for (const ch of text) {
        if (ch === "\n") {
            if (breaks >= maxBreaks) continue;
            breaks += 1;
        }
        result += ch;
    }

    return result;
}

const MentionTextarea = React.forwardRef<
    MentionTextareaHandle,
    {
        value: string;
        onChange: (next: string) => void;
        members: MentionUser[];
        meId: string;
        noResultsText?: string;
        mentionAllLabel: string;
        mentionAllSubtitle: string;
        placeholder?: string;
        className?: string;
        maxChars?: number;
        onSubmit?: () => void;
        disabled?: boolean;
    }
>(function MentionTextareaInner(
    {
        value,
        onChange,
        members,
        meId,
        noResultsText,
        mentionAllLabel,
        mentionAllSubtitle,
        placeholder,
        className,
        maxChars = 500,
        onSubmit,
        disabled = false
    },
    ref
) {
    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    const popupRef = React.useRef<HTMLDivElement | null>(null);

    const [mounted, setMounted] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [query, setQuery] = React.useState("");
    const [anchor, setAnchor] = React.useState<{ start: number; end: number } | null>(null);
    const [popupPosition, setPopupPosition] = React.useState<{ top: number; left: number; width: number } | null>(null);

    const mentionsRef = React.useRef<{ id: string; name: string; start: number; end: number }[]>([]);
    const [inputHeight, setInputHeight] = React.useState(24);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const resizeTextarea = React.useCallback(() => {
        const el = taRef.current;
        if (!el) return;

        el.style.height = "24px";
        const nextHeight = Math.max(24, el.scrollHeight);
        el.style.height = `${nextHeight}px`;
        setInputHeight(nextHeight);
    }, []);

    const updatePopupPosition = React.useCallback(() => {
        const el = taRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const width = Math.min(420, Math.max(280, rect.width));
        const viewportPadding = 12;

        let left = rect.left;
        if (left + width > window.innerWidth - viewportPadding) {
            left = window.innerWidth - width - viewportPadding;
        }
        if (left < viewportPadding) left = viewportPadding;

        const estimatedHeight = 320;
        const showAbove = rect.top > estimatedHeight + 16;

        setPopupPosition({
            left,
            width,
            top: showAbove ? rect.top - 8 : rect.bottom + 8
        });
    }, []);

    React.useLayoutEffect(() => {
        resizeTextarea();
    }, [value, resizeTextarea]);

    React.useEffect(() => {
        if (!(open && mounted)) return;

        updatePopupPosition();

        const handleReposition = () => updatePopupPosition();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (taRef.current?.contains(target)) return;
            if (popupRef.current?.contains(target)) return;
            setOpen(false);
        };

        window.addEventListener("resize", handleReposition);
        window.addEventListener("scroll", handleReposition, true);
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            window.removeEventListener("resize", handleReposition);
            window.removeEventListener("scroll", handleReposition, true);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, mounted, updatePopupPosition]);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();

        const allOption: MentionUser = {
            id: "__all__",
            name: mentionAllLabel,
            subtitle: mentionAllSubtitle,
            isAll: true
        };

        const baseUsers = members.filter((u) => normalizeUserId(u.id) !== normalizeUserId(meId));
        const mentionAllEnabled = baseUsers.length > 0;
        const full = mentionAllEnabled ? [...baseUsers, allOption] : baseUsers;

        if (!q) return full.slice(0, 8);

        return full
            .filter((u) => {
                const haystack = `${u.name} ${u.subtitle ?? ""}`.toLowerCase();
                return haystack.includes(q);
            })
            .slice(0, 8);
    }, [members, meId, mentionAllLabel, mentionAllSubtitle, query]);

    const mentionAllEnabled = React.useMemo(
        () => members.some((u) => normalizeUserId(u.id) !== normalizeUserId(meId)),
        [members, meId]
    );

    const detectFromText = React.useCallback(
        (text: string, caret: number) => {
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

                requestAnimationFrame(() => {
                    updatePopupPosition();
                });
                return;
            }

            setOpen(false);
            setAnchor(null);
            setQuery("");
        },
        [updatePopupPosition]
    );

    const insertMention = (user: MentionUser) => {
        const el = taRef.current;
        if (!(el && anchor) || disabled) return;

        const before = value.slice(0, anchor.start);
        const after = value.slice(anchor.end);

        const visibleName = user.isAll ? mentionAllLabel : user.name;
        const tokenVisible = `@${visibleName}`;
        const tokenInsert = `${tokenVisible} `;
        const next = before + tokenInsert + after;

        if (next.length > maxChars) return;

        onChange(next);

        const start = before.length;
        const end = start + tokenVisible.length;

        mentionsRef.current = mentionsRef.current.filter((m) => !(m.start < end && m.end > start));

        if (!user.isAll) {
            mentionsRef.current.push({ id: user.id, name: visibleName, start, end });
        }

        setOpen(false);
        setAnchor(null);
        setQuery("");

        requestAnimationFrame(() => {
            const pos = start + tokenInsert.length;
            el.focus();
            el.setSelectionRange(pos, pos);
            resizeTextarea();
        });
    };

    const onTextChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
        if (disabled) return;

        let next = e.target.value;
        next = limitLineBreaks(next, 2);

        const caret = e.target.selectionStart ?? next.length;

        if (next.length > maxChars) {
            requestAnimationFrame(() => {
                if (taRef.current) {
                    taRef.current.value = value;
                    const pos = Math.min(value.length, Math.max(0, caret - 1));
                    taRef.current.setSelectionRange(pos, pos);
                    resizeTextarea();
                }
            });
            return;
        }

        onChange(next);

        mentionsRef.current = mentionsRef.current.filter((m) => next.slice(m.start, m.end) === `@${m.name}`);
        detectFromText(next, caret);

        requestAnimationFrame(() => {
            resizeTextarea();
            if (open) updatePopupPosition();
        });
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

            if (e.key === "Enter" && !e.shiftKey) {
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

        if (e.key === "Enter" && e.shiftKey) {
            const lineBreakCount = (value.match(/\n/g) ?? []).length;
            if (lineBreakCount >= 2) {
                e.preventDefault();
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.();
            return;
        }

        requestAnimationFrame(resizeTextarea);
    };

    const getPayloadText = React.useCallback(() => {
        let text = value;

        const ms = [...mentionsRef.current]
            .filter((m) => text.slice(m.start, m.end) === `@${m.name}`)
            .sort((a, b) => b.start - a.start);

        for (const m of ms) {
            text = text.slice(0, m.start) + `@${m.id}` + text.slice(m.end);
        }

        const mentionAllAliases = mentionAllEnabled
            ? [mentionAllLabel, "all"].map((alias) => alias.trim()).filter(Boolean)
            : [];

        for (const alias of mentionAllAliases) {
            const aliasRegex = new RegExp(`@${escapeRegExp(alias)}\\b`, "gi");
            text = text.replace(aliasRegex, "@__all__");
        }

        return text;
    }, [mentionAllEnabled, mentionAllLabel, value]);

    React.useImperativeHandle(ref, () => ({ getPayloadText }), [getPayloadText]);

    const mentionAllAliases = React.useMemo(
        () => (mentionAllEnabled ? [mentionAllLabel, "all"].map((alias) => alias.trim()).filter(Boolean) : []),
        [mentionAllEnabled, mentionAllLabel]
    );

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
                const segNodes = renderAllMentions(seg, mentionAllAliases);
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
            const tail = renderAllMentions(text.slice(last), mentionAllAliases);
            if (Array.isArray(tail)) nodes.push(...tail);
            else nodes.push(tail);
        }

        return nodes.length ? nodes : text;
    }, [mentionAllAliases, value]);

    const popup =
        mounted && open && !disabled && popupPosition
            ? createPortal(
                <div
                    ref={popupRef}
                    className="fixed z-[22000] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
                    style={{
                        left: popupPosition.left,
                        top: popupPosition.top,
                        width: popupPosition.width,
                        maxHeight: 320,
                        transform:
                            popupPosition.top < (taRef.current?.getBoundingClientRect().top ?? 0)
                                ? "translateY(-100%)"
                                : undefined
                    }}>
                    {filtered.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto py-2">
                            {filtered.map((u, idx) => {
                                const isActive = idx === activeIndex;
                                const displayName = u.isAll ? mentionAllLabel : u.name;
                                const subtitle = u.subtitle || (u.isAll ? mentionAllSubtitle : "");

                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onMouseDown={(ev) => {
                                            ev.preventDefault();
                                            insertMention(u);
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                                            isActive ? "bg-[#E7F3FF]" : "hover:bg-zinc-100"
                                        )}>
                                        <div className="shrink-0">
                                            {u.isAll ? (
                                                <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-900">
                                                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                                                        <path d="M16 11c1.66 0 2.99-1.57 2.99-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5zm-8 0c1.66 0 2.99-1.57 2.99-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                                                    </svg>
                                                </div>
                                            ) : u.avatarUrl ? (
                                                <Image
                                                    src={u.avatarUrl}
                                                    alt={displayName}
                                                    width={40}
                                                    height={40}
                                                    unoptimized
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700">
                                                    {safeInitialsFromName(displayName)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[17px] font-medium leading-5 text-zinc-900">
                                                {displayName}
                                            </div>
                                            {subtitle ? (
                                                <div className="truncate pt-0.5 text-[15px] leading-5 text-zinc-500">
                                                    {subtitle}
                                                </div>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-sm text-zinc-500">
                            {noResultsText ?? "No members to mention."}
                        </div>
                    )}
                </div>,
                document.body
            )
            : null;

    return (
        <>
            <div className="relative w-full min-w-0 max-w-full overflow-visible">
                <div className="relative" style={{ minHeight: 24, height: inputHeight }}>
                    <div
                        aria-hidden
                        className={cn(
                            "pointer-events-none absolute inset-0 z-0 max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-zinc-900",
                            disabled && "opacity-60"
                        )}
                        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
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
                        maxLength={maxChars}
                        className={cn(
                            "relative z-10 block w-full max-w-full resize-none overflow-hidden bg-transparent text-sm leading-6 text-transparent caret-zinc-900 outline-none selection:bg-blue-200",
                            "min-h-[24px]",
                            "disabled:cursor-not-allowed disabled:caret-transparent",
                            className
                        )}
                        style={{ height: inputHeight, overflowWrap: "anywhere", wordBreak: "break-word" }}
                    />
                </div>
            </div>

            {popup}
        </>
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

function shouldUseFallbackErrorMessage(message: string) {
    const normalized = message.trim().toLowerCase();

    return (
        normalized === "thiếu next_public_api_base_url." ||
        normalized === "missing next_public_api_base_url." ||
        normalized === "không tìm thấy task trong group" ||
        normalized === "task not found in group" ||
        normalized === "đã xảy ra lỗi" ||
        normalized === "an error occurred"
    );
}

function getErrorMessage(e: unknown, fallback: string) {
    if (e instanceof Error) {
        const message = e.message.trim();
        if (!(message && !shouldUseFallbackErrorMessage(message))) return fallback;
        return message;
    }
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
    return t || "";
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

function relativeTimeOf(input: string | null | undefined, locale: string) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = d.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const normalizedLocale = locale.includes("-") ? locale : locale === "vi" ? "vi" : "en";
    const rtf = new Intl.RelativeTimeFormat(normalizedLocale, { numeric: "auto" });
    if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
    if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
    return rtf.format(Math.round(diffMs / day), "day");
}

function priorityTone(value?: number | null) {
    if (value === 2) return "text-rose-600";
    if (value === 1) return "text-yellow-500";
    if (value === 0) return "text-emerald-700";
    return "text-zinc-700";
}

function severityTone(value?: number | null) {
    if (value === 3) return "text-red-600";
    if (value === 2) return "text-orange-600";
    if (value === 1) return "text-yellow-500";
    if (value === 0) return "text-sky-600";
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

function formatDateDisplay(
    value: string | undefined,
    locale: string,
    i18n: Pick<DatePickerTranslations, "selectDate" | "today" | "tomorrow">
) {
    const date = parseDateString(value);
    if (!date) return i18n.selectDate;
    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return i18n.today;
    if (diffDays === 1) return i18n.tomorrow;

    const normalizedLocale = locale.includes("-") ? locale : locale === "vi" ? "vi-VN" : "en-US";

    return new Intl.DateTimeFormat(normalizedLocale, {
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

function TrelloDatePicker({ label, value, onChange, min, disabled = false, locale, i18n }: TrelloDatePickerProps) {
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
                        <div className="flex-1">
                            <Select value={String(month.getMonth())} onValueChange={handleMonthChange}>
                                <SelectTrigger className="h-11 w-full text-sm font-semibold">
                                    <SelectValue placeholder={i18n.months[month.getMonth()]} />
                                </SelectTrigger>
                                <SelectContent>
                                    {i18n.months.map((monthLabel, monthIndex) => (
                                        <SelectItem key={monthLabel} value={String(monthIndex)}>
                                            {monthLabel}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[140px]">
                            <Select value={String(month.getFullYear())} onValueChange={handleYearChange}>
                                <SelectTrigger className="h-11 w-full text-sm font-semibold">
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
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="text-base font-bold text-zinc-900">
                                {i18n.months[month.getMonth()]} {month.getFullYear()}
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
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                            {i18n.today}
                        </button>

                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 1))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                            {i18n.tomorrow}
                        </button>

                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 7))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                            {i18n.nextWeek}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50">
                            {i18n.noDate}
                        </button>
                    </div>
                </div>,
                portalTarget
            )
            : null;

    return (
        <>
            <div className="relative">
                <div className="text-sm font-semibold text-zinc-600">{label}</div>

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
                            {formatDateDisplay(value, locale, i18n)}
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
        estimatedHours: task?.estimatedHours ?? null,
        actualHours: task?.actualHours ?? null,
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

function isRestrictedMemberRole(memberRole?: string | null | number): boolean {
    if (!memberRole) return false;
    const roleStr = String(memberRole).trim().toLowerCase();
    return roleStr === "3" || roleStr === "4" || roleStr === "commenter" || roleStr === "viewer";
}

async function apiUpdateTask(args: {
    groupId: string;
    taskId: string;
    payload: components["schemas"]["UpdateTaskRequest"];
}) {
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
    labels: {
        moreActions: string;
        reply: string;
        deleting: string;
        delete: string;
    };
    size?: "sm" | "md";
};

function CommentActions({
    onReply,
    onDelete,
    canShowMenu,
    canDelete,
    deleting,
    labels,
    size = "sm"
}: CommentActionProps) {
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
                        aria-label={labels.moreActions}>
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
                        {labels.reply}
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
                            {deleting ? labels.deleting : labels.delete}
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
    groupIdOverride?: string | null;
    onDelete?: (taskId: string) => void;
    onSaved?: () => Promise<void> | void;
}) {
    const { open, onClose, taskId, groupIdOverride, onSaved } = props;
    const t = useTranslations("TaskDetailModal");
    const locale = useLocale();
    const mentionAllLabel = t("mentionAll.label");
    const mentionAllSubtitle = t("mentionAll.subtitle");
    const params = useParams<Record<string, string | string[] | undefined>>();
    const groupId = React.useMemo(
        () => String(groupIdOverride ?? "").trim() || getGroupIdFromParams(params ?? {}),
        [groupIdOverride, params]
    );
    const commentMentionRef = React.useRef<MentionTextareaHandle | null>(null);
    const [mounted, setMounted] = React.useState(false);

    const datePickerI18n = React.useMemo<DatePickerTranslations>(
        () => ({
            selectDate: t("datePicker.selectDate"),
            today: t("datePicker.today"),
            tomorrow: t("datePicker.tomorrow"),
            nextWeek: t("datePicker.nextWeek"),
            noDate: t("datePicker.noDate"),
            months: [
                t("datePicker.month1"),
                t("datePicker.month2"),
                t("datePicker.month3"),
                t("datePicker.month4"),
                t("datePicker.month5"),
                t("datePicker.month6"),
                t("datePicker.month7"),
                t("datePicker.month8"),
                t("datePicker.month9"),
                t("datePicker.month10"),
                t("datePicker.month11"),
                t("datePicker.month12")
            ]
        }),
        [t]
    );

    const priorityLabelByValue = React.useCallback(
        (value: number) => {
            if (value === 2) return t("priorityHigh");
            if (value === 1) return t("priorityMedium");
            return t("priorityLow");
        },
        [t]
    );

    const severityLabelByValue = React.useCallback(
        (value: number) => {
            if (value === 3) return t("severityCritical");
            if (value === 2) return t("severityMajor");
            if (value === 1) return t("severityModerate");
            return t("severityMinor");
        },
        [t]
    );

    const progressLabelByValue = React.useCallback(
        (value: number) => {
            if (value === 0) return t("progressToDo");
            if (value < 50) return t("progressStarted");
            if (value < 75) return t("progressInProgress");
            if (value < 100) return t("progressReview");
            return t("progressDone");
        },
        [t]
    );

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
    const [estimatedHours, setEstimatedHours] = React.useState<number | undefined>(undefined);
    const [actualHours, setActualHours] = React.useState<number | undefined>(undefined);
    const [estimatedHoursError, setEstimatedHoursError] = React.useState<string | null>(null);
    const [actualHoursError, setActualHoursError] = React.useState<string | null>(null);
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
            return normalizeUserId(commentUserId) === normalizeUserId(myUserId);
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
                        const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email || t("user");
                        return id ? [id, name] : null;
                    })
                    .filter(Boolean) as [string, string][]
            ),
        [members]
    );

    const mentionUsers = React.useMemo<MentionUser[]>(
        () =>
            members.map((m) => {
                const id = String(m.userId ?? "").trim();
                const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email || t("user");

                return {
                    id,
                    name,
                    subtitle: m.email ?? "",
                    avatarUrl: safeAvatarUrl(m.avatarUrl)
                };
            }),
        [members]
    );

    // Calculate max hours allowed based on startDate and dueDate
    const maxHours = React.useMemo((): number | null => {
        if (!startDate || !dueDate) return null;

        const startDay = Date.UTC(
            new Date(startDate).getFullYear(),
            new Date(startDate).getMonth(),
            new Date(startDate).getDate()
        );
        const endDay = Date.UTC(
            new Date(dueDate).getFullYear(),
            new Date(dueDate).getMonth(),
            new Date(dueDate).getDate()
        );

        const diffDays = (endDay - startDay) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) return null;

        return (diffDays + 1) * 24;
    }, [startDate, dueDate]);

    // Validate and clamp estimated hours
    const handleEstimatedHoursChange = (rawVal: string) => {
        const val = rawVal;
        const num = parseFloat(val);
        const parsed = val === "" ? undefined : isNaN(num) || num < 0 ? 0 : num;

        if (parsed != null && maxHours != null && parsed > maxHours) {
            setEstimatedHoursError(t("estimatedHoursExceed", { max: maxHours }));
            setEstimatedHours(maxHours);
        } else {
            setEstimatedHoursError(null);
            setEstimatedHours(parsed);
        }
    };

    // Validate and clamp actual hours
    const handleActualHoursChange = (rawVal: string) => {
        const val = rawVal;
        const num = parseFloat(val);
        const parsed = val === "" ? undefined : isNaN(num) || num < 0 ? 0 : num;

        if (parsed != null && maxHours != null && parsed > maxHours) {
            setActualHoursError(t("actualHoursExceed", { max: maxHours }));
            setActualHours(maxHours);
        } else {
            setActualHoursError(null);
            setActualHours(parsed);
        }
    };

    // Re-validate hours when dates change
    React.useEffect(() => {
        if (estimatedHours != null && maxHours != null && estimatedHours > maxHours) {
            setEstimatedHoursError(t("estimatedHoursExceed", { max: maxHours }));
            setEstimatedHours(maxHours);
        } else {
            setEstimatedHoursError(null);
        }

        if (actualHours != null && maxHours != null && actualHours > maxHours) {
            setActualHoursError(t("actualHoursExceed", { max: maxHours }));
            setActualHours(maxHours);
        } else {
            setActualHoursError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxHours]);

    const handleSendComment = async () => {
        if (!canComment || isViewOnly || !myUserId) return;

        const visibleText = commentDraft.trim();
        if (!(visibleText && taskId)) return;

        if (visibleText.length > TASK_COMMENT_MAX_LENGTH) {
            setSendCommentError(t("errors.commentMax", { max: TASK_COMMENT_MAX_LENGTH }));
            return;
        }

        const payloadText = commentMentionRef.current?.getPayloadText() ?? visibleText;
        const rawPayload = expandMentionAll(payloadText, membersById, [myUserId]);

        try {
            setSendingComment(true);
            setSendCommentError(null);

            if (replyingTo?.commentId) {
                await apiReplyTaskComment(taskId, replyingTo.commentId, rawPayload);
            } else {
                await apiSendTaskComment(taskId, rawPayload);
            }

            await reloadComments();
            setCommentDraft("");
            setReplyingTo(null);
        } catch (e: unknown) {
            setSendCommentError(getErrorMessage(e, t("errors.sendCommentFailed")));
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
            setSendCommentError(getErrorMessage(e, t("errors.deleteCommentFailed")));
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
            setDetailError(getErrorMessage(e, t("errors.loadTaskDetailFailed")));
        } finally {
            if (isAliveRef.current) setIsRefreshingDetail(false);
        }
    }, [open, taskId, groupId, t]);

    React.useEffect(() => {
        if (!(open && taskId)) return;
        let alive = true;

        (async () => {
            setLoadingDetail(true);
            setDetailError(null);

            try {
                if (!groupId) throw new Error(t("errors.missingGroupIdFromRoute"));
                const result = await apiGetTaskDetailFromGroup(groupId, taskId);
                if (!alive) return;
                setTask(result.task);
                setStatusOptions(result.statusOptions);
                setCurrentUserRole(result.userRole);
            } catch (e: unknown) {
                if (!alive) return;
                setDetailError(getErrorMessage(e, t("errors.loadTaskDetailFailed")));
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
    }, [open, taskId, groupId, t]);

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
                setCommentError(getErrorMessage(e, t("errors.loadCommentsFailed")));
                setComments([]);
            } finally {
                if (alive) setLoadingComments(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, taskId, t]);

    React.useEffect(() => {
        if (!(open && groupId)) return;
        let alive = true;

        (async () => {
            setMembersError(null);

            try {
                const resp = await apiGetGroupMembers(groupId);
                const list = resp?.data?.members ?? [];
                if (!alive) return;

                // Filter out members with restricted roles (commenter, viewer)
                const filteredList = (list ?? [])
                    .filter((m) => !!String(m?.userId ?? "").trim())
                    .filter((m) => !isRestrictedMemberRole(m?.role));

                setMembers(filteredList);
            } catch (e: unknown) {
                if (!alive) return;
                setMembersError(getErrorMessage(e, t("errors.loadMembersFailed")));
                setMembers([]);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, groupId, t]);

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
        setEstimatedHours(task?.estimatedHours ?? undefined);
        setActualHours(task?.actualHours ?? undefined);
        setEstimatedHoursError(null);
        setActualHoursError(null);
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
                    label: name || m.email || t("unnamed"),
                    avatarUrl: safeAvatarUrl(m.avatarUrl)
                };
            }),
        [members, t]
    );

    const selectedAssignee = React.useMemo(
        () => assigneeOptions.find((m) => m.userId === assigneeId) ?? null,
        [assigneeOptions, assigneeId]
    );

    const selectedAssigneeDisplay = React.useMemo(() => {
        if (selectedAssignee) return selectedAssignee;

        if (!assigneeId) {
            return { userId: "", label: t("unassigned"), avatarUrl: "" };
        }

        if (task?.assigneeId && task.assigneeName) {
            return {
                userId: task.assigneeId,
                label: task.assigneeName,
                avatarUrl: safeAvatarUrl(task.assigneeAvatarUrl)
            };
        }

        return { userId: "", label: t("unassigned"), avatarUrl: "" };
    }, [assigneeId, selectedAssignee, task?.assigneeAvatarUrl, task?.assigneeId, task?.assigneeName, t]);

    const selectedStatusName = React.useMemo(() => {
        const hit = statusOptions.find((s) => s.statusId === statusId);
        return hit?.statusName ?? task?.statusName ?? t("noStatus");
    }, [statusId, statusOptions, task?.statusName, t]);

    const selectedPriorityValue = React.useMemo(() => normalizePriorityValue(Number(priority)), [priority]);
    const selectedPriorityLabel = React.useMemo(
        () => priorityLabelByValue(selectedPriorityValue),
        [selectedPriorityValue, priorityLabelByValue]
    );

    const selectedSeverityValue = React.useMemo(() => normalizeSeverityValue(Number(severity)), [severity]);
    const selectedSeverityLabel = React.useMemo(
        () => severityLabelByValue(selectedSeverityValue),
        [selectedSeverityValue, severityLabelByValue]
    );

    const selectedProgressValue = React.useMemo(() => {
        if (progress === "") return 0;
        return normalizeProgressValue(Number(progress));
    }, [progress]);

    const selectedProgressLabel = React.useMemo(
        () => progressLabelByValue(selectedProgressValue),
        [selectedProgressValue, progressLabelByValue]
    );
    const descriptionLength = description.length;
    const commentLength = commentDraft.length;

    const handleSave = async () => {
        if (!canEditTask || isViewOnly) return;

        setSaveError(null);

        const taskNameTrimmed = taskName.trim().slice(0, TASK_TITLE_MAX_LENGTH);
        const descriptionTrimmed = description.trim().slice(0, TASK_DESCRIPTION_MAX_LENGTH);

        if (!taskNameTrimmed) {
            setSaveError(t("errors.taskNameRequired"));
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setSaveError(t("errors.startDateAfterDueDate"));
            return;
        }

        // Check if assignee has restricted role
        if (assigneeId) {
            const selectedMember = members.find((m) => String(m?.userId ?? "") === assigneeId);
            if (selectedMember && isRestrictedMemberRole(selectedMember.role)) {
                setSaveError(t("errors.restrictedAssignee"));
                return;
            }
        }

        if (groupId == null || taskId == null) {
            setSaveError(t("errors.missingGroupOrTask"));
            return;
        }

        if (estimatedHoursError || actualHoursError) {
            setSaveError(estimatedHoursError ?? actualHoursError ?? "");
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
                    progress: normalizedProgressValue,
                    estimatedHours: estimatedHours ?? null,
                    actualHours: actualHours ?? null
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
                    progressLabel: progressLabelByValue(normalizedProgressValue),
                    startDateRaw: startDate ? toApiDateTimeOrNull(startDate) : null,
                    dueDateRaw: dueDate ? toApiDateTimeOrNull(dueDate) : null,
                    startDateFmt: startDate ? formatDisplayDate(startDate) : "",
                    dueDateFmt: dueDate ? formatDisplayDate(dueDate) : "",
                    estimatedHours: estimatedHours ?? null,
                    actualHours: actualHours ?? null,
                    description: descriptionTrimmed || null
                };
            });

            setDescription(descriptionTrimmed);
            setProgress(String(normalizedProgressValue));
            setIsEditing(false);

            void Promise.allSettled([refreshTaskDetailSilently(), Promise.resolve(onSaved?.())]);
        } catch (e: unknown) {
            setSaveError(getErrorMessage(e, t("errors.updateTaskFailed")));
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
                <div className="flex items-start justify-between border-b border-zinc-200 px-7 py-5">
                    <div className="min-w-0 flex-1">
                        {loadingDetail ? (
                            <h2 className="min-w-0 truncate text-[26px] font-extrabold leading-none text-zinc-900">
                                {t("loading")}
                            </h2>
                        ) : isEditing ? (
                            <div className="max-w-[560px]">
                                <input
                                    value={taskName}
                                    maxLength={TASK_TITLE_MAX_LENGTH}
                                    onChange={(e) => setTaskName(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH))}
                                    placeholder={t("taskName")}
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[24px] font-extrabold leading-none text-zinc-900 outline-none"
                                />
                                <div className="mt-2 text-right text-xs font-medium text-zinc-500">
                                    {taskName.length}/{TASK_TITLE_MAX_LENGTH}
                                </div>
                            </div>
                        ) : (
                            <div className="flex min-w-0 items-center gap-3">
                                <h2 className="min-w-0 break-words text-[26px] font-extrabold leading-none text-zinc-900">
                                    {taskName || t("taskFallback")}
                                </h2>

                                {isRefreshingDetail ? (
                                    <div className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-500">
                                        {t("syncing")}
                                    </div>
                                ) : null}
                            </div>
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

                <div className="flex-1 overflow-hidden px-7 py-5">
                    <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
                        <div className="min-w-0 overflow-y-auto pr-1">
                            {detailError ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                    {detailError}
                                </div>
                            ) : null}

                            {loadingDetail ? (
                                <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("loading")}
                                </div>
                            ) : null}

                            {membersError ? (
                                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                    {membersError}
                                </div>
                            ) : null}

                            {saveError ? (
                                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                    {saveError}
                                </div>
                            ) : null}

                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-lg font-bold text-zinc-900">{t("taskInformation")}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {canEditTask ? (
                                        !isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                disabled={loadingDetail || !!detailError || !task}
                                                className="h-10 rounded-xl bg-[#f54a00] px-5 text-sm font-semibold text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                                                {t("edit")}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleSave();
                                                }}
                                                disabled={submitting}
                                                className="h-10 rounded-xl bg-[#f54a00] px-5 text-sm font-semibold text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                                                {submitting ? t("saving") : t("saveChange")}
                                            </button>
                                        )
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                                <div>
                                    <div className="text-sm font-semibold text-zinc-600">{t("assignee")}</div>
                                    <Select
                                        value={assigneeId || "unassigned"}
                                        onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
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
                                                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
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
                                                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                                                        U
                                                    </div>
                                                    <span>{t("unassigned")}</span>
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
                                                            <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
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
                                    <div className="text-sm font-semibold text-zinc-600">{t("status")}</div>
                                    <Select
                                        value={statusId}
                                        onValueChange={setStatusId}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                                            <span className="truncate">{selectedStatusName}</span>
                                        </SelectTrigger>

                                        <SelectContent
                                            position="popper"
                                            side="bottom"
                                            align="start"
                                            sideOffset={8}
                                            avoidCollisions
                                            className="z-[10010] min-w-[216px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
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
                                    <div className="text-sm font-semibold text-zinc-600">{t("priority")}</div>
                                    <Select
                                        value={String(selectedPriorityValue)}
                                        onValueChange={setPriority}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-2",
                                                    priorityTone(selectedPriorityValue)
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
                                                {t("priorityLow")}
                                            </SelectItem>
                                            <SelectItem value="1" className={selectItemClassName}>
                                                {t("priorityMedium")}
                                            </SelectItem>
                                            <SelectItem value="2" className={selectItemClassName}>
                                                {t("priorityHigh")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-zinc-600">{t("severity")}</div>
                                    <Select
                                        value={String(selectedSeverityValue)}
                                        onValueChange={setSeverity}
                                        disabled={!isEditing}>
                                        <SelectTrigger className="mt-2 flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-2",
                                                    severityTone(selectedSeverityValue)
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
                                                {t("severityMinor")}
                                            </SelectItem>
                                            <SelectItem value="1" className={selectItemClassName}>
                                                {t("severityModerate")}
                                            </SelectItem>
                                            <SelectItem value="2" className={selectItemClassName}>
                                                {t("severityMajor")}
                                            </SelectItem>
                                            <SelectItem value="3" className={selectItemClassName}>
                                                {t("severityCritical")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <TrelloDatePicker
                                    label={t("startDate")}
                                    value={startDate}
                                    onChange={setStartDate}
                                    disabled={!isEditing}
                                    locale={locale}
                                    i18n={datePickerI18n}
                                />
                                <TrelloDatePicker
                                    label={t("dueDate")}
                                    value={dueDate}
                                    onChange={setDueDate}
                                    min={startDate || undefined}
                                    disabled={!isEditing}
                                    locale={locale}
                                    i18n={datePickerI18n}
                                />

                                <div>
                                    <div className="text-sm font-semibold text-zinc-600">{t("estimatedHours")}</div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={estimatedHours ?? ""}
                                        onChange={(e) => handleEstimatedHoursChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "-" || e.key === "e" || e.key === "E") {
                                                e.preventDefault();
                                            }
                                        }}
                                        disabled={!isEditing}
                                        placeholder="0"
                                        className="mt-2 flex h-10 w-full items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    {estimatedHoursError ? (
                                        <div className="mt-1 text-xs font-medium text-rose-600">{estimatedHoursError}</div>
                                    ) : null}
                                </div>

                                <div>
                                    <div className="text-sm font-semibold text-zinc-600">{t("actualHours")}</div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={actualHours ?? ""}
                                        onChange={(e) => handleActualHoursChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "-" || e.key === "e" || e.key === "E") {
                                                e.preventDefault();
                                            }
                                        }}
                                        disabled={!isEditing}
                                        placeholder="0"
                                        className="mt-2 flex h-10 w-full items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    {actualHoursError ? (
                                        <div className="mt-1 text-xs font-medium text-rose-600">{actualHoursError}</div>
                                    ) : null}
                                </div>

                                <div className="md:col-span-2 xl:col-span-2">
                                    <div className="text-sm font-semibold text-zinc-600">{t("progress")}</div>

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
                                                    className="h-8 w-14 rounded-lg border border-zinc-200 px-0 text-center text-sm font-semibold leading-none text-zinc-900 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
                                                            "h-9 rounded-xl border text-sm font-semibold transition",
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
                                    <div className="text-sm font-semibold text-zinc-600">{t("description")}</div>
                                    {isEditing ? (
                                        <div
                                            className={cn(
                                                "text-xs font-medium",
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
                                    placeholder={t("noDescription")}
                                    disabled={!isEditing}
                                    maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                                    className="min-h-[110px] w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="min-w-0 overflow-x-hidden overflow-y-auto xl:border-l xl:border-zinc-200 xl:pl-4 xl:pr-0">
                            <div className="sticky top-0 z-10 bg-white pb-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-zinc-700" />
                                    <div className="text-xl font-extrabold text-zinc-900">{t("comments")}</div>
                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                                        {loadingComments ? "…" : comments.length}
                                    </span>
                                </div>

                                {replyingTo ? (
                                    <div className="mt-3 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                                        <div className="min-w-0 text-zinc-700">
                                            {t("replyingTo")}{" "}
                                            <span className="font-semibold">
                                                {fullName(replyingTo.user) || t("user")}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={cancelReply}
                                            className="ml-3 shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                                            {t("cancel")}
                                        </button>
                                    </div>
                                ) : null}

                                {commentError ? (
                                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                        {commentError}
                                    </div>
                                ) : null}

                                {sendCommentError ? (
                                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                        {sendCommentError}
                                    </div>
                                ) : null}
                            </div>

                            <div className="w-full max-w-full space-y-4 overflow-x-hidden pb-4">
                                {loadingComments ? (
                                    <div className="text-sm text-zinc-600">({t("loadingComments")})</div>
                                ) : comments.length === 0 ? (
                                    <div className="text-sm text-zinc-500">({t("noComments")})</div>
                                ) : (
                                    comments.map((c) => {
                                        const u = c.user;
                                        const name =
                                            `${(u?.firstName ?? "").trim()} ${(u?.lastName ?? "").trim()}`.trim() ||
                                            t("user");
                                        const when = c.createdAt ? relativeTimeOf(c.createdAt, locale) : "";
                                        const replies = (c.replies ?? []).filter((r) => !r?.isDeleted);

                                        return (
                                            <div
                                                key={c.commentId ?? `${c.userId ?? "u"}-${c.createdAt ?? "t"}`}
                                                className="w-full max-w-full space-y-3 overflow-x-hidden rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
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
                                                        <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-xs font-extrabold text-white">
                                                            {initials(u)}
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-baseline gap-3">
                                                                    <div className="text-sm font-bold text-zinc-900">
                                                                        {name}
                                                                    </div>
                                                                    <div className="text-xs text-zinc-400">{when}</div>
                                                                </div>

                                                                <div className="mt-1 max-w-full whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm text-zinc-800">
                                                                    <RichTextWithMentions
                                                                        text={String(c.content ?? "")}
                                                                        membersById={membersById}
                                                                        authorId={String(c.userId ?? c.user?.id ?? "")}
                                                                        mentionAllLabel={mentionAllLabel}
                                                                    />
                                                                </div>

                                                                <CommentActions
                                                                    onReply={() => handleReplyComment(c)}
                                                                    onDelete={() => openDeleteConfirm(c)}
                                                                    canShowMenu={canShowCommentMenu()}
                                                                    canDelete={canDeleteComment(c)}
                                                                    deleting={deletingCommentId === c.commentId}
                                                                    labels={{
                                                                        moreActions: t("moreActions"),
                                                                        reply: t("reply"),
                                                                        deleting: t("deleting"),
                                                                        delete: t("delete")
                                                                    }}
                                                                    size="sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {replies.length > 0 ? (
                                                    <div className="mt-4 w-full space-y-4 border-l-2 border-zinc-200 pl-4">
                                                        {replies.map((r) => {
                                                            const ru = r.user;
                                                            const rname =
                                                                `${(ru?.firstName ?? "").trim()} ${(ru?.lastName ?? "").trim()}`.trim() ||
                                                                t("user");
                                                            const rwhen = r.createdAt
                                                                ? relativeTimeOf(r.createdAt, locale)
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
                                                                        <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500 text-[11px] font-extrabold text-white">
                                                                            {initials(ru)}
                                                                        </div>
                                                                    )}

                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                                    <p className="text-sm font-semibold text-zinc-900">
                                                                                        {rname}
                                                                                    </p>
                                                                                    <span className="text-xs text-zinc-400">
                                                                                        • {rwhen}
                                                                                    </span>
                                                                                </div>

                                                                                <p
                                                                                    className="mt-1 max-w-full whitespace-pre-wrap break-words text-sm text-zinc-800"
                                                                                    style={{
                                                                                        overflowWrap: "anywhere",
                                                                                        wordBreak: "break-word"
                                                                                    }}>
                                                                                    <RichTextWithMentions
                                                                                        text={String(r.content ?? "")}
                                                                                        membersById={membersById}
                                                                                        authorId={String(
                                                                                            r.userId ?? r.user?.id ?? ""
                                                                                        )}
                                                                                        mentionAllLabel={
                                                                                            mentionAllLabel
                                                                                        }
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
                                                                                    labels={{
                                                                                        moreActions: t("moreActions"),
                                                                                        reply: t("reply"),
                                                                                        deleting: t("deleting"),
                                                                                        delete: t("delete")
                                                                                    }}
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
                                    <div className="flex w-full items-start gap-3">
                                        {myAvatarUrl ? (
                                            <Image
                                                src={myAvatarUrl}
                                                alt={myFullName || t("me")}
                                                width={36}
                                                height={36}
                                                unoptimized
                                                className="h-9 w-9 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                                                {buildInitials(myFullName || t("me"))}
                                            </div>
                                        )}

                                        <div className="w-full min-w-0 flex-1 overflow-visible rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <MentionTextarea
                                                        ref={commentMentionRef}
                                                        value={commentDraft}
                                                        onChange={(next) => {
                                                            setCommentDraft(next);
                                                            if (sendCommentError) setSendCommentError(null);
                                                        }}
                                                        members={mentionUsers}
                                                        meId={myUserId}
                                                        noResultsText={t("noMembersToMention")}
                                                        mentionAllLabel={mentionAllLabel}
                                                        mentionAllSubtitle={mentionAllSubtitle}
                                                        placeholder={replyingTo ? t("writeReply") : t("writeComment")}
                                                        maxChars={TASK_COMMENT_MAX_LENGTH}
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
                                                    aria-label={t("send")}
                                                    disabled={
                                                        !commentDraft.trim() ||
                                                        sendingComment ||
                                                        !canComment ||
                                                        !myUserId
                                                    }>
                                                    {sendingComment ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <SendHorizontal className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>

                                            <div
                                                className={cn(
                                                    "mt-2 text-right text-xs font-medium",
                                                    commentLength >= TASK_COMMENT_MAX_LENGTH
                                                        ? "text-rose-500"
                                                        : "text-zinc-500"
                                                )}>
                                                {commentLength}/{TASK_COMMENT_MAX_LENGTH}
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
                            <AlertDialogTitle className="text-lg">{t("confirmDeleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm leading-6 text-[#111827]">
                                {t("confirmDeleteDescription")}
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
                                {t("cancel")}
                            </AlertDialogCancel>

                            <AlertDialogAction
                                disabled={!!deletingCommentId}
                                onClick={(e) => {
                                    e.preventDefault();
                                    void handleConfirmDeleteComment();
                                }}
                                className="rounded-xl bg-red-600 px-8 text-white hover:bg-red-700 focus-visible:ring-0">
                                {deletingCommentId ? t("deleting") : t("delete")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>,
        document.body
    );
}

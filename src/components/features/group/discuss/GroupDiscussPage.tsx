"use client";

import * as signalR from "@microsoft/signalr";
import Image from "next/image";
import {
    ChevronDown,
    ChevronUp,
    MessageCircle,
    MoreHorizontal,
    SendHorizontal,
    Trash2
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";
import { apiFetch } from "@/api/api-client";
import { getAccessToken, getUserData } from "@/api/auth";
import { getUserProfile } from "@/api/user-profile";
import type { components } from "@/api/types";
import { Container } from "@/components/common";
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
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { getRoleIcon, roleDisplayText, getRoleColor } from "@/components/features/group/RoleUtils";

type UserLite = {
    id: string;
    name: string;
    initials: string;
    avatarUrl?: string | null;
};

type GroupRole = "owner" | "moderator" | "member" | "commenter" | "viewer";

type GroupMessageDto = components["schemas"]["GroupMessageDto"];
type GroupMessageListResponse = components["schemas"]["GroupMessageListResponse"];
type GroupDetailResponse = components["schemas"]["GroupDetailResponseApiResponse"];
type UserDto = components["schemas"]["UserDto"];

type ReplyItem = {
    id: string;
    author: UserLite;
    content: string;
    createdAtText: string;
};

type PostItem = {
    id: string;
    author: UserLite;
    content: string;
    createdAtText: string;
    replies: ReplyItem[];
};

type HubUserDto = UserDto;

type MessageDeletedPayload = {
    messageId: string;
    groupId: string;
    deletedBy: string;
    replyCount: number;
    timestamp: string;
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
    reset: () => void;
};

type PopupPosition = {
    top: number;
    left: number;
    width: number;
};

type DiscussTranslate = (key: string, values?: Record<string, string | number>) => string;

const MAX_CHARS = 500;

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

function initialsOf(name: string) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
}

function safeInitials(name: string | undefined, meLabel: string) {
    const n = String(name || "").trim();
    if (!n || n === meLabel) return "B";
    return initialsOf(n);
}

function safeInitialsFromName(name?: string | null) {
    const s = String(name ?? "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return `${a}${b}`.toUpperCase() || "U";
}

function safeAvatarUrl(input?: string | null) {
    const raw = String(input ?? "").trim();
    if (!raw) return null;
    return raw.replace("localhost", "127.0.0.1");
}

function normalizeUserId(value?: string | null) {
    return String(value ?? "").trim().toLowerCase();
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compressAllMentionsForDisplay(
    text: string,
    membersById: Record<string, string>,
    authorId?: string
) {
    const allMemberIds = Object.keys(membersById)
        .map((id) => String(id).trim())
        .filter(Boolean);

    if (allMemberIds.length === 0) return text;

    const normalizedAuthorId = normalizeUserId(authorId);
    const expectedAllIds = allMemberIds.filter(
        (id) => normalizeUserId(id) !== normalizedAuthorId
    );

    // Detect all mentions in the text
    const mentionRegex = /@([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
    const mentionedIds = new Set<string>();

    for (const match of text.matchAll(mentionRegex)) {
        mentionedIds.add(normalizeUserId(match[1]));
    }

    const expectedNormalizedIds = new Set(expectedAllIds.map(id => normalizeUserId(id)));

    const isAllMentioned = expectedNormalizedIds.size > 0 &&
        expectedNormalizedIds.size === mentionedIds.size &&
        Array.from(expectedNormalizedIds).every(id => mentionedIds.has(id));

    if (!isAllMentioned) return text;

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

function expandMentionAll(
    payloadText: string,
    membersById: Record<string, string>,
    excludedIds: string[] = []
) {
    if (!payloadText.includes("@__all__")) return payloadText;

    const excludedSet = new Set(
        excludedIds.map((id) => normalizeUserId(id)).filter(Boolean)
    );

    const memberIds = Object.keys(membersById).filter((id) => {
        const normalizedId = normalizeUserId(id);
        return normalizedId && !excludedSet.has(normalizedId);
    });

    if (memberIds.length === 0) {
        return payloadText.replace(/@__all__\b/g, "").replace(/\s{2,}/g, " ").trim();
    }

    const mentions = memberIds.map((id) => `@${id}`).join(" ");

    return payloadText.replace(/@__all__\b/g, mentions).replace(/\s{2,}/g, " ").trim();
}

function timeAgoText(date: Date, t: DiscussTranslate) {
    const diff = Math.max(0, Date.now() - date.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("hoursAgo", { count: hrs });
    const days = Math.floor(hrs / 24);
    return t("daysAgo", { count: days });
}

function normalizeBaseUrl(raw: string) {
    return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function buildHubUrl() {
    const rawBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const base = normalizeBaseUrl(rawBase);
    return base ? `${base}/hubs/group-discuss` : "";
}

function dtoToUserLite(t: DiscussTranslate, userId?: string, user?: HubUserDto | null): UserLite {
    const name =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || t("anonymous");
    return {
        id: user?.id || userId || "unknown-user",
        name,
        initials: initialsOf(name),
        avatarUrl: safeAvatarUrl(user?.avatarUrl ?? "")
    };
}

function dtoToReplyItem(dto: GroupMessageDto, t: DiscussTranslate): ReplyItem | null {
    if (!dto.messageId) return null;
    if (!dto.content) return null;
    if (!dto.createdAt) return null;

    return {
        id: dto.messageId,
        author: dtoToUserLite(t, dto.userId, dto.user),
        content: dto.content,
        createdAtText: timeAgoText(new Date(dto.createdAt), t)
    };
}

function dtoToPostItem(dto: GroupMessageDto, t: DiscussTranslate): PostItem | null {
    if (!dto.messageId) return null;
    if (!dto.content) return null;
    if (!dto.createdAt) return null;

    return {
        id: dto.messageId,
        author: dtoToUserLite(t, dto.userId, dto.user),
        content: dto.content,
        createdAtText: timeAgoText(new Date(dto.createdAt), t),
        replies: (dto.replies || [])
            .map((reply) => dtoToReplyItem(reply, t))
            .filter((reply): reply is ReplyItem => reply !== null)
    };
}

function upsertPost(prev: PostItem[], next: PostItem) {
    const existed = prev.some((p) => p.id === next.id);
    if (!existed) return [next, ...prev];
    return prev.map((p) => (p.id === next.id ? { ...p, ...next } : p));
}

function mergeReply(post: PostItem, nextReply: ReplyItem) {
    const replyExists = post.replies.some((r) => r.id === nextReply.id);
    const nextReplies = replyExists
        ? post.replies.map((r) => (r.id === nextReply.id ? nextReply : r))
        : [...post.replies, nextReply];

    return { ...post, replies: nextReplies };
}

function buildPostsFromMessages(messages: GroupMessageDto[] | null | undefined, t: DiscussTranslate) {
    const source = messages || [];
    const postMap = new Map<string, PostItem>();

    for (const message of source) {
        if (message.parentMessageId) continue;
        const post = dtoToPostItem(message, t);
        if (!post) continue;
        postMap.set(post.id, post);
    }

    for (const message of source) {
        if (!message.parentMessageId) continue;
        const parent = postMap.get(message.parentMessageId);
        if (!parent) continue;

        const reply = dtoToReplyItem(message, t);
        if (!reply) continue;

        postMap.set(parent.id, mergeReply(parent, reply));
    }

    return [...postMap.values()];
}

function Avatar({ initials, avatarUrl }: { initials: string; avatarUrl?: string | null }) {
    if (avatarUrl) {
        return (
            <Image
                src={avatarUrl}
                alt="avatar"
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5"
            />
        );
    }

    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] font-semibold text-[#261E33] text-xs ring-1 ring-black/5">
            {initials}
        </div>
    );
}

function countWords(text: string) {
    const t = String(text || "").trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
}

function TextCounter({
    text,
    maxChars = MAX_CHARS
}: {
    text: string;
    maxChars?: number;
}) {
    const t = useTranslations("GroupDiscussPage");
    const chars = (text || "").length;
    const words = countWords(text || "");
    const over = chars > maxChars;

    return (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs">
            <span className="text-[#6F6B99]">{t("wordsUnit", { count: words })}</span>
            <span className={twMerge("font-medium", over ? "text-red-600" : "text-[#6F6B99]")}>
                {t("charsUnit", { count: chars, max: maxChars })}
            </span>
        </div>
    );
}

function RichTextWithMentions({
    text,
    membersById,
    authorId
}: {
    text: string;
    membersById: Record<string, string>;
    authorId?: string;
}) {
    const t = useTranslations("GroupDiscussPage");
    const displayText = React.useMemo(
        () => compressAllMentionsForDisplay(text, membersById, authorId),
        [text, membersById, authorId]
    );

    const re =
        /@(__all__|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;

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
                    @{t("mentionAllShort")}
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

function isWordChar(ch: string) {
    return /[\p{L}\p{N}._-]/u.test(ch);
}

function renderAllMentions(segment: string, mentionAllShort: string) {
    const re = new RegExp(`@(?:all|mọi người|${escapeRegExp(mentionAllShort)})(?=\\s|$)`, "gi");
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

function limitLineBreaks(text: string, maxBreaks = 10) {
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
        placeholder?: string;
        previewClassName?: string;
        textareaClassName?: string;
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
        placeholder,
        previewClassName,
        textareaClassName,
        maxChars = MAX_CHARS,
        onSubmit,
        disabled = false
    },
    ref
) {
    const t = useTranslations("GroupDiscussPage");
    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    const popupRef = React.useRef<HTMLDivElement | null>(null);

    const [mounted, setMounted] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [query, setQuery] = React.useState("");
    const [anchor, setAnchor] = React.useState<{ start: number; end: number } | null>(null);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(null);
    const [inputHeight, setInputHeight] = React.useState(110);

    const mentionsRef = React.useRef<{ id: string; name: string; start: number; end: number }[]>([]);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (!value) {
            mentionsRef.current = [];
        }
    }, [value]);

    const resizeTextarea = React.useCallback(() => {
        const el = taRef.current;
        if (!el) return;

        el.style.height = "110px";
        const nextHeight = Math.max(110, el.scrollHeight);
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
        const mentionAllShort = t("mentionAllShort");

        const allOption: MentionUser = {
            id: "__all__",
            name: mentionAllShort,
            subtitle: t("mentionAllSubtitle"),
            isAll: true
        };

        const baseUsers = members.filter((u) => normalizeUserId(u.id) !== normalizeUserId(meId));
        const full = [...baseUsers, allOption];

        if (!q) return full.slice(0, 8);

        return full
            .filter((u) => {
                const haystack = `${u.name} ${u.subtitle ?? ""}`.toLowerCase();
                return haystack.includes(q);
            })
            .slice(0, 8);
    }, [members, meId, query, t]);

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

        const visibleName = user.isAll ? t("mentionAllShort") : user.name;
        const tokenVisible = `@${visibleName}`;
        const tokenInsert = `${tokenVisible} `;
        const next = before + tokenInsert + after;

        if (next.length > maxChars) return;

        const start = before.length;
        const end = start + tokenVisible.length;

        mentionsRef.current = mentionsRef.current.filter((m) => !(m.start < end && m.end > start));

        if (!user.isAll) {
            mentionsRef.current.push({
                id: user.id,
                name: visibleName,
                start,
                end
            });
        }

        onChange(next);
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
        next = limitLineBreaks(next, 10);

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

        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
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

        text = text.replace(new RegExp(`@${escapeRegExp(t("mentionAllShort"))}\\b`, "g"), "@__all__");
        text = text.replace(/@all\b/g, "@__all__");

        return text;
    }, [t, value]);

    React.useImperativeHandle(ref, () => ({
        getPayloadText,
        reset: () => {
            mentionsRef.current = [];
        }
    }), [getPayloadText]);

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
                const segNodes = renderAllMentions(seg, t("mentionAllShort"));
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
            const tail = renderAllMentions(text.slice(last), t("mentionAllShort"));
            if (Array.isArray(tail)) nodes.push(...tail);
            else nodes.push(tail);
        }

        return nodes.length ? nodes : text;
    }, [t, value]);

    const popup =
        mounted && open && !disabled && popupPosition
            ? createPortal(
                <div
                    ref={popupRef}
                    className="fixed z-[22000] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
                    style={{
                        left: popupPosition.left,
                        top: popupPosition.top,
                        width: popupPosition.width,
                        maxHeight: 320,
                        transform:
                            popupPosition.top < (taRef.current?.getBoundingClientRect().top ?? 0)
                                ? "translateY(-100%)"
                                : undefined
                    }}
                >
                    {filtered.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto py-2">
                            {filtered.map((u, idx) => {
                                const isActive = idx === activeIndex;
                                const displayName = u.isAll ? t("mentionAllShort") : u.name;
                                const subtitle =
                                    u.subtitle || (u.isAll ? t("mentionAllSubtitle") : "");

                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onMouseDown={(ev) => {
                                            ev.preventDefault();
                                            insertMention(u);
                                        }}
                                        className={twMerge(
                                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                                            isActive ? "bg-[#E7F3FF]" : "hover:bg-zinc-100"
                                        )}
                                    >
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
                                            <div className="truncate text-[15px] font-medium leading-5 text-[#261E33]">
                                                {displayName}
                                            </div>
                                            {subtitle ? (
                                                <div className="truncate pt-0.5 text-[13px] leading-5 text-[#6F6B99]">
                                                    {subtitle}
                                                </div>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-sm text-[#6F6B99]">{t("noMembersToMention")}</div>
                    )}
                </div>,
                document.body
            )
            : null;

    return (
        <>
            <div className="relative w-full min-w-0 max-w-full overflow-visible">
                <div className="relative" style={{ minHeight: 110, height: inputHeight }}>
                    <div
                        aria-hidden
                        className={twMerge(
                            "pointer-events-none absolute inset-0 z-0 max-w-full whitespace-pre-wrap break-words rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm leading-6 text-[#261E33]",
                            disabled && "opacity-60",
                            previewClassName
                        )}
                        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    >
                        {value ? <>{previewNodes}</> : <span className="text-[#9CA3AF]">{placeholder}</span>}
                    </div>

                    <textarea
                        ref={taRef}
                        value={value}
                        onChange={onTextChange}
                        onKeyDown={onKeyDown}
                        rows={1}
                        placeholder=""
                        disabled={disabled}
                        maxLength={maxChars}
                        className={twMerge(
                            "relative z-10 block w-full max-w-full resize-none overflow-hidden rounded-md border border-[#EDEDED] bg-transparent px-3 py-2 text-sm leading-6 text-transparent caret-[#261E33] outline-none selection:bg-blue-200",
                            "min-h-[110px]",
                            "disabled:cursor-not-allowed disabled:caret-transparent",
                            textareaClassName
                        )}
                        style={{ height: inputHeight, overflowWrap: "anywhere", wordBreak: "break-word" }}
                    />
                </div>
            </div>

            {popup}
        </>
    );
});

function ReplyComposer({
    onCancel,
    onSubmit,
    members,
    meId
}: {
    onCancel: () => void;
    onSubmit: (payloadText: string) => void;
    members: MentionUser[];
    meId: string;
}) {
    const t = useTranslations("GroupDiscussPage");
    const [text, setText] = React.useState("");
    const mentionRef = React.useRef<MentionTextareaHandle | null>(null);

    return (
        <div className="mt-3 rounded-xl border border-[#EDEDED] bg-[#FCFCFD] p-3">
            <MentionTextarea
                ref={mentionRef}
                value={text}
                onChange={setText}
                members={members}
                meId={meId}
                placeholder={t("writeReplyPlaceholder")}
                maxChars={MAX_CHARS}
            />

            <TextCounter text={text} maxChars={MAX_CHARS} />

            <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onCancel} className="rounded-xl">
                    {t("cancel")}
                </Button>
                <Button
                    onClick={() => {
                        const v = text.trim();
                        if (!v) return;

                        const payload = mentionRef.current?.getPayloadText() ?? v;
                        onSubmit(payload);
                        setText("");
                    }}
                    className="rounded-xl bg-[#FF5722] text-white hover:bg-[#e24d1e]"
                >
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    {t("reply")}
                </Button>
            </div>
        </div>
    );
}

function ReplyItemView({
    r,
    membersById,
    canDelete,
    onDelete,
    rolesById
}: {
    r: ReplyItem;
    membersById: Record<string, string>;
    canDelete: boolean;
    onDelete: (id: string) => void;
    rolesById: Record<string, GroupRole>;
}) {
    const t = useTranslations("GroupDiscussPage");
    return (
        <div className="flex gap-3">
            <Avatar initials={r.author.initials} avatarUrl={r.author.avatarUrl} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="font-semibold text-[#261E33] text-sm">{r.author.name}</p>
                            {rolesById[r.author.id] && (() => {
                                const colors = getRoleColor(rolesById[r.author.id]);
                                return (
                                    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
                                        {getRoleIcon(rolesById[r.author.id])}
                                        <span>{roleDisplayText[rolesById[r.author.id]]}</span>
                                    </div>
                                );
                            })()}
                            <span className="text-[#9CA3AF] text-xs">• {r.createdAtText}</span>
                        </div>

                        <p className="mt-1 whitespace-pre-wrap text-[#261E33] text-sm">
                            <RichTextWithMentions
                                text={r.content}
                                membersById={membersById}
                                authorId={r.author.id}
                            />
                        </p>
                    </div>

                    {canDelete ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                                    aria-label={t("more")}
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                sideOffset={6}
                                className={twMerge(
                                    "z-[9999] w-40",
                                    "bg-white opacity-100 backdrop-blur-none",
                                    "border border-[#EDEDED] shadow-xl"
                                )}
                            >
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => onDelete(r.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function PostCard({
    post,
    onDelete,
    onAddReply,
    currentUserId,
    userRole,
    membersById,
    mentionUsers,
    meId,
    isOwnerId,
    canComment,
    rolesById
}: {
    post: PostItem;
    onDelete: (id: string) => void;
    onAddReply: (postId: string, payloadText: string) => void;
    currentUserId: string;
    userRole: GroupRole;
    membersById: Record<string, string>;
    mentionUsers: MentionUser[];
    meId: string;
    isOwnerId: (userId: string) => boolean;
    canComment: boolean;
    rolesById: Record<string, GroupRole>;
}) {
    const t = useTranslations("GroupDiscussPage");
    const [replyOpen, setReplyOpen] = React.useState(false);
    const [repliesOpen, setRepliesOpen] = React.useState(true);

    const isMeOwner = userRole === "owner";
    const isMeModerator = userRole === "moderator";

    const canDeletePost =
        post.author.id === currentUserId ||
        isMeOwner ||
        (isMeModerator && !isOwnerId(post.author.id));

    return (
        <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <Avatar initials={post.author.initials} avatarUrl={post.author.avatarUrl} />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="truncate font-semibold text-[#261E33] text-sm">
                                    {post.author.name}
                                </p>
                                {rolesById[post.author.id] && (() => {
                                    const colors = getRoleColor(rolesById[post.author.id]);
                                    return (
                                        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
                                            {getRoleIcon(rolesById[post.author.id])}
                                            <span>{roleDisplayText[rolesById[post.author.id]]}</span>
                                        </div>
                                    );
                                })()}
                                <span className="text-[#9CA3AF] text-xs">
                                    • {post.createdAtText}
                                </span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-[#261E33] text-[15px] leading-relaxed">
                                <RichTextWithMentions
                                    text={post.content}
                                    membersById={membersById}
                                    authorId={post.author.id}
                                />
                            </p>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#6F6B99] transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                                    aria-label={t("more")}
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                sideOffset={6}
                                className={twMerge(
                                    "z-[9999] w-40",
                                    "bg-white opacity-100 backdrop-blur-none",
                                    "border border-[#EDEDED] shadow-xl"
                                )}
                            >
                                {canDeletePost ? (
                                    <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={() => onDelete(post.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t("delete")}
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem disabled className="text-[#9CA3AF]">
                                        {t("noActions")}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {canComment ? (
                            <button
                                type="button"
                                onClick={() => setReplyOpen((v) => !v)}
                                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium text-[#6F6B99] text-xs transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                                aria-label={t("replyAria")}
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span>{post.replies.length}</span>
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium text-[#9CA3AF] text-xs">
                                <MessageCircle className="h-4 w-4" />
                                <span>{post.replies.length}</span>
                            </div>
                        )}

                        {post.replies.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setRepliesOpen((v) => !v)}
                                className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#6F6B99] text-xs transition hover:bg-[#FAFAFA] hover:text-[#261E33]"
                            >
                                {repliesOpen ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" /> {t("hideReplies")}
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" /> {t("showReplies")}
                                    </>
                                )}
                            </button>
                        ) : null}
                    </div>

                    {post.replies.length > 0 && repliesOpen ? (
                        <div className="mt-4 space-y-4 border-[#F1F1F1] border-l-2 pl-4">
                            {post.replies.map((r) => {
                                const canDeleteReply =
                                    r.author.id === currentUserId ||
                                    isMeOwner ||
                                    (isMeModerator && !isOwnerId(r.author.id));

                                return (
                                    <ReplyItemView
                                        key={r.id}
                                        r={r}
                                        membersById={membersById}
                                        canDelete={canDeleteReply}
                                        onDelete={onDelete}
                                        rolesById={rolesById}
                                    />
                                );
                            })}
                        </div>
                    ) : null}

                    {replyOpen && canComment ? (
                        <ReplyComposer
                            members={mentionUsers}
                            meId={meId}
                            onCancel={() => setReplyOpen(false)}
                            onSubmit={(payloadText) => {
                                onAddReply(post.id, payloadText);
                                setReplyOpen(false);
                                setRepliesOpen(true);
                            }}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default function GroupDiscussPage() {
    const locale = useLocale();
    const t = useTranslations("GroupDiscussPage");
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");
    const hubUrl = React.useMemo(() => buildHubUrl(), []);
    const connectionRef = React.useRef<signalR.HubConnection | null>(null);
    const startPromiseRef = React.useRef<Promise<void> | null>(null);
    const [isConnected, setIsConnected] = React.useState(false);

    const [me, setMe] = React.useState<UserLite>({
        id: "me",
        name: t("me"),
        initials: "B",
        avatarUrl: null
    });

    React.useEffect(() => {
        const user = getUserData();
        const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || t("me");
        setMe({
            id: user?.id || "me",
            name: fullName,
            initials: safeInitials(fullName, t("me")),
            avatarUrl: safeAvatarUrl(user?.avatarUrl ?? "")
        });

        // Fetch full profile to get avatar
        const fetchProfile = async () => {
            try {
                const result = await getUserProfile(locale);
                if (result.status === "success" && result.data) {
                    setMe((prev) => ({
                        ...prev,
                        avatarUrl: safeAvatarUrl(result.data?.avatarUrl)
                    }));
                }
            } catch { }

        };

        void fetchProfile();
    }, [locale, t]);

    const [composerText, setComposerText] = React.useState("");
    const [posts, setPosts] = React.useState<PostItem[]>([]);
    const [userRole, setUserRole] = React.useState<GroupRole>("member");

    const [members, setMembers] = React.useState<
        Array<{
            userId: string;
            name: string;
            email?: string | null;
            avatarUrl?: string | null;
        }>
    >([]);

    const [membersById, setMembersById] = React.useState<Record<string, string>>({});
    const [rolesById, setRolesById] = React.useState<Record<string, GroupRole>>({});

    const canComment = userRole !== "viewer";
    const isComposerDisabled = !(isConnected && canComment) || composerText.trim().length === 0;

    const mentionUsers = React.useMemo<MentionUser[]>(
        () =>
            members.map((m) => ({
                id: m.userId,
                name: m.name,
                subtitle: m.email ?? "",
                avatarUrl: safeAvatarUrl(m.avatarUrl)
            })),
        [members]
    );

    const isOwnerId = React.useCallback(
        (userId: string) => {
            const r = rolesById[String(userId || "").trim()];
            return r === "owner";
        },
        [rolesById]
    );

    const composerMentionRef = React.useRef<MentionTextareaHandle | null>(null);

    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const openDeleteConfirm = (messageId: string) => {
        setDeleteTargetId(messageId);
        setDeleteOpen(true);
    };

    const closeDeleteConfirm = () => {
        if (isDeleting) return;
        setDeleteOpen(false);
        setDeleteTargetId(null);
    };

    const confirmDelete = async () => {
        const id = deleteTargetId;
        if (!id) return;

        const connection = connectionRef.current;
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            toast({ variant: "destructive", description: t("cannotDeleteWhenDisconnected") });
            closeDeleteConfirm();
            return;
        }

        try {
            setIsDeleting(true);
            await connection.invoke("DeleteMessage", { messageId: id, groupId });
            closeDeleteConfirm();
        } catch (err: any) {
            toast({
                variant: "destructive",
                description: String(err?.message || err || t("tryAgainLater"))
            });
        } finally {
            setIsDeleting(false);
        }
    };

    React.useEffect(() => {
        let isDisposed = false;

        if (!groupId) {
            console.warn("[GroupDiscussPage] No groupId found in path");
            return;
        }

        if (!hubUrl) {
            console.error("[GroupDiscussPage] Hub URL not configured - missing NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_API_URL");
            toast({
                variant: "destructive",
                description: t("missingApiBase")
            });
            return;
        }

        console.log("[GroupDiscussPage] Initializing connection for group:", groupId, "Hub URL:", hubUrl);

        const token = getAccessToken();
        if (!token) {
            console.warn("[GroupDiscussPage] No access token found");
            toast({
                variant: "destructive",
                description: t("reloginForDiscuss")
            });
            return;
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token,
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        connectionRef.current = connection;

        const rawBase =
            process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

        const loadHistory = async () => {
            if (!rawBase) return;

            const response = await apiFetch<GroupMessageListResponse>(
                `${rawBase}/group-messages/${groupId}`,
                {
                    method: "GET"
                }
            );

            if (response.status !== "success" || !response.data) return;

            setPosts(buildPostsFromMessages(response.data.messages, t));
        };

        const toRole = (raw: any): GroupRole => {
            const s = String(raw || "")
                .toLowerCase()
                .trim();

            if (s.includes("owner")) return "owner";
            if (s.includes("moderator")) return "moderator";
            if (s.includes("commenter")) return "commenter";
            if (s.includes("viewer") || s === "view") return "viewer";
            return "member";
        };

        const loadUserRole = async () => {
            if (!rawBase) return;

            try {
                const response = await apiFetch<GroupDetailResponse>(`${rawBase}/group/${groupId}/detail`, {
                    method: "GET"
                });

                const roleRaw =
                    (response as any)?.data?.data?.userRole ??
                    (response as any)?.data?.userRole ??
                    (response as any)?.data?.data?.userRole;

                setUserRole(toRole(roleRaw));
            } catch {
                setUserRole("member");
            }
        };

        const loadMembers = async () => {
            if (!rawBase) return;

            try {
                const res = await apiFetch<any>(`${rawBase}/group/${groupId}/members`, {
                    method: "GET"
                });

                const list: any[] = res?.data?.data?.members || res?.data?.members || res?.data || [];

                const nameMap: Record<string, string> = {};
                const roleMap: Record<string, GroupRole> = {};
                const nextMembers: Array<{
                    userId: string;
                    name: string;
                    email?: string | null;
                    avatarUrl?: string | null;
                }> = [];

                for (const m of list) {
                    const id = String(m?.id || m?.userId || "").trim();
                    if (!id) continue;

                    const name =
                        [m?.firstName, m?.lastName].filter(Boolean).join(" ").trim() ||
                        String(m?.userName || m?.username || "").trim() ||
                        (m?.email ? String(m.email).split("@")[0] : "") ||
                        t("userFallback");

                    const email = m?.email ?? m?.user?.email ?? null;
                    const avatarUrl = safeAvatarUrl(m?.avatarUrl ?? m?.user?.avatarUrl ?? "");

                    nameMap[id] = name;
                    nextMembers.push({
                        userId: id,
                        name,
                        email,
                        avatarUrl: avatarUrl || null
                    });

                    const rawRole =
                        m?.role ??
                        m?.groupRole ??
                        m?.userRole ??
                        m?.memberRole ??
                        m?.groupMemberRole ??
                        m?.roles?.[0];

                    roleMap[id] = toRole(rawRole);
                }

                if (!isDisposed) {
                    setMembers(nextMembers);
                    setMembersById(nameMap);
                    setRolesById(roleMap);
                }
            } catch {
                if (!isDisposed) {
                    setMembers([]);
                    setMembersById({});
                    setRolesById({});
                }
            }
        };

        connection.on("ReceiveMessage", (message: GroupMessageDto) => {
            if (message.parentMessageId) return;
            const nextPost = dtoToPostItem(message, t);
            if (!nextPost) return;
            setPosts((prev) => upsertPost(prev, nextPost));
        });

        connection.on("MessageReplied", (reply: GroupMessageDto) => {
            if (!reply.parentMessageId) return;

            let parentExists = false;

            setPosts((prev) => {
                const nextReply = dtoToReplyItem(reply, t);
                if (!nextReply) return prev;

                const nextPosts = prev.map((p) => {
                    if (p.id !== reply.parentMessageId) return p;
                    parentExists = true;
                    return mergeReply(p, nextReply);
                });

                return nextPosts;
            });

            if (!parentExists) void loadHistory();
        });

        connection.on("MessageDeleted", (data: MessageDeletedPayload) => {
            setPosts((prev) =>
                prev
                    .filter((p) => p.id !== data.messageId)
                    .map((p) => ({
                        ...p,
                        replies: p.replies.filter((r) => r.id !== data.messageId)
                    }))
            );
        });

        connection.on("Error", (errorMessage: string) => {
            if (isDisposed) return;
            toast({ variant: "destructive", description: errorMessage });
        });

        connection.onreconnecting(() => {
            console.warn("[GroupDiscussPage] Reconnecting...");
            setIsConnected(false);
        });

        connection.onreconnected(async () => {
            if (isDisposed) return;

            setIsConnected(true);
            console.log("[GroupDiscussPage] Reconnected successfully");
            try {
                await connection.invoke("JoinGroup", groupId);
                await Promise.all([loadHistory(), loadUserRole(), loadMembers()]);
            } catch (err: any) {
                if (isDisposed) return;
                console.error("[GroupDiscussPage] Rejoin failed:", err?.message || err);
                toast({ variant: "destructive", description: t("cannotRejoinRoom") });
            }
        });

        connection.onclose((err) => {
            console.warn("[GroupDiscussPage] Connection closed:", err?.message || "No error details");
            setIsConnected(false);
        });

        const start = async () => {
            try {
                if (isDisposed) return;
                await connection.start();

                if (isDisposed) {
                    try {
                        await connection.stop();
                    } catch {
                        // Ignore errors
                    }
                    return;
                }

                await connection.invoke("JoinGroup", groupId);
                if (isDisposed) return;

                setIsConnected(true);
                await Promise.all([loadHistory(), loadUserRole(), loadMembers()]);
            } catch (err: any) {
                if (isDisposed) return;

                setIsConnected(false);
                const errorMsg = err?.message || String(err);
                console.error("[GroupDiscussPage] Connection failed:", errorMsg);

                if (errorMsg.includes("negotiation") || errorMsg.includes("connection was stopped")) {
                    toast({
                        variant: "destructive",
                        description: t("cannotConnectDiscuss")
                    });
                } else {
                    toast({
                        variant: "destructive",
                        description: t("reloadPageOrRelogin")
                    });
                }
            }
        };

        const startPromise = start();
        startPromiseRef.current = startPromise;

        return () => {
            isDisposed = true;

            const cleanup = async () => {
                try {
                    if (startPromiseRef.current) {
                        await startPromiseRef.current.catch(() => { });
                    }

                    const state = connection.state;
                    if (state !== signalR.HubConnectionState.Disconnected && state !== signalR.HubConnectionState.Disconnecting) {
                        try {
                            if (state === signalR.HubConnectionState.Connected) {
                                await connection.invoke("LeaveGroup", groupId);
                            }
                        } catch { }
                        await connection.stop();
                    }
                } catch { } finally {
                    if (connectionRef.current === connection) connectionRef.current = null;
                    setIsConnected(false);
                }
            };

            void cleanup();
        };
    }, [groupId, hubUrl, t]);

    const onPost = async () => {
        const connection = connectionRef.current;
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

        if (!canComment) {
            toast({ variant: "destructive", description: t("viewerCannotComment") });
            return;
        }

        const v = composerText.trim();
        if (!v) return;

        const rawPayload = composerMentionRef.current?.getPayloadText() ?? v;
        const payload = expandMentionAll(rawPayload, membersById, [me.id]);

        try {
            await connection.invoke("SendMessage", { groupId, content: payload });
            setComposerText("");
            composerMentionRef.current?.reset?.();
        } catch {
            toast({ variant: "destructive", description: t("tryAgainLater") });
        }
    };

    const onDelete = (id: string) => {
        openDeleteConfirm(id);
    };

    const onAddReply = async (postId: string, payloadText: string) => {
        const connection = connectionRef.current;
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            toast({ variant: "destructive", description: t("cannotSendReplyWhenDisconnected") });
            return;
        }

        if (!canComment) {
            toast({ variant: "destructive", description: t("viewerCannotComment") });
            return;
        }

        try {
            const content = expandMentionAll(payloadText, membersById, [me.id]);
            const payload = { groupId, parentMessageId: postId, content };

            try {
                await connection.invoke("ReplyToMessage", payload);
            } catch {
                await connection.invoke("SendMessage", payload);
            }
        } catch {
            toast({ variant: "destructive", description: t("tryAgainLater") });
        }
    };

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="mb-5">
                    <p className="font-semibold text-[#261E33] text-sm">{t("title")}</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">
                        {t("subtitle")}
                    </p>
                </div>

                <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm">
                    {canComment ? (
                        <div className="flex gap-3">
                            <Avatar initials={me.initials} avatarUrl={me.avatarUrl} />
                            <div className="min-w-0 flex-1">
                                <MentionTextarea
                                    ref={composerMentionRef}
                                    value={composerText}
                                    onChange={setComposerText}
                                    members={mentionUsers}
                                    meId={me.id}
                                    placeholder={t("composerPlaceholder")}
                                    maxChars={MAX_CHARS}
                                    onSubmit={() => {
                                        void onPost();
                                    }}
                                />

                                <TextCounter text={composerText} maxChars={MAX_CHARS} />

                                <div className="mt-3 flex items-center justify-end">
                                    <Button
                                        onClick={onPost}
                                        disabled={isComposerDisabled}
                                        className="rounded-xl bg-[#FF5722] px-6 text-white hover:bg-[#e24d1e]"
                                    >
                                        <SendHorizontal className="mr-2 h-4 w-4" />
                                        {t("post")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[#6F6B99] text-sm">
                            {t("viewerOnly")}
                        </div>
                    )}
                </div>

                <div className="mt-6 space-y-4">
                    {posts.length > 0 ? (
                        posts.map((p) => (
                            <PostCard
                                key={p.id}
                                post={p}
                                onDelete={onDelete}
                                onAddReply={onAddReply}
                                currentUserId={me.id}
                                userRole={userRole}
                                membersById={membersById}
                                mentionUsers={mentionUsers}
                                meId={me.id}
                                isOwnerId={isOwnerId}
                                canComment={canComment}
                                rolesById={rolesById}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-[#EDEDED] bg-white p-10 text-center text-[#6F6B99] text-sm">
                            {t("noDiscussions")}
                        </div>
                    )}
                </div>

                <div className="h-10" />

                <AlertDialog
                    open={deleteOpen}
                    onOpenChange={(v) => (v ? setDeleteOpen(true) : closeDeleteConfirm())}
                >
                    <AlertDialogContent className="rounded-2xl sm:max-w-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">{t("confirmDeleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#111827] text-base leading-6">
                                {t("confirmDeleteDescription")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter className="gap-3 sm:gap-3">
                            <AlertDialogCancel
                                disabled={isDeleting}
                                className={twMerge(
                                    "rounded-xl bg-[#F3F4F6] text-[#111827]",
                                    "border-0 shadow-none",
                                    "hover:bg-[#E5E7EB]",
                                    "focus-visible:ring-0"
                                )}
                            >
                                {t("cancel")}
                            </AlertDialogCancel>

                            <AlertDialogAction
                                disabled={isDeleting}
                                onClick={(e) => {
                                    e.preventDefault();
                                    void confirmDelete();
                                }}
                                className="rounded-xl bg-red-600 px-8 text-white hover:bg-red-700 focus-visible:ring-0"
                            >
                                {isDeleting ? t("deleting") : t("deleteMessage")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Container>
        </div>
    );
}
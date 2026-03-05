"use client";

import { ChevronDown, Loader2, Send, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { getUserProfile } from "@/api/user-profile";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { askGroupAiStream } from "../group.api";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
};

type QuickAction = {
    key: string;
    label: string;
    prompt: string;
};

type InlineNode = {
    type: "text" | "strong";
    value: string;
};

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");

const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

const formatTime = (ts: number, locale: string) =>
    new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

function parseAIError(error: unknown) {
    if (error instanceof Error && error.message) {
        try {
            const parsed = JSON.parse(error.message) as { message?: unknown };
            if (typeof parsed.message === "string" && parsed.message.trim()) {
                return parsed.message;
            }
        } catch {
            return error.message;
        }
        return error.message;
    }
    return "";
}

function parseInlineMarkdown(text: string): InlineNode[] {
    const nodes: InlineNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
        const full = match[0];
        const content = match[1];
        const index = match.index ?? 0;

        if (index > lastIndex) {
            nodes.push({ type: "text", value: text.slice(lastIndex, index) });
        }
        nodes.push({ type: "strong", value: content });
        lastIndex = index + full.length;
    }

    if (lastIndex < text.length) {
        nodes.push({ type: "text", value: text.slice(lastIndex) });
    }

    if (nodes.length === 0) {
        return [{ type: "text", value: text }];
    }

    return nodes;
}

function renderInline(text: string) {
    return parseInlineMarkdown(text).map((node, idx) =>
        node.type === "strong" ? <strong key={`${node.value}-${idx}`}>{node.value}</strong> : node.value
    );
}

function renderAssistantMarkdown(content: string) {
    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let key = 0;

    const flushList = () => {
        if (listItems.length === 0) return;
        elements.push(
            <ul key={`ul-${key++}`} className="list-disc space-y-1 pl-5">
                {listItems.map((item) => (
                    <li key={`li-${key++}-${item.slice(0, 16)}`}>{renderInline(item)}</li>
                ))}
            </ul>
        );
        listItems = [];
    };

    const isTableSeparator = (line: string) => {
        const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");
        const cols = normalized.split("|").map((c) => c.trim());
        if (cols.length < 2) return false;
        return cols.every((c) => /^:?-{3,}:?$/.test(c));
    };

    const parseTableRow = (line: string) =>
        line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim());

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];

        if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
            flushList();

            const header = parseTableRow(line);
            i += 2;
            const rows: string[][] = [];

            for (; i < lines.length; i += 1) {
                const rowLine = lines[i];
                if (!rowLine.trim()) continue;
                if (!rowLine.includes("|")) {
                    i -= 1;
                    break;
                }
                rows.push(parseTableRow(rowLine));
            }

            elements.push(
                <div key={`tbl-wrap-${key++}`} className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                            <tr>
                                {header.map((cell, idx) => (
                                    <th
                                        key={`th-${idx}-${cell.slice(0, 12)}`}
                                        className="border border-[#ECECEC] bg-[#FAFAFA] px-3 py-2 font-semibold">
                                        {renderInline(cell)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <tr key={`tr-${rowIdx}-${row.join("-").slice(0, 12)}`}>
                                    {row.map((cell, cellIdx) => (
                                        <td
                                            key={`td-${rowIdx}-${cellIdx}-${cell.slice(0, 12)}`}
                                            className="border border-[#ECECEC] px-3 py-2 align-top">
                                            {renderInline(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            continue;
        }

        const bullet = line.match(/^\s*[*-]\s+(.*)$/);
        if (bullet) {
            listItems.push(bullet[1]);
            continue;
        }

        flushList();

        if (!line.trim()) {
            elements.push(<div key={`sp-${key++}`} className="h-2" />);
            continue;
        }

        elements.push(
            <p key={`p-${key++}`} className="whitespace-pre-wrap">
                {renderInline(line)}
            </p>
        );
    }

    flushList();
    return <div className="space-y-2 text-sm leading-7">{elements}</div>;
}

export default function GroupAiQaPage() {
    const locale = useLocale();
    const t = useTranslations("GroupAiQaPage");
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");
    const { toast } = useToast();

    const [messages, setMessages] = React.useState<ChatMessage[]>([]);
    const [input, setInput] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    const [remainingRequests, setRemainingRequests] = React.useState<number | null>(null);
    const [requestsUsedToday, setRequestsUsedToday] = React.useState<number | null>(null);
    const [dailyLimit, setDailyLimit] = React.useState<number | null>(null);
    const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
    const bottomAnchorRef = React.useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = React.useRef(true);

    const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
        bottomAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
    }, []);

    React.useEffect(() => {
        const checkNearBottom = () => {
            const viewportBottom = window.scrollY + window.innerHeight;
            const pageBottom = document.documentElement.scrollHeight;
            const nearBottom = viewportBottom >= pageBottom - 160;
            shouldAutoScrollRef.current = nearBottom;
            setShowScrollToBottom(!nearBottom);
        };

        checkNearBottom();
        window.addEventListener("scroll", checkNearBottom, { passive: true });
        window.addEventListener("resize", checkNearBottom);
        return () => {
            window.removeEventListener("scroll", checkNearBottom);
            window.removeEventListener("resize", checkNearBottom);
        };
    }, []);

    React.useEffect(() => {
        if (messages.length === 0) return;
        if (shouldAutoScrollRef.current) {
            scrollToBottom("auto");
        }
    }, [messages.length, scrollToBottom]);

    React.useEffect(() => {
        let isMounted = true;

        const loadUserProfile = async () => {
            const profileRes = await getUserProfile(locale);
            if (!isMounted || profileRes.status !== "success" || !profileRes.data) return;

            if (typeof profileRes.data.aiRequestsUsedToday === "number") {
                setRequestsUsedToday(profileRes.data.aiRequestsUsedToday);
            }
            if (typeof profileRes.data.aiRequestsRemaining === "number") {
                setRemainingRequests(profileRes.data.aiRequestsRemaining);
            }
            if (typeof profileRes.data.aiDailyLimit === "number") {
                setDailyLimit(profileRes.data.aiDailyLimit);
            }
        };

        void loadUserProfile();

        return () => {
            isMounted = false;
        };
    }, [locale]);

    const quickActions: QuickAction[] = React.useMemo(
        () => [
            {
                key: "summary",
                label: t("quickActions.summary.label"),
                prompt: t("quickActions.summary.prompt")
            },
            {
                key: "risk",
                label: t("quickActions.risk.label"),
                prompt: t("quickActions.risk.prompt")
            },
            {
                key: "report",
                label: t("quickActions.report.label"),
                prompt: t("quickActions.report.prompt")
            },
            {
                key: "deadline",
                label: t("quickActions.deadline.label"),
                prompt: t("quickActions.deadline.prompt")
            }
        ],
        [t]
    );

    const sendQuestion = React.useCallback(
        async (question: string, userDisplayText?: string) => {
            const trimmed = question.trim();
            if (!trimmed || isSending) return;

            if (!groupId) {
                toast({ variant: "destructive", description: t("cannotDetectGroupId") });
                return;
            }

            const userMessage: ChatMessage = {
                id: `u_${Date.now()}`,
                role: "user",
                content: userDisplayText?.trim() || trimmed,
                createdAt: Date.now()
            };
            const assistantMessageId = `a_${Date.now()}`;
            let chunkQueue = "";
            let renderedText = "";
            let finalAnswerText: string | null = null;
            let flushTimer: ReturnType<typeof setInterval> | null = null;

            const ensureFlushTimer = () => {
                if (flushTimer) return;
                flushTimer = setInterval(() => {
                    if (!chunkQueue) {
                        if (finalAnswerText != null && renderedText !== finalAnswerText) {
                            renderedText = finalAnswerText;
                            setMessages((prev) =>
                                prev.map((m) => (m.id === assistantMessageId ? { ...m, content: renderedText } : m))
                            );
                        }
                        if (!isSending && flushTimer) {
                            clearInterval(flushTimer);
                            flushTimer = null;
                        }
                        return;
                    }

                    const step = chunkQueue.slice(0, 8);
                    chunkQueue = chunkQueue.slice(8);
                    renderedText += step;

                    setMessages((prev) =>
                        prev.map((m) => (m.id === assistantMessageId ? { ...m, content: renderedText } : m))
                    );
                }, 20);
            };

            setMessages((prev) => [
                ...prev,
                userMessage,
                {
                    id: assistantMessageId,
                    role: "assistant",
                    content: "",
                    createdAt: Date.now()
                }
            ]);
            scrollToBottom("smooth");
            setInput("");
            setIsSending(true);

            try {
                const result = await askGroupAiStream(
                    { groupId, question: trimmed },
                    {
                        onChunk: (_, delta) => {
                            if (!delta) return;
                            chunkQueue += delta;
                            ensureFlushTimer();
                        }
                    }
                );
                if (result.remainingRequests != null) {
                    setRemainingRequests(result.remainingRequests);
                }
                if (dailyLimit != null && result.remainingRequests != null) {
                    setRequestsUsedToday(Math.max(dailyLimit - result.remainingRequests, 0));
                }

                const assistantText = result.answer.answer?.trim() || t("emptyAiAnswer");
                finalAnswerText = assistantText;
                ensureFlushTimer();
            } catch (error) {
                if (flushTimer) {
                    clearInterval(flushTimer);
                    flushTimer = null;
                }
                setMessages((prev) => prev.filter((m) => !(m.id === assistantMessageId && !m.content.trim())));
                toast({ variant: "destructive", description: parseAIError(error) || t("aiResponseError") });
            } finally {
                setIsSending(false);
            }
        },
        [dailyLimit, groupId, isSending, scrollToBottom, toast, t]
    );

    const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        await sendQuestion(input);
    };

    const onQuickActionClick = React.useCallback(
        async (action: QuickAction) => {
            await sendQuestion(action.prompt, action.label);
        },
        [sendQuestion]
    );

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-[#261E33] text-xl">AI Q&A</h2>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <div className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-1.5 text-[#6F6B99]">
                            {t("usedToday")}:{" "}
                            <span className="font-semibold text-[#261E33]">
                                {requestsUsedToday == null ? t("unknown") : requestsUsedToday}
                            </span>
                        </div>
                        <div className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-1.5 text-[#6F6B99]">
                            {t("remainingRequests")}:{" "}
                            <span className="font-semibold text-[#261E33]">
                                {remainingRequests == null ? t("unknown") : remainingRequests}
                            </span>
                        </div>
                        <div className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-1.5 text-[#6F6B99]">
                            {t("dailyLimit")}:{" "}
                            <span className="font-semibold text-[#261E33]">
                                {dailyLimit == null ? t("unknown") : dailyLimit}
                            </span>
                        </div>
                    </div>
                </div>

                {messages.length === 0 ? (
                    <div className="rounded-2xl border border-[#F0F0F0] bg-white p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3ED]">
                            <Sparkles className="h-8 w-8 text-[#FF8A65]" />
                        </div>
                        <h3 className="font-semibold text-[#261E33] text-[34px] md:text-[40px]">
                            {t("startConversation")}
                        </h3>
                        <p className="mx-auto mt-2 max-w-2xl text-[#6F6B99] text-base">{t("description")}</p>

                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {quickActions.map((action) => (
                                <Button
                                    key={action.key}
                                    type="button"
                                    variant="outline"
                                    disabled={isSending}
                                    onClick={() => void onQuickActionClick(action)}
                                    className="rounded-xl border-[#E5E5E5] text-[#4E4B66] hover:bg-[#FAFAFA]">
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-h-[45vh] space-y-4 overflow-y-scroll">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={
                                    m.role === "user"
                                        ? "ml-auto max-w-[90%] md:max-w-[75%]"
                                        : "max-w-[90%] md:max-w-[75%]"
                                }>
                                <div
                                    className={
                                        m.role === "user"
                                            ? "rounded-2xl bg-[#261E33] px-4 py-3 text-white"
                                            : "rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 text-[#261E33]"
                                    }>
                                    {m.role === "assistant" && !m.content.trim() && isSending ? (
                                        <div className="flex items-center gap-2 text-[#6F6B99] text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>{t("aiThinking")}</span>
                                        </div>
                                    ) : m.role === "assistant" ? (
                                        renderAssistantMarkdown(m.content)
                                    ) : (
                                        <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                                    )}
                                </div>
                                <p className="mt-1 text-[#9A98AE] text-xs">{formatTime(m.createdAt, locale)}</p>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={onSubmit} className="mt-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                        {quickActions.map((action) => (
                            <Button
                                key={`composer-${action.key}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSending}
                                onClick={() => void onQuickActionClick(action)}
                                className="rounded-full border-[#E5E5E5] bg-white text-[#4E4B66] hover:bg-[#FAFAFA]">
                                {action.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#E9E9E9] bg-white p-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t("inputPlaceholder")}
                            className="h-11 w-full rounded-xl border-0 px-3 text-sm outline-none placeholder:text-[#A8A6BA]"
                        />
                        <Button
                            type="submit"
                            disabled={isSending || !input.trim()}
                            className="rounded-xl bg-[#FF5722] text-white hover:bg-[#e24d1e]">
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </form>
                <div ref={bottomAnchorRef} />
            </Container>
            {showScrollToBottom && (
                <Button
                    type="button"
                    onClick={() => scrollToBottom("smooth")}
                    className="fixed right-8 bottom-8 z-20 h-11 w-11 rounded-full bg-[#261E33] p-0 text-white shadow-lg hover:bg-[#1f1830]"
                    aria-label="Scroll to bottom">
                    <ChevronDown className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
}

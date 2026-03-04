"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { askGroupAi } from "../group.api";

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

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");

const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

const formatTime = (ts: number, locale: string) =>
    new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

function parseAIError(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    return "";
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
        async (question: string) => {
            const trimmed = question.trim();
            if (!trimmed || isSending) return;

            if (!groupId) {
                toast({ variant: "destructive", description: t("cannotDetectGroupId") });
                return;
            }

            const userMessage: ChatMessage = {
                id: `u_${Date.now()}`,
                role: "user",
                content: trimmed,
                createdAt: Date.now()
            };

            setMessages((prev) => [...prev, userMessage]);
            setInput("");
            setIsSending(true);

            try {
                const result = await askGroupAi({ groupId, question: trimmed });
                if (result.remainingRequests != null) {
                    setRemainingRequests(result.remainingRequests);
                }

                const assistantText = result.answer.answer?.trim() || t("emptyAiAnswer");

                setMessages((prev) => [
                    ...prev,
                    {
                        id: `a_${Date.now()}`,
                        role: "assistant",
                        content: assistantText,
                        createdAt: Date.now()
                    }
                ]);
            } catch (error) {
                toast({ variant: "destructive", description: parseAIError(error) || t("aiResponseError") });
            } finally {
                setIsSending(false);
            }
        },
        [groupId, isSending, toast, t]
    );

    const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        await sendQuestion(input);
    };

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-[#261E33] text-xl">AI Q&A</h2>
                    <div className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-1.5 text-[#6F6B99] text-sm">
                        {t("remainingRequests")}:{" "}
                        <span className="font-semibold text-[#261E33]">
                            {remainingRequests == null ? t("unknown") : remainingRequests}
                        </span>
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
                                    onClick={() => void sendQuestion(action.prompt)}
                                    className="rounded-xl border-[#E5E5E5] text-[#4E4B66] hover:bg-[#FAFAFA]">
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
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
                                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                                </div>
                                <p className="mt-1 text-[#9A98AE] text-xs">{formatTime(m.createdAt, locale)}</p>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={onSubmit} className="mt-6">
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
            </Container>
        </div>
    );
}

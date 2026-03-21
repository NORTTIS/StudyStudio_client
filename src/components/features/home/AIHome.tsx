"use client";

import { ChevronDown, Loader2, Send, Sparkles, Clock3, Flame, Gauge, ArrowUpRight, Stars } from "lucide-react";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import HomeTopTabs from "@/components/features/home/HomeTopTabs";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
};

type QuickAction = {
    key: string;
    title: string;
    description: string;
    prompt: string;
    icon: React.ReactNode;
};

type InlineNode = {
    type: "text" | "strong";
    value: string;
};

const quickActions: QuickAction[] = [
    {
        key: "today",
        title: "Việc hôm nay",
        description: "Tóm tắt những việc cá nhân cần ưu tiên trong ngày",
        prompt: "Hãy tóm tắt những việc cá nhân tôi nên ưu tiên hôm nay.",
        icon: <Clock3 className="h-4 w-4" />
    },
    {
        key: "plan",
        title: "Lên kế hoạch",
        description: "Sắp xếp thứ tự làm việc hợp lý cho hôm nay",
        prompt: "Hãy giúp tôi lập kế hoạch làm việc cá nhân cho hôm nay.",
        icon: <Gauge className="h-4 w-4" />
    },
    {
        key: "overdue",
        title: "Xử lý quá hạn",
        description: "Gợi ý cách xử lý các việc đang bị trễ",
        prompt: "Hãy gợi ý cách xử lý các công việc cá nhân đang quá hạn.",
        icon: <Flame className="h-4 w-4" />
    },
    {
        key: "focus",
        title: "Chọn việc để tập trung",
        description: "Xác định 3 việc quan trọng nhất lúc này",
        prompt: "Hãy giúp tôi chọn 3 việc quan trọng nhất để tập trung ngay bây giờ.",
        icon: <Stars className="h-4 w-4" />
    }
];

const initialMessages: ChatMessage[] = [];

const formatTime = (ts: number, locale: string) =>
    new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

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
            <ul key={`ul-${key++}`} className="space-y-2 pl-5 text-[15px] leading-7 text-[#3D3128] list-disc marker:text-[#FF8A65]">
                {listItems.map((item) => (
                    <li key={`li-${key++}-${item.slice(0, 16)}`}>{renderInline(item)}</li>
                ))}
            </ul>
        );

        listItems = [];
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
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
            <p key={`p-${key++}`} className="whitespace-pre-wrap text-[15px] leading-7 text-[#3D3128]">
                {renderInline(line)}
            </p>
        );
    }

    flushList();
    return <div className="space-y-2">{elements}</div>;
}

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

function GlassOrb({ className }: { className: string }) {
    return <div className={`absolute rounded-full blur-3xl ${className}`} />;
}

function QuickActionCard({
    action,
    disabled,
    onClick,
    index
}: {
    action: QuickAction;
    disabled: boolean;
    onClick: () => void;
    index: number;
}) {
    return (
        <motion.button
            type="button"
            disabled={disabled}
            onClick={onClick}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index, duration: 0.4 }}
            whileHover={{ y: -8, scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl transition disabled:opacity-60"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,171,122,0.28),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.2))] opacity-0 transition duration-500 group-hover:opacity-100" />
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-orange-100/30 blur-2xl opacity-0 transition duration-500 group-hover:opacity-100" />

            <div className="relative flex items-start gap-3">
                <motion.div
                    whileHover={{ rotate: 10, scale: 1.06 }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#FFF5ED_0%,#FFE7D5_100%)] text-[#F97316] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(249,115,22,0.12)]"
                >
                    {action.icon}
                </motion.div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-[#2B2118] text-sm">{action.title}</h3>
                        <ArrowUpRight className="h-4 w-4 text-[#C28D69] opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                    </div>
                    <p className="mt-1.5 text-[#7A6858] text-sm leading-6">{action.description}</p>
                </div>
            </div>
        </motion.button>
    );
}

function UsageCard({
    label,
    value,
    tone = "default",
    icon
}: {
    label: string;
    value: string;
    tone?: "default" | "accent" | "strong";
    icon: React.ReactNode;
}) {
    const styles = {
        default: "border-[#EDE3DA] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,244,238,0.82))]",
        accent: "border-orange-200 bg-[linear-gradient(180deg,rgba(255,247,241,0.96),rgba(255,236,224,0.92))]",
        strong: "border-[#DDD6FE] bg-[linear-gradient(180deg,rgba(245,243,255,0.95),rgba(237,233,254,0.88))]"
    };

    return (
        <motion.div
            whileHover={{ y: -6 }}
            transition={{ duration: 0.22 }}
            className={`group relative overflow-hidden rounded-[28px] border p-4 shadow-[0_16px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl ${styles[tone]}`}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,197,160,0.22),transparent_34%)]" />
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-white/50 blur-2xl" />

            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-[#8B7768]">{label}</p>
                    <p className="mt-2 font-semibold text-[26px] tracking-tight text-[#2B2118]">{value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-[#E86B34] shadow-sm">
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center gap-2 text-[#8C7A6B] text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <div className="flex items-center gap-1">
                <span>AI đang suy nghĩ</span>
                <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2 }}>.</motion.span>
                <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}>.</motion.span>
                <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}>.</motion.span>
            </div>
        </div>
    );
}

export default function AIHome() {
    const locale = "vi-VN";
    const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
    const [isComposerFocused, setIsComposerFocused] = React.useState(false);

    const bottomAnchorRef = React.useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = React.useRef(true);

    const [usedToday] = React.useState<number | null>(3);
    const [remaining] = React.useState<number | null>(17);
    const [dailyLimit] = React.useState<number | null>(20);

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

    const buildMockAnswer = React.useCallback((question: string) => {
        return (
            `Mình đã nhận câu hỏi: **${question}**.\n\n` +
            "Đây là giao diện **AI cá nhân** mẫu với phong cách cao cấp hơn.\n\n" +
            "Mình có thể hỗ trợ bạn:\n" +
            "- Tóm tắt việc cần làm trong ngày\n" +
            "- Gợi ý thứ tự ưu tiên cá nhân\n" +
            "- Nhắc những việc quá hạn hoặc gần deadline\n" +
            "- Hỗ trợ viết kế hoạch, ghi chú hoặc báo cáo ngắn\n\n" +
            "Khi bạn nối API thật, phần phản hồi này sẽ hiển thị dữ liệu thật từ hệ thống."
        );
    }, []);

    const sendQuestion = React.useCallback(
        async (question: string, userDisplayText?: string) => {
            const trimmed = question.trim();
            if (!trimmed || isSending) return;

            const now = Date.now();

            const userMessage: ChatMessage = {
                id: `u_${now}`,
                role: "user",
                content: userDisplayText?.trim() || trimmed,
                createdAt: now
            };

            const assistantMessageId = `a_${now + 1}`;

            setMessages((prev) => [
                ...prev,
                userMessage,
                {
                    id: assistantMessageId,
                    role: "assistant",
                    content: "",
                    createdAt: now + 1
                }
            ]);

            scrollToBottom("smooth");
            setInput("");
            setIsSending(true);

            try {
                await new Promise((resolve) => setTimeout(resolve, 900));
                const answer = buildMockAnswer(trimmed);

                setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, content: answer } : m)));
            } finally {
                setIsSending(false);
            }
        },
        [buildMockAnswer, isSending, scrollToBottom]
    );

    const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        await sendQuestion(input);
    };

    const onQuickActionClick = React.useCallback(
        async (action: QuickAction) => {
            await sendQuestion(action.prompt, action.title);
        },
        [sendQuestion]
    );

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#FFF4EE_0%,#F9EFEA_28%,#F3ECE8_52%,#EFEAF7_78%,#EDF3F8_100%)]">
            <div className="pointer-events-none absolute inset-0">
                <GlassOrb className="left-[-80px] top-[-40px] h-72 w-72 bg-orange-300/30" />
                <GlassOrb className="right-[-80px] top-[14%] h-80 w-80 bg-fuchsia-200/30" />
                <GlassOrb className="bottom-[-100px] left-[15%] h-96 w-96 bg-sky-200/25" />
                <GlassOrb className="left-[38%] top-[28%] h-72 w-72 bg-violet-200/20" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.18]" />
            </div>

            <Container className="relative pb-10 pt-8">
                <div className="space-y-8">
                    <SectionReveal>
                        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,170,120,0.28),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,139,250,0.18),transparent_34%),linear-gradient(135deg,rgba(255,243,234,0.92),rgba(255,255,255,0.72))]" />
                            <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

                            <div className="relative px-6 py-8 md:px-8 md:py-9">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.45 }}
                                    className="inline-flex items-center gap-2 rounded-full border border-orange-100/90 bg-white/85 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-[0_8px_20px_rgba(249,115,22,0.10)] backdrop-blur"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Personal AI
                                </motion.div>

                                <div className="mt-5 max-w-3xl">
                                    <h1 className="bg-[linear-gradient(135deg,#2B2118_0%,#7C3AED_55%,#0F766E_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-[44px]">
                                        Trợ lý AI cá nhân
                                    </h1>

                                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7A6858] md:text-[15px]">
                                        Một không gian riêng để bạn suy nghĩ rõ hơn, sắp xếp công việc gọn hơn và nhận hỗ trợ nhanh cho các đầu việc hằng ngày.
                                    </p>
                                </div>

                                <div className="mt-6">
                                    <HomeTopTabs />
                                </div>
                            </div>
                        </section>
                    </SectionReveal>

                    <SectionReveal delay={0.05}>
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <UsageCard label="Đã dùng hôm nay" value={usedToday == null ? "--" : String(usedToday)} tone="default" icon={<Clock3 className="h-4 w-4" />} />
                            <UsageCard label="Còn lại" value={remaining == null ? "--" : String(remaining)} tone="accent" icon={<Sparkles className="h-4 w-4" />} />
                            <UsageCard label="Giới hạn ngày" value={dailyLimit == null ? "--" : String(dailyLimit)} tone="strong" icon={<Gauge className="h-4 w-4" />} />
                        </section>
                    </SectionReveal>

                    <AnimatePresence mode="wait">
                        {messages.length === 0 ? (
                            <motion.section
                                key="empty"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.35 }}
                                className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.70),rgba(255,246,241,0.68))] px-8 py-10 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,188,140,0.12),transparent_30%)]" />

                                <div className="relative mx-auto max-w-3xl text-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.06, 1], rotate: [0, 4, 0] }}
                                        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                                        className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,#FFF4EA_0%,#FFE5D1_100%)] shadow-[0_20px_40px_rgba(255,107,53,0.14),inset_0_1px_0_rgba(255,255,255,0.95)]"
                                    >
                                        <Sparkles className="h-8 w-8 text-[#FF8A65]" />
                                    </motion.div>

                                    <h2 className="text-[31px] font-semibold text-[#2B2118] md:text-[40px]">Hôm nay bạn muốn AI giúp gì?</h2>

                                    <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#7A6858]">
                                        Bạn có thể hỏi về kế hoạch hôm nay, việc đang quá hạn, cách ưu tiên công việc hoặc nhấn vào một gợi ý bên dưới để bắt đầu nhanh.
                                    </p>
                                </div>

                                <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    {quickActions.map((action, index) => (
                                        <QuickActionCard
                                            key={action.key}
                                            action={action}
                                            disabled={isSending}
                                            index={index}
                                            onClick={() => void onQuickActionClick(action)}
                                        />
                                    ))}
                                </div>
                            </motion.section>
                        ) : (
                            <motion.section
                                key="chat"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.35 }}
                                className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(250,245,255,0.66))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-[#F4ECE6] pb-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#2B2118]">Cuộc trò chuyện cá nhân</h2>
                                        <p className="mt-1 text-sm text-[#9C8C80]">Nơi bạn trao đổi riêng với AI về công việc và kế hoạch của mình</p>
                                    </div>

                                    <div className="rounded-full border border-[#F3E6DB] bg-[#FFF8F3]/90 px-3 py-1 text-xs text-[#A06A43] shadow-sm backdrop-blur">
                                        Private space
                                    </div>
                                </div>

                                <div className="mt-5 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
                                    <AnimatePresence initial={false}>
                                        {messages.map((m) => (
                                            <motion.div
                                                key={m.id}
                                                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.26 }}
                                                className={m.role === "user" ? "ml-auto max-w-[92%] md:max-w-[72%]" : "max-w-[92%] md:max-w-[74%]"}
                                            >
                                                <div className={m.role === "user" ? "rounded-[24px] rounded-br-md border border-[#4A2E25] bg-[linear-gradient(135deg,#432818_0%,#7C2D12_45%,#7C3AED_100%)] px-4 py-3 text-white shadow-[0_18px_32px_rgba(43,33,24,0.22)]" : "rounded-[24px] rounded-bl-md border border-[#EFE6DE] bg-[linear-gradient(135deg,#FFFDFC_0%,#FFF7F2_58%,#F5F3FF_100%)] px-4 py-3 text-[#2B2118] shadow-[0_14px_28px_rgba(15,23,42,0.04)]"}>
                                                    {m.role === "assistant" && !m.content.trim() && isSending ? (
                                                        <TypingDots />
                                                    ) : m.role === "assistant" ? (
                                                        renderAssistantMarkdown(m.content)
                                                    ) : (
                                                        <p className="whitespace-pre-wrap text-sm leading-7">{m.content}</p>
                                                    )}
                                                </div>

                                                <p className="mt-1.5 px-1 text-xs text-[#AA9A8E]">{formatTime(m.createdAt, locale)}</p>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.section>
                        )}
                    </AnimatePresence>

                    <SectionReveal delay={0.08}>
                        <form onSubmit={onSubmit}>
                            <div className="mb-3 flex flex-wrap gap-2">
                                {quickActions.map((action) => (
                                    <Button
                                        key={`composer-${action.key}`}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isSending}
                                        onClick={() => void onQuickActionClick(action)}
                                        className="rounded-full border-[#EADFD6] bg-white/85 text-[#5E4E42] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#FFF8F3]"
                                    >
                                        {action.title}
                                    </Button>
                                ))}
                            </div>

                            <motion.div
                                animate={{
                                    boxShadow: isComposerFocused
                                        ? "0 26px 60px rgba(255,107,53,0.12)"
                                        : "0 16px 36px rgba(15,23,42,0.05)"
                                }}
                                className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,244,255,0.72))] p-3 backdrop-blur-2xl"
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,196,160,0.18),transparent_32%)]" />
                                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onFocus={() => setIsComposerFocused(true)}
                                        onBlur={() => setIsComposerFocused(false)}
                                        placeholder="Hỏi AI về công việc cá nhân của bạn..."
                                        className="min-h-[100px] w-full resize-none rounded-[22px] border-0 bg-transparent px-3 py-3 text-sm text-[#2B2118] outline-none placeholder:text-[#B0A296]"
                                    />

                                    <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}>
                                        <Button
                                            type="submit"
                                            disabled={isSending || !input.trim()}
                                            className="h-12 rounded-2xl bg-[linear-gradient(135deg,#FF6B35_0%,#F97316_38%,#8B5CF6_100%)] px-5 text-white shadow-[0_16px_28px_rgba(255,107,53,0.26)] transition hover:brightness-105"
                                        >
                                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </form>
                    </SectionReveal>

                    <div ref={bottomAnchorRef} />
                </div>
            </Container>

            <AnimatePresence>
                {showScrollToBottom && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            type="button"
                            onClick={() => scrollToBottom("smooth")}
                            className="fixed bottom-8 right-8 z-20 h-12 w-12 rounded-full border border-white/10 bg-[linear-gradient(135deg,#2B2118_0%,#4C1D95_100%)] p-0 text-white shadow-[0_18px_34px_rgba(43,33,24,0.30)] hover:bg-[#201812]"
                            aria-label="Scroll to bottom"
                        >
                            <ChevronDown className="h-5 w-5" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

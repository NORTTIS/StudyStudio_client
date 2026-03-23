"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    Bot,
    CheckCircle2,
    Clock3,
    Crown,
    Send,
    Settings,
    Sparkles,
    TrendingUp,
    Users
} from "lucide-react";
import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { components } from "@/api/types";

type StudioResponse = components["schemas"]["StudioResponse"];

type Message = {
    role: "user" | "ai";
    content: string;
};

type MasterTab = {
    key: "groups" | "ai" | "analytics" | "settings";
    label: string;
    icon: React.ElementType;
    active?: boolean;
    onClick?: () => void;
    disabled?: boolean;
};

function FloatingOrb({ className }: { className: string }) {
    return <div className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} />;
}

function SectionReveal({
    children,
    delay = 0
}: {
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

function TypingDots() {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-[#847768] text-sm shadow-sm backdrop-blur">
            <div className="flex items-center gap-1">
                <motion.span
                    className="h-2 w-2 rounded-full bg-orange-400"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                    className="h-2 w-2 rounded-full bg-orange-400"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0.12 }}
                />
                <motion.span
                    className="h-2 w-2 rounded-full bg-orange-400"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0.24 }}
                />
            </div>
            <span>AI Master đang suy nghĩ...</span>
        </div>
    );
}

function HeroStatCard({
    label,
    value,
    tone = "default",
    icon: Icon
}: {
    label: string;
    value: string;
    tone?: "default" | "accent" | "strong";
    icon: React.ElementType;
}) {
    const tones = {
        default:
            "border-[#EADFD6] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,244,238,0.82))]",
        accent:
            "border-orange-200 bg-[linear-gradient(180deg,rgba(255,247,241,0.98),rgba(255,236,224,0.92))]",
        strong:
            "border-violet-200 bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(237,233,254,0.9))]"
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.22 }}
            className={`group relative overflow-hidden rounded-[26px] border p-4 shadow-[0_18px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl ${tones[tone]}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_40%)] opacity-70" />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-[#8B7768]">{label}</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#2B2118]">{value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-[#E86B34] shadow-sm transition group-hover:scale-105">
                    <Icon className="h-4.5 w-4.5" />
                </div>
            </div>
        </motion.div>
    );
}

function ManagerStatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    tone = "default"
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    tone?: "default" | "orange" | "violet" | "red";
}) {
    const tones = {
        default:
            "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,240,0.88))] text-[#2B2233]",
        orange:
            "border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,247,241,0.98),rgba(255,238,226,0.92))] text-[#2B2233]",
        violet:
            "border-violet-200/80 bg-[linear-gradient(180deg,rgba(247,244,255,0.98),rgba(239,233,254,0.92))] text-[#2B2233]",
        red:
            "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,244,245,0.98),rgba(255,236,239,0.92))] text-[#2B2233]"
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={`relative overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl ${tones[tone]}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.7),transparent_40%)] opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs text-[#8C7D72]">{title}</p>
                    <p className="mt-2 text-[30px] font-semibold tracking-tight">{value}</p>
                    <p className="mt-1 text-sm text-[#7A6C61]">{subtitle}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/85 bg-white/80 text-[#EF6C2E] shadow-sm">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </motion.div>
    );
}

function AttentionCard() {
    const alerts = [
        {
            title: "3 task sắp quá hạn trong 24 giờ tới",
            desc: "Ưu tiên kiểm tra nhóm Toán nâng cao, Luyện thi IELTS và CLB Robotics.",
            tone: "orange"
        },
        {
            title: "2 nhóm có mức hoạt động giảm mạnh",
            desc: "AI gợi ý xem lại mức độ tương tác và phân công trưởng nhóm theo dõi.",
            tone: "violet"
        },
        {
            title: "Tỷ lệ hoàn thành tuần này đạt 78%",
            desc: "Cao hơn tuần trước 9%, nhưng vẫn có 4 đầu việc cần đẩy nhanh.",
            tone: "default"
        }
    ] as const;

    const toneClass = {
        orange: "border-orange-100 bg-orange-50/75",
        violet: "border-violet-100 bg-violet-50/75",
        default: "border-slate-200 bg-slate-50/80"
    };

    return (
        <div className="rounded-[30px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
                <div className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                    CẦN CHÚ Ý
                </div>
                <h3 className="font-semibold text-[#2B2233] text-lg">Tình hình hôm nay</h3>
            </div>

            <div className="space-y-3">
                {alerts.map((item, idx) => (
                    <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-2xl border p-4 ${toneClass[item.tone]}`}>
                        <p className="font-medium text-[#2B2233]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#7D6F64]">{item.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function QuickActionPanel({ onAsk }: { onAsk: (text: string) => void }) {
    const actions = [
        "Tóm tắt các nhóm cần chú ý nhất hôm nay",
        "Liệt kê task quá hạn cần xử lý ngay",
        "Phân tích hiệu suất các nhóm tuần này",
        "Gợi ý kế hoạch điều phối cho hôm nay"
    ];

    return (
        <div className="rounded-[30px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <h3 className="font-semibold text-[#2B2233] text-lg">Hành động nhanh</h3>
            <p className="mt-1 text-sm text-[#8C7C6F]">Các lệnh phổ biến dành cho quản lý.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {actions.map((item) => (
                    <motion.button
                        key={item}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => onAsk(item)}
                        className="rounded-[22px] border border-white/80 bg-white/85 p-4 text-left text-sm font-medium leading-6 text-[#32283A] shadow-sm transition hover:bg-orange-50 hover:text-orange-600">
                        {item}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

function InsightPanel({ onAsk }: { onAsk: (text: string) => void }) {
    const insights = [
        {
            label: "Nhóm yếu nhất",
            value: "2 nhóm",
            desc: "Cần hỗ trợ thêm trong 48h tới",
            action: "Cho tôi biết 2 nhóm yếu nhất hiện tại"
        },
        {
            label: "Task rủi ro",
            value: "12 task",
            desc: "Có khả năng trễ deadline",
            action: "Liệt kê các task rủi ro cao hiện tại"
        },
        {
            label: "Hiệu suất",
            value: "+9%",
            desc: "Tăng so với tuần trước",
            action: "Phân tích nguyên nhân tăng hiệu suất tuần này"
        }
    ];

    return (
        <div className="rounded-[30px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-[#2B2233] text-lg">Insight điều hành</h3>
                    <p className="mt-1 text-sm text-[#8C7C6F]">Điểm nổi bật giúp bạn nắm tình hình nhanh.</p>
                </div>
                <div className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#6D6258] shadow-sm">
                    AI Summary
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
                {insights.map((item, idx) => (
                    <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onAsk(item.action)}
                        className="rounded-[24px] border border-white/80 bg-white/88 p-4 text-left shadow-sm transition hover:bg-orange-50/70">
                        <p className="text-xs text-[#8B7E73]">{item.label}</p>
                        <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#2B2233]">{item.value}</p>
                        <p className="mt-1 text-sm text-[#7B6E64]">{item.desc}</p>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

function QuickPrompt({
    label,
    onClick
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={onClick}
            className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#6E635A] shadow-sm transition hover:bg-orange-50 hover:text-orange-600">
            {label}
        </motion.button>
    );
}

interface AIMasterProps {
    initialStudio?: StudioResponse | null;
}

export default function AIMaster({ initialStudio }: AIMasterProps) {
    const router = useRouter();
    const locale = useLocale();
    const params = useParams();

    const studioId = params.studioId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isComposerFocused, setIsComposerFocused] = useState(false);

    const [usedCount] = useState(12);
    const [maxCount] = useState(30);
    const remainingCount = Math.max(0, maxCount - usedCount);

    const studioDetailPath = useMemo(() => {
        if (!studioId) return null;
        return `/${locale}/master/${studioId}`;
    }, [locale, studioId]);

    const handleSend = async () => {
        const value = input.trim();
        if (!value || loading) return;

        setMessages((prev) => [...prev, { role: "user", content: value }]);
        setInput("");
        setLoading(true);

        setTimeout(() => {
            setMessages((prev) => [...prev, { role: "ai", content: "AI Master đang trả lời 🤖" }]);
            setLoading(false);
        }, 800);
    };

    const goToStudioTab = (tab: "groups" | "analytics" | "settings") => {
        if (!studioDetailPath) return;
        router.push(`${studioDetailPath}?tab=${tab}`);
    };

    const tabs: MasterTab[] = [
        {
            key: "groups",
            label: "Nhóm",
            icon: Users,
            onClick: () => goToStudioTab("groups"),
            disabled: !studioDetailPath
        },
        {
            key: "ai",
            label: "AI",
            icon: Bot,
            active: true
        },
        {
            key: "analytics",
            label: "Phân tích",
            icon: BarChart3,
            onClick: () => goToStudioTab("analytics"),
            disabled: !studioDetailPath
        },
        {
            key: "settings",
            label: "Cài đặt",
            icon: Settings,
            onClick: () => goToStudioTab("settings"),
            disabled: !studioDetailPath
        }
    ];

    const quickPrompts = [
        "Tóm tắt tình hình studio hôm nay",
        "Nhóm nào đang hoạt động nhiều nhất?",
        "Phân tích tiến độ task của studio",
        "Những vấn đề cần ưu tiên xử lý?"
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#FFF8F2_0%,#FFF6F1_28%,#F8F3FF_72%,#F6FAFC_100%)] px-4 py-5 md:px-6 md:py-6">
            <FloatingOrb className="left-[-90px] top-[-30px] h-72 w-72 bg-orange-200/35" />
            <FloatingOrb className="right-[-70px] top-[12%] h-80 w-80 bg-amber-200/30" />
            <FloatingOrb className="bottom-[-120px] left-[20%] h-96 w-96 bg-violet-200/25" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />

            <div className="relative mx-auto flex min-h-[calc(100vh-48px)] max-w-[1600px] flex-col gap-5">
                <SectionReveal>
                    <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/65 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.20),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,248,242,0.52))]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

                        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-start gap-4">
                                <motion.div
                                    whileHover={{ rotate: 4, scale: 1.04 }}
                                    transition={{ duration: 0.22 }}
                                    className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/80 bg-[linear-gradient(135deg,#FB923C_0%,#F97316_55%,#EA580C_100%)] text-white shadow-[0_18px_34px_rgba(249,115,22,0.26)]">
                                    <Bot className="h-8 w-8" />
                                </motion.div>

                                <div className="max-w-3xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Master AI Workspace
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                        <h1 className="bg-[linear-gradient(135deg,#261E33_0%,#7C3AED_55%,#EA580C_100%)] bg-clip-text text-[2rem] font-bold tracking-tight text-transparent md:text-[2.6rem]">
                                            AI Master
                                        </h1>
                                        <span className="rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1 font-semibold text-[11px] text-orange-700 shadow-sm">
                                            Studio Control
                                        </span>
                                    </div>

                                    <p className="mt-2 text-[#7C6A58] text-sm leading-7 md:text-[15px]">
                                        Bảng điều hành thông minh dành cho giáo viên, trưởng nhóm và người quản lý để nắm
                                        được tình hình studio, theo dõi tiến độ và ra quyết định nhanh hơn.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                                <HeroStatCard label="Đã dùng" value={String(usedCount)} tone="default" icon={Clock3} />
                                <HeroStatCard label="Còn lại" value={String(remainingCount)} tone="accent" icon={Sparkles} />
                                <HeroStatCard label="Giới hạn" value={String(maxCount)} tone="strong" icon={Crown} />
                            </div>
                        </div>
                    </div>
                </SectionReveal>

                <SectionReveal delay={0.04}>
                    <div className="flex flex-wrap items-center gap-3 rounded-[30px] border border-white/70 bg-white/65 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={tab.onClick}
                                    disabled={tab.disabled}
                                    className={[
                                        "relative inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-medium text-sm transition-all duration-300",
                                        tab.active
                                            ? "bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] text-white shadow-[0_14px_28px_rgba(249,115,22,0.28)]"
                                            : "text-slate-600 hover:bg-orange-50 hover:text-orange-600",
                                        tab.disabled ? "cursor-not-allowed opacity-50" : ""
                                    ].join(" ")}>
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </SectionReveal>

                <div className="grid flex-1 gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                    <SectionReveal delay={0.08}>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                                <ManagerStatCard
                                    title="Nhóm hoạt động"
                                    value="8"
                                    subtitle="2 nhóm nổi bật hôm nay"
                                    icon={Users}
                                    tone="default"
                                />
                                <ManagerStatCard
                                    title="Task quá hạn"
                                    value="12"
                                    subtitle="Cần ưu tiên xử lý"
                                    icon={AlertTriangle}
                                    tone="red"
                                />
                                <ManagerStatCard
                                    title="Cảnh báo"
                                    value="4"
                                    subtitle="Có dấu hiệu chậm tiến độ"
                                    icon={Clock3}
                                    tone="orange"
                                />
                                <ManagerStatCard
                                    title="Hoàn thành tuần"
                                    value="78%"
                                    subtitle="Tăng 9% so với tuần trước"
                                    icon={TrendingUp}
                                    tone="violet"
                                />
                            </div>

                            <AttentionCard />
                            <QuickActionPanel onAsk={(text) => setInput(text)} />
                            <InsightPanel onAsk={(text) => setInput(text)} />
                        </div>
                    </SectionReveal>

                    <SectionReveal delay={0.12}>
                        <div className="flex min-h-[72vh] flex-col overflow-hidden rounded-[36px] border border-white/70 bg-white/65 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                            <div className="relative border-b border-white/70 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.22),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,248,242,0.72))] px-5 py-5 md:px-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Live conversation
                                        </div>
                                        <h2 className="mt-3 font-semibold text-[#2B2233] text-[28px] tracking-tight">
                                            Studio Intelligence Chat
                                        </h2>
                                        <p className="mt-1 text-[#8C7C6F] text-sm md:text-[15px]">
                                            Hỏi AI Master về studio, nhóm, task, hiệu suất hoặc xin đề xuất điều phối.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-2 text-[#7D6F64] text-sm shadow-sm backdrop-blur">
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                            AI đang online
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-emerald-700 text-sm shadow-sm backdrop-blur">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Sẵn sàng hỗ trợ quản lý
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-6 md:px-6">
                                <AnimatePresence initial={false}>
                                    {messages.length === 0 ? (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex h-full min-h-[320px] items-center justify-center">
                                            <div className="max-w-3xl text-center">
                                                <motion.div
                                                    animate={{ scale: [1, 1.05, 1] }}
                                                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                                    className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,#FFF4EA_0%,#FFE5D1_100%)] shadow-[0_24px_44px_rgba(255,107,53,0.14),inset_0_1px_0_rgba(255,255,255,0.95)]">
                                                    <Bot className="h-10 w-10 text-[#FF8A65]" />
                                                </motion.div>

                                                <h3 className="text-[32px] font-semibold tracking-tight text-[#2B2233] md:text-[42px]">
                                                    Hôm nay bạn muốn AI Master hỗ trợ gì?
                                                </h3>
                                                <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#7D6F64] md:text-[18px]">
                                                    Bạn có thể hỏi về tình hình studio, nhóm, task, hiệu suất hoặc dùng các
                                                    gợi ý nhanh bên dưới để bắt đầu.
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((msg, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 12, scale: 0.985 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.25 }}
                                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                                    <div
                                                        className={`max-w-[82%] rounded-[26px] px-4 py-3.5 text-sm leading-7 shadow-sm md:text-[15px] ${msg.role === "user"
                                                            ? "rounded-br-md bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] text-white shadow-[0_18px_32px_rgba(249,115,22,0.22)]"
                                                            : "rounded-bl-md border border-white/80 bg-white/85 text-[#2B2233] backdrop-blur"
                                                            }`}>
                                                        {msg.content}
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {loading && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex justify-start">
                                                    <TypingDots />
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="border-t border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(250,245,255,0.72))] p-4 md:p-5">
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {quickPrompts.map((item) => (
                                        <QuickPrompt key={item} label={item} onClick={() => setInput(item)} />
                                    ))}
                                </div>

                                <div className="mb-4 rounded-[24px] border border-white/75 bg-white/65 px-4 py-3 shadow-sm backdrop-blur">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs text-[#8B7D71]">Trợ lý quản lý</p>
                                            <p className="mt-1 text-sm font-medium text-[#2B2233]">
                                                AI có thể giúp bạn tổng hợp, phân tích và đề xuất hành động tiếp theo.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setInput("Tôi nên ưu tiên xử lý việc gì hôm nay?")}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50/90 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100">
                                            Ưu tiên hôm nay
                                            <ArrowUpRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <motion.div
                                    animate={{
                                        boxShadow: isComposerFocused
                                            ? "0 26px 60px rgba(255,107,53,0.12)"
                                            : "0 16px 34px rgba(15,23,42,0.05)"
                                    }}
                                    className="rounded-[30px] border border-white/80 bg-white/82 p-3 backdrop-blur-2xl">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onFocus={() => setIsComposerFocused(true)}
                                            onBlur={() => setIsComposerFocused(false)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                            placeholder="Hỏi về studio của bạn..."
                                            className="min-h-[110px] w-full resize-none rounded-[22px] border-0 bg-transparent px-3 py-3 text-sm text-[#2B2233] outline-none placeholder:text-[#B0A296] md:text-[15px]"
                                        />

                                        <motion.button
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={handleSend}
                                            disabled={loading || !input.trim()}
                                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] px-5 font-semibold text-sm text-white shadow-[0_16px_28px_rgba(249,115,22,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
                                            <Send className="h-4 w-4" />
                                            Gửi
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </SectionReveal>
                </div>
            </div>
        </div>
    );
}
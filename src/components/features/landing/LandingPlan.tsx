"use client";

import {
    ArrowRight,
    Check,
    Crown,
    Layers,
    ShieldCheck,
    Sparkles,
    Star,
    User,
    Zap
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

function GlowOrb({ className }: { className: string }) {
    return <div className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} />;
}

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {children}
        </div>
    );
}

function PricingFeature({
    icon,
    children,
    highlight = false
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <li className="flex items-start gap-3 leading-7">
            <span
                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${highlight ? "bg-orange-100 text-orange-600" : "bg-[#F7F4F1] text-[#8B7768]"
                    }`}>
                {icon}
            </span>
            <span className={highlight ? "font-medium text-[#261E33]" : "text-[#5F5A73]"}>{children}</span>
        </li>
    );
}

function ValuePill({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-[#5F5A73] shadow-sm backdrop-blur">
            {children}
        </div>
    );
}

export default function LandingPlan() {
    const t = useTranslations("LandingPlanPage");
    const locale = useLocale();

    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#FFF8F1_0%,#FFFDFB_36%,#FFF4E8_72%,#FFFFFF_100%)] text-gray-800">
            <div className="pointer-events-none absolute inset-0">
                <GlowOrb className="left-[-120px] top-[-40px] h-[320px] w-[320px] bg-orange-200/35" />
                <GlowOrb className="right-[-100px] top-[120px] h-[280px] w-[280px] bg-amber-200/35" />
                <GlowOrb className="left-1/2 top-[360px] h-[440px] w-[960px] -translate-x-1/2 bg-orange-200/30 blur-[170px]" />
                <div
                    className="absolute inset-0 opacity-[0.035]"
                    style={{
                        backgroundImage: "radial-gradient(circle at 1px 1px, rgb(249 115 22) 1px, transparent 0)",
                        backgroundSize: "28px 28px"
                    }}
                />
            </div>

            <div className="relative z-10">
                <GuestNavbar />

                <section className="landing-fade-in px-6 pb-8 pt-14 text-center md:pb-10 md:pt-20">
                    <div className="mx-auto max-w-5xl">
                        <SectionBadge>{t("hero.title")}</SectionBadge>

                        <h1 className="landing-fade-up mt-6 font-extrabold text-4xl leading-[1.05] tracking-tight text-[#261E33] md:text-6xl">
                            {t("hero.title")}
                            <br />
                            <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_35%,#7C3AED_100%)] bg-clip-text text-transparent">
                                {t("hero.titleHighlight")}
                            </span>
                        </h1>

                        <p className="landing-fade-up landing-delay-1 mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#6F6B99] md:text-xl">
                            Chọn gói phù hợp để bắt đầu ngay hôm nay. Dễ bắt đầu với Free, mạnh mẽ bứt tốc với Premium.
                        </p>

                        <div className="landing-pop landing-delay-2 mt-8 flex flex-wrap items-center justify-center gap-3">
                            <ValuePill>Không ràng buộc dài hạn</ValuePill>
                            <ValuePill>Triển khai nhanh</ValuePill>
                            <ValuePill>Hỗ trợ AI thông minh</ValuePill>
                        </div>
                    </div>
                </section>

                <section className="landing-fade-up landing-delay-1 relative px-6 pb-24">
                    <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
                        {/* FREE PLAN */}
                        <div className="landing-pop relative rounded-[32px] border border-white/80 bg-white/82 px-8 py-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.10)] md:px-10 md:py-11">
                            <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F6F4] px-3 py-1 text-xs font-semibold text-[#7C6A5A]">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Starter
                                    </div>
                                    <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#261E33]">
                                        {t("freePlan.title")}
                                    </h2>
                                </div>

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#EEE6DE] bg-white shadow-sm">
                                    <User className="h-5 w-5 text-[#8B7768]" />
                                </div>
                            </div>

                            <div className="mt-6">
                                <p className="text-4xl font-extrabold tracking-tight text-[#261E33]">
                                    {t("freePlan.price")}
                                </p>
                                <p className="mt-3 max-w-md text-sm leading-7 text-[#6F6B99]">
                                    {t("freePlan.description")}
                                </p>
                            </div>

                            <Link href={`/${locale}/register`} className="mt-8 block">
                                <Button className="h-14 w-full rounded-full bg-[#F4F1EE] font-semibold text-[#261E33] shadow-sm transition-all duration-300 hover:bg-[#ECE6E0]">
                                    {t("freePlan.registerButton")}
                                </Button>
                            </Link>

                            <div className="my-8 h-px bg-[#EEE7E1]" />

                            <ul className="flex flex-col gap-5 text-left text-sm">
                                <PricingFeature icon={<Check size={16} />} highlight>
                                    {t("freePlan.feature1")}
                                </PricingFeature>

                                <PricingFeature icon={<Layers size={16} />}>
                                    {t("freePlan.feature2")}
                                </PricingFeature>

                                <PricingFeature icon={<User size={16} />}>
                                    {t("freePlan.feature3")}
                                </PricingFeature>

                                <PricingFeature icon={<ShieldCheck size={16} />}>
                                    {t("freePlan.feature4")}
                                </PricingFeature>

                                <PricingFeature icon={<Sparkles size={16} />}>
                                    {t("freePlan.feature5")}
                                </PricingFeature>
                            </ul>

                            <div className="mt-8 rounded-[24px] border border-[#F0E7DE] bg-[#FBFAF8] p-4">
                                <p className="text-sm leading-7 text-[#6F6B99]">
                                    Phù hợp để bắt đầu, trải nghiệm hệ thống và làm quen với cách quản lý công việc cơ bản.
                                </p>
                            </div>
                        </div>

                        {/* PREMIUM PLAN */}
                        <div className="landing-pop relative scale-[1.01] rounded-[36px] border border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,247,241,0.95))] px-8 py-10 shadow-[0_24px_70px_rgba(249,115,22,0.14)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_34px_90px_rgba(249,115,22,0.20)] md:px-10 md:py-11">
                            <div className="pointer-events-none absolute -inset-0.5 rounded-[38px] bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(124,58,237,0.12),rgba(255,255,255,0))]" />
                            <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] px-5 py-1.5 font-semibold text-sm text-white shadow-lg">
                                Most Popular
                            </div>

                            <div className="relative">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                            <Crown className="h-3.5 w-3.5" />
                                            Premium
                                        </div>
                                        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#261E33]">
                                            {t("premiumPlan.title")}
                                        </h2>
                                    </div>

                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-sm">
                                        <Zap className="h-5 w-5 text-orange-500" />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <p className="text-4xl font-extrabold tracking-tight text-[#261E33]">
                                        {t("premiumPlan.price")}
                                    </p>
                                    <p className="mt-3 max-w-md text-sm leading-7 text-[#6F6B99]">
                                        {t("premiumPlan.description")}
                                    </p>
                                </div>

                                <div className="mt-6 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#7C6A5A] shadow-sm">
                                        AI nâng cao
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#7C6A5A] shadow-sm">
                                        Nhiều quyền hơn
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#7C6A5A] shadow-sm">
                                        Tăng tốc quản lý
                                    </span>
                                </div>

                                <Link href={`/${locale}/register`} className="mt-8 block">
                                    <Button className="h-14 w-full rounded-full bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.24)] transition-all duration-300 hover:brightness-105">
                                        {t("premiumPlan.registerButton")}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>

                                <div className="my-8 h-px bg-orange-100" />

                                <ul className="flex flex-col gap-5 text-left text-sm">
                                    <PricingFeature icon={<Check size={16} />} highlight>
                                        {t("premiumPlan.feature1")}
                                    </PricingFeature>

                                    <PricingFeature icon={<Layers size={16} />} highlight>
                                        {t("premiumPlan.feature2")}
                                    </PricingFeature>

                                    <PricingFeature icon={<User size={16} />} highlight>
                                        {t("premiumPlan.feature3")}
                                    </PricingFeature>

                                    <PricingFeature icon={<ShieldCheck size={16} />} highlight>
                                        {t("premiumPlan.feature4")}
                                    </PricingFeature>

                                    <PricingFeature icon={<Sparkles size={16} />} highlight>
                                        {t("premiumPlan.feature5")}
                                    </PricingFeature>
                                </ul>

                                <div className="mt-8 rounded-[24px] border border-orange-100 bg-white/85 p-4">
                                    <div className="flex items-start gap-3">
                                        <Star className="mt-0.5 h-5 w-5 text-orange-500" />
                                        <p className="text-sm leading-7 text-[#5F5A73]">
                                            Dành cho người dùng muốn làm việc nghiêm túc hơn, cần nhiều công cụ mạnh hơn
                                            và muốn tối ưu toàn bộ quy trình học tập hoặc quản lý.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mx-auto mt-12 max-w-4xl text-center">
                        <p className="text-sm leading-7 text-[#6F6B99]">
                            Bắt đầu với Free bất cứ lúc nào, hoặc chọn Premium để mở khóa trải nghiệm đầy đủ và tăng tốc
                            hiệu quả ngay từ hôm nay.
                        </p>
                    </div>
                </section>

                <section className="px-6 pb-20">
                    <div className="mx-auto max-w-5xl rounded-[30px] border border-white/80 bg-white/70 px-6 py-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
                        <h3 className="text-2xl font-extrabold tracking-tight text-[#261E33]">
                            Chọn gói phù hợp và bắt đầu ngay
                        </h3>
                        <p className="mx-auto mt-3 max-w-2xl text-[#6F6B99] text-[15px] leading-7">
                            Từ trải nghiệm cơ bản đến hệ sinh thái mạnh mẽ hơn cho học tập, quản lý và cộng tác.
                        </p>

                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                            <Link href={`/${locale}/register`}>
                                <Button className="h-13 rounded-full bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] px-8 font-semibold text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)] transition-all duration-300 hover:brightness-105">
                                    Bắt đầu ngay
                                </Button>
                            </Link>

                            <Button
                                variant="outline"
                                className="h-13 rounded-full border-white/80 bg-white/80 px-8 font-semibold text-[#261E33] shadow-sm">
                                Xem thêm chi tiết
                            </Button>
                        </div>
                    </div>
                </section>

                <GuestFooter />
            </div>
        </div>
    );
}
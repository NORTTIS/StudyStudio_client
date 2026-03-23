"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

function FloatingOrb({ className }: { className: string }) {
    return <div className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {children}
        </div>
    );
}

function StepRailCard({
    index,
    text,
    delayClass
}: {
    index: number;
    text: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop group relative rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_50px_rgba(15,23,42,0.08)] ${delayClass}`}>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7C3AED_0%,#6D00FF_100%)] font-bold text-lg text-white shadow-[0_12px_24px_rgba(109,0,255,0.25)] transition-transform duration-300 group-hover:scale-105">
                    {index + 1}
                </div>
                <div className="pt-1">
                    <p className="text-base font-semibold leading-7 text-[#261E33]">{text}</p>
                </div>
            </div>
        </div>
    );
}

function FeatureSplitCard({
    title,
    description,
    delayClass
}: {
    title: string;
    description: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop rounded-[30px] border border-orange-100/70 bg-[linear-gradient(180deg,#FFF4EE_0%,#FFE0D5_100%)] p-8 shadow-[0_18px_40px_rgba(249,115,22,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(249,115,22,0.12)] ${delayClass}`}>
            <h3 className="text-2xl font-extrabold text-[#261E33]">{title}</h3>
            <div className="my-5 h-px bg-black/10" />
            <p className="whitespace-pre-line text-[15px] leading-8 text-[#4B5563] md:text-base">{description}</p>
        </div>
    );
}

function UseCaseCard({
    title,
    description,
    delayClass
}: {
    title: string;
    description: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop group relative overflow-hidden rounded-[32px] border border-orange-100/70 bg-[linear-gradient(180deg,#FFE9CB_0%,#FAD7A7_100%)] px-10 py-10 shadow-[0_18px_40px_rgba(245,158,11,0.10)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(245,158,11,0.14)] ${delayClass}`}>
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-white/30 blur-2xl" />
            <h3 className="text-center text-2xl font-extrabold text-[#261E33]">{title}</h3>
            <div className="my-6 h-px bg-black/10" />
            <p className="whitespace-pre-line text-center text-[16px] leading-8 text-[#374151] md:text-lg">
                {description}
            </p>
        </div>
    );
}

function AIPreviewCard({
    title,
    delayClass
}: {
    title: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop ${delayClass} flex h-full flex-col rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)]`}
        >
            <h4 className="min-h-[56px] text-[18px] font-semibold leading-7 text-gray-800 md:min-h-[64px]">
                {title}
            </h4>

            <div className="mt-6 rounded-[24px] border border-dashed border-gray-300 bg-[linear-gradient(180deg,#FAFAFA_0%,#F4F4F5_100%)] p-5 md:mt-auto">
                <div className="space-y-3">
                    <div className="h-4 w-1/2 rounded-full bg-gray-200" />
                    <div className="h-4 w-full rounded-full bg-gray-100" />
                    <div className="h-4 w-4/5 rounded-full bg-gray-100" />
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="h-24 rounded-2xl bg-white shadow-sm" />
                        <div className="h-24 rounded-2xl bg-white shadow-sm" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingGroup() {
    const t = useTranslations("LandingGroupPage");
    const locale = useLocale();
    const stepDelayClasses = ["landing-delay-1", "landing-delay-2", "landing-delay-3", "landing-delay-4"];

    const handleScrollToFeatures = () => {
        const section = document.getElementById("features");
        if (section) {
            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    };

    return (
        <div className="flex min-h-screen flex-col scroll-smooth bg-[linear-gradient(180deg,#FFF8F1_0%,#FFFDFB_36%,#FFF5E8_72%,#FFFFFF_100%)] text-gray-800">
            <GuestNavbar />

            <section className="landing-fade-in relative overflow-hidden pb-20 pt-14 md:pb-28 md:pt-18">
                <FloatingOrb className="left-[-100px] top-[120px] h-72 w-72 bg-orange-200/30" />
                <FloatingOrb className="right-[-80px] top-[160px] h-80 w-80 bg-fuchsia-200/20" />
                <FloatingOrb className="bottom-[-120px] left-[28%] h-96 w-96 bg-sky-200/20" />

                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-10 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
                        <div className="landing-fade-up">
                            <SectionLabel>Group collaboration</SectionLabel>

                            <h1 className="landing-fade-up landing-delay-1 mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-[#261E33] md:text-6xl xl:text-7xl">
                                {t("hero.title")}
                                <br />
                                <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_40%,#7C3AED_100%)] bg-clip-text text-transparent">
                                    {t("hero.titleHighlight")}
                                </span>
                            </h1>

                            <p className="landing-fade-up landing-delay-2 mt-6 max-w-2xl text-lg leading-8 text-[#6F6B99] md:text-xl">
                                Xây dựng không gian nhóm rõ ràng, phân công minh bạch, theo dõi tiến độ tập trung và
                                cộng tác hiệu quả hơn trong cùng một nơi.
                            </p>

                            <div className="landing-pop landing-delay-3 mt-8 flex flex-wrap gap-4">
                                <Link href={`/${locale}/group/create`} className="inline-block cursor-pointer">
                                    <Button className="h-14 rounded-full bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] px-9 text-base font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.24)] transition-all duration-300 hover:scale-[1.03] hover:brightness-105 active:scale-[0.98]">
                                        {t("hero.createButton")}
                                    </Button>
                                </Link>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleScrollToFeatures}
                                    className="h-14 rounded-full border-white/80 bg-white/75 px-8 text-base font-semibold text-gray-700 shadow-sm backdrop-blur transition-all duration-300 hover:scale-[1.03] hover:bg-white active:scale-[0.98]">
                                    {t("features.title")}
                                </Button>
                            </div>
                        </div>

                        <div className="landing-fade-up landing-delay-3 relative">
                            <div className="relative overflow-hidden rounded-[38px] border border-white/70 bg-white/70 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.18),transparent_34%)]" />

                                <div className="relative h-[320px] overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#FFF8F3_0%,#FFFFFF_100%)] md:h-[520px]">
                                    <Image
                                        src="/images/group.png"
                                        alt={t("hero.imageAlt")}
                                        fill
                                        priority
                                        className="object-cover object-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-fade-up relative bg-white py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-12 xl:grid-cols-[0.78fr_1.22fr]">
                        <div>
                            <SectionLabel>{t("howToUse.title")}</SectionLabel>
                            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                                {t("howToUse.title")}
                            </h2>
                            <p className="mt-4 max-w-md text-[16px] leading-8 text-[#6F6B99]">
                                Bắt đầu nhanh với quy trình ngắn gọn, rõ bước, phù hợp cho nhóm học tập, nhóm dự án
                                và nhóm cộng tác dài hạn.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {[t("howToUse.step1"), t("howToUse.step2"), t("howToUse.step3"), t("howToUse.step4")].map(
                                (text, i) => (
                                    <StepRailCard
                                        key={i}
                                        index={i}
                                        text={text}
                                        delayClass={stepDelayClasses[i]}
                                    />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section
                id="features"
                className="landing-fade-up relative bg-[linear-gradient(180deg,#FFF4E8_0%,#FFF9F4_100%)] py-24 scroll-mt-24"
            >
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-14 text-center">
                        <SectionLabel>{t("features.title")}</SectionLabel>
                        <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                            {t("features.title")}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <FeatureSplitCard
                            title={t("features.manageGroup.title")}
                            description={t("features.manageGroup.description")}
                            delayClass="landing-delay-1"
                        />
                        <FeatureSplitCard
                            title={t("features.trackWork.title")}
                            description={t("features.trackWork.description")}
                            delayClass="landing-delay-2"
                        />
                        <FeatureSplitCard
                            title={t("features.permissions.title")}
                            description={t("features.permissions.description")}
                            delayClass="landing-delay-3"
                        />
                        <FeatureSplitCard
                            title={t("features.aiSupport.title")}
                            description={t("features.aiSupport.description")}
                            delayClass="landing-delay-4"
                        />
                    </div>
                </div>
            </section>

            <section className="landing-fade-up relative bg-white py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <div>
                            <SectionLabel>{t("users.title")}</SectionLabel>
                            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                                {t("users.title")}
                            </h2>
                            <p className="landing-fade-up landing-delay-1 mt-4 max-w-xl text-[16px] leading-8 text-[#6F6B99]">
                                {t("users.subtitle")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            <UseCaseCard
                                title={t("users.personal.title")}
                                description={t("users.personal.description")}
                                delayClass="landing-delay-2"
                            />
                            <UseCaseCard
                                title={t("users.education.title")}
                                description={t("users.education.description")}
                                delayClass="landing-delay-3"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-fade-up relative bg-[linear-gradient(180deg,#FFF7EF_0%,#FFFFFF_100%)] py-24">
                <div className="mx-auto w-[90%] max-w-6xl">
                    <div className="text-center">
                        <SectionLabel>{t("ai.title")}</SectionLabel>
                        <h3 className="mt-6 text-center text-3xl font-bold tracking-tight text-[#261E33] md:text-5xl">
                            {t("ai.title")}
                            <br />
                            <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_40%,#7C3AED_100%)] bg-clip-text text-transparent">
                                {t("ai.subtitle")}
                            </span>
                        </h3>
                    </div>

                    <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <AIPreviewCard title={t("ai.feature1")} delayClass="landing-delay-1" />
                        <AIPreviewCard title={t("ai.feature2")} delayClass="landing-delay-2" />
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}
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

function PreviewFrame({
    src,
    alt,
    tone = "light"
}: {
    src: string;
    alt: string;
    tone?: "light" | "warm" | "glass";
}) {
    const tones = {
        light: "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] border-gray-200",
        warm: "bg-[linear-gradient(180deg,#FFF9F2_0%,#FFF2E8_100%)] border-orange-200/70",
        glass: "bg-white/55 border-white/70 backdrop-blur-xl"
    };

    return (
        <div
            className={`group relative overflow-hidden rounded-[30px] border shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_50px_rgba(15,23,42,0.08)] ${tones[tone]}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_35%)]" />

            <div className="relative h-[260px] w-full p-4 md:h-[340px] md:p-6">
                <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.02]"
                />
            </div>
        </div>
    );
}

function HeroPreviewFrame({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="group relative overflow-hidden rounded-[30px] border border-white/70 bg-white/55 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_50px_rgba(15,23,42,0.08)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_35%)]" />

            <div className="relative h-[300px] w-full p-4 md:h-[390px] md:p-6">
                <Image
                    src={src}
                    alt={alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.02]"
                />
            </div>
        </div>
    );
}

function AICard({
    title,
    description,
    delay = ""
}: {
    title: string;
    description: string;
    delay?: string;
}) {
    return (
        <div
            className={`landing-pop ${delay} flex h-full flex-col rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)]`}
        >
            <h4 className="text-[18px] font-semibold leading-8 text-gray-800">
                {title}
            </h4>

            <p className="mt-2 text-[15px] leading-7 text-gray-600">
                {description}
            </p>

            <div className="mt-6 rounded-[24px] border border-dashed border-gray-300 bg-[linear-gradient(180deg,#FAFAFA_0%,#F4F4F5_100%)] p-5 md:mt-auto">
                <div className="space-y-3">
                    <div className="h-4 w-2/3 rounded-full bg-gray-200" />
                    <div className="h-4 w-full rounded-full bg-gray-100" />
                    <div className="h-4 w-5/6 rounded-full bg-gray-100" />
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="h-24 rounded-2xl bg-white shadow-sm" />
                        <div className="h-24 rounded-2xl bg-white shadow-sm" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const t = useTranslations("LandingPage");
    const locale = useLocale();

    const fadeIn = "landing-fade-in";
    const fadeUp = "landing-fade-up";
    const pop = "landing-pop";
    const delay1 = "landing-delay-1";
    const delay2 = "landing-delay-2";
    const delay3 = "landing-delay-3";
    const delay4 = "landing-delay-4";
    const delay5 = "landing-delay-5";

    return (
        <div className="flex min-h-screen flex-col scroll-smooth bg-[linear-gradient(180deg,#FFF8F1_0%,#FFFDFB_35%,#FFF7ED_68%,#FFFFFF_100%)] text-gray-800">
            <GuestNavbar />

            <section className={`relative overflow-hidden py-20 ${fadeIn}`}>
                <FloatingOrb className="left-[-120px] top-[120px] h-72 w-72 bg-orange-200/30" />
                <FloatingOrb className="right-[-100px] top-[220px] h-80 w-80 bg-violet-200/25" />
                <FloatingOrb className="left-[20%] bottom-[-120px] h-96 w-96 bg-sky-200/20" />

                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        <div className="relative z-10">
                            <div
                                className={`inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur ${fadeUp}`}>
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                                Productivity Ecosystem
                            </div>

                            <h1
                                className={`mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 ${fadeUp} ${delay1} md:text-6xl xl:text-7xl`}>
                                {t("hero.title")}
                                <br />
                                <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_35%,#7C3AED_100%)] bg-clip-text text-transparent">
                                    {t("hero.subtitle")}
                                </span>
                            </h1>

                            <p
                                className={`mt-6 max-w-2xl text-lg leading-8 text-gray-600 ${fadeUp} ${delay2} md:text-xl`}>
                                {t("hero.description")}
                            </p>

                            <div className={`mt-8 flex flex-wrap items-center gap-4 ${pop} ${delay3}`}>
                                <Link href={`/${locale}/login`} className="inline-block cursor-pointer">
                                    <Button className="h-14 rounded-full bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] px-8 text-base font-semibold shadow-[0_16px_32px_rgba(249,115,22,0.24)] transition-all duration-300 hover:scale-[1.03] hover:brightness-105 active:scale-[0.98]">
                                        {t("hero.registerButton")}
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className={`${fadeUp} ${delay5}`}>
                            <HeroPreviewFrame src="/images/2.png" alt="Hero preview" />
                        </div>
                    </div>
                </div>
            </section>

            <section className={`relative py-24 text-center ${fadeUp}`}>
                <div className="mx-auto max-w-6xl px-6">
                    <h2 className={`text-3xl font-extrabold tracking-tight text-gray-800 ${fadeUp} md:text-5xl`}>
                        {t("architecture.title")}
                    </h2>
                    <p className={`mt-4 text-lg text-gray-600 ${fadeUp} ${delay1} md:text-xl`}>
                        {t("architecture.subtitle")}
                    </p>
                </div>
            </section>

            <section className={`relative py-10 ${fadeUp}`}>
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className={`${fadeUp} ${delay2}`}>
                            <div className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                                Management
                            </div>
                            <h3 className="mt-5 text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
                                {t("management.title")}
                            </h3>
                            <p className="mt-4 text-base leading-8 text-gray-600 md:text-lg">
                                {t("management.description")}
                            </p>

                            <div className={`mt-8 flex flex-wrap gap-4 ${pop} ${delay3}`}>
                                <Link href={`/${locale}/login`} className="cursor-pointer">
                                    <Button className="h-13 rounded-full bg-orange-500 px-7 font-semibold shadow-[0_14px_28px_rgba(249,115,22,0.22)] transition-all duration-300 hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                                        {t("management.createButton")}
                                    </Button>
                                </Link>

                                <Link href={`/${locale}/landing/management`} className="cursor-pointer">
                                    <Button className="h-13 rounded-full bg-gray-200 px-7 font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:bg-gray-300 hover:shadow-md active:scale-[0.98]">
                                        {t("management.learnMore")}
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className={`${fadeUp} ${delay4}`}>
                            <PreviewFrame src="/images/2.png" alt="Management preview" tone="glass" />
                        </div>
                    </div>
                </div>
            </section>

            <section className={`relative py-24 ${fadeUp}`}>
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className={`${fadeUp} ${delay2} order-2 lg:order-1`}>
                            <PreviewFrame src="/images/2.png" alt="Group preview" tone="warm" />
                        </div>

                        <div className={`${fadeUp} ${delay1} order-1 lg:order-2`}>
                            <div className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                                Group
                            </div>
                            <h3 className="mt-5 text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
                                {t("group.title")}
                            </h3>
                            <p className="mt-4 text-base leading-8 text-gray-600 md:text-lg">
                                {t("group.description")}
                            </p>

                            <div className={`mt-8 flex flex-wrap gap-4 ${pop} ${delay3}`}>
                                <Link href={`/${locale}/login`} className="cursor-pointer">
                                    <Button className="h-13 rounded-full bg-orange-500 px-7 font-semibold shadow-[0_14px_28px_rgba(249,115,22,0.22)] transition-all duration-300 hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                                        {t("group.createButton")}
                                    </Button>
                                </Link>

                                <Link href={`/${locale}/landing/group`} className="cursor-pointer">
                                    <Button className="h-13 rounded-full bg-[#EDEDED] px-7 font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:bg-[#E2E2E2] hover:shadow-md active:scale-[0.98]">
                                        {t("group.learnMore")}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={`relative py-24 ${fadeUp}`}>
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className={`${fadeUp} ${delay1}`}>
                            <div className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                                Personal
                            </div>
                            <h3 className="mt-5 text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
                                {t("personal.title")}
                            </h3>
                            <p className="mt-4 text-base leading-8 text-gray-600 md:text-lg">
                                {t("personal.description")}
                            </p>

                            <div className={`mt-8 flex flex-wrap gap-4 ${pop} ${delay3}`}>
                                <Link href={`/${locale}/login`} className="cursor-pointer">
                                    <Button className="h-13 rounded-full bg-orange-500 px-7 font-semibold shadow-[0_14px_28px_rgba(249,115,22,0.22)] transition-all duration-300 hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                                        {t("personal.createButton")}
                                    </Button>
                                </Link>

                                <Link href={`/${locale}/landing/personal`} className="cursor-pointer">
                                    <Button className="h-13 rounded-full bg-[#EDEDED] px-7 font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:bg-[#E2E2E2] hover:shadow-md active:scale-[0.98]">
                                        {t("personal.learnMore")}
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className={`${fadeUp} ${delay2}`}>
                            <PreviewFrame src="/images/2.png" alt="Personal preview" tone="light" />
                        </div>
                    </div>
                </div>
            </section>

            <section className={`relative bg-white py-24 ${fadeUp}`}>
                <div className="mx-auto w-[90%] max-w-6xl">
                    <h3 className={`text-center text-3xl font-bold tracking-tight text-gray-800 ${fadeUp} md:text-5xl`}>
                        {t("ai.title")}
                        <br />
                        <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_35%,#7C3AED_100%)] bg-clip-text text-transparent">
                            {t("ai.subtitle")}
                        </span>
                    </h3>

                    <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <AICard
                            title={t("ai.feature1")}
                            description={t("ai.feature1Description")}
                            delay={delay1}
                        />

                        <AICard
                            title={t("ai.feature2")}
                            description={t("ai.feature2Description")}
                            delay={delay2}
                        />
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}
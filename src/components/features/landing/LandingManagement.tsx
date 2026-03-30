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

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100/80 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {children}
        </div>
    );
}

function HeroStat({
    label,
    value
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[22px] border border-white/80 bg-white/78 p-4 text-center shadow-[0_14px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <p className="text-xs text-[#8B7768]">{label}</p>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-[#261E33]">{value}</p>
        </div>
    );
}

function TimelineCard({
    number,
    title,
    desc,
    delayClass
}: {
    number: number;
    title: string;
    desc: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop group relative overflow-hidden rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.08)] ${delayClass}`}>
            <div className="pointer-events-none absolute inset-y-0 left-8 w-px bg-gradient-to-b from-violet-300 via-orange-200 to-transparent" />
            <div className="flex items-start gap-5">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7C3AED_0%,#6D00FF_100%)] font-bold text-lg text-white shadow-[0_12px_24px_rgba(109,0,255,0.22)] transition-transform duration-300 group-hover:scale-105">
                    {number}
                </div>

                <div className="pt-1">
                    <h3 className="font-bold text-[#261E33] text-xl">{title}</h3>
                    <p className="mt-2 text-[#6F6B99] text-sm leading-7">{desc}</p>
                </div>
            </div>
        </div>
    );
}

function FeaturePanel({
    title,
    desc,
    tone = "orange",
    delayClass
}: {
    title: string;
    desc: string;
    tone?: "orange" | "violet";
    delayClass: string;
}) {
    const toneClass =
        tone === "orange"
            ? "bg-[linear-gradient(180deg,#FFF1EA_0%,#FFDCCF_100%)] border-orange-100/70"
            : "bg-[linear-gradient(180deg,#F5F0FF_0%,#E5D8FF_100%)] border-violet-100/70";

    return (
        <div
            className={`landing-pop rounded-[32px] border p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.10)] ${toneClass} ${delayClass}`}>
            <h3 className="max-w-md font-extrabold text-[#261E33] text-2xl leading-tight">{title}</h3>
            <div className="my-5 h-px bg-black/10" />
            <p className="max-w-xl text-[#4B5563] text-[15px] leading-8">{desc}</p>
        </div>
    );
}

function UseCaseCard({
    title,
    desc,
    delayClass
}: {
    title: string;
    desc: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop relative overflow-hidden rounded-[34px] border border-orange-100/70 bg-[linear-gradient(180deg,#FFE7C7_0%,#FAD7A7_100%)] px-10 py-10 shadow-[0_18px_40px_rgba(245,158,11,0.10)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(245,158,11,0.14)] ${delayClass}`}>
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-white/30 blur-2xl" />
            <h3 className="font-extrabold text-[#261E33] text-2xl">{title}</h3>
            <div className="my-6 h-px bg-black/10" />
            <p className="whitespace-pre-line text-[#374151] text-[16px] leading-8">{desc}</p>
        </div>
    );
}

export default function LandingManagement() {
    const t = useTranslations("LandingManagementPage");
    const locale = useLocale();

    const howToItems = [
        {
            title: t("howToUse.step1.title"),
            desc: t("howToUse.step1.description")
        },
        {
            title: t("howToUse.step2.title"),
            desc: t("howToUse.step2.description")
        },
        {
            title: t("howToUse.step3.title"),
            desc: t("howToUse.step3.description")
        },
        {
            title: t("howToUse.step4.title"),
            desc: t("howToUse.step4.description")
        }
    ];

    const featureItems = [
        {
            title: t("features.manageMembers.title"),
            desc: t("features.manageMembers.description"),
            tone: "orange" as const
        },
        {
            title: t("features.trackProgress.title"),
            desc: t("features.trackProgress.description"),
            tone: "violet" as const
        },
        {
            title: t("features.permissions.title"),
            desc: t("features.permissions.description"),
            tone: "violet" as const
        },
        {
            title: t("features.overview.title"),
            desc: t("features.overview.description"),
            tone: "orange" as const
        }
    ];

    const users = [
        {
            title: t("users.personal.title"),
            desc: t("users.personal.description")
        },
        {
            title: t("users.education.title"),
            desc: t("users.education.description")
        }
    ];

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
        <div className="flex min-h-screen flex-col scroll-smooth bg-[linear-gradient(180deg,#FFF8F1_0%,#FFFDFB_35%,#FFF5E8_72%,#FFFFFF_100%)] text-gray-800">
            <GuestNavbar />

            <section className="landing-fade-in relative overflow-hidden pb-20 pt-14 md:pb-28 md:pt-18">
                <FloatingOrb className="left-[-120px] top-[120px] h-72 w-72 bg-orange-200/30" />
                <FloatingOrb className="right-[-80px] top-[180px] h-80 w-80 bg-violet-200/25" />
                <FloatingOrb className="bottom-[-120px] left-[20%] h-96 w-96 bg-sky-200/20" />

                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-12 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="landing-fade-up relative z-10">
                            <SectionBadge>{t("badge")}</SectionBadge>

                            <h1 className="landing-fade-up landing-delay-1 mt-6 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-tight text-[#261E33] md:text-6xl xl:text-7xl">
                                {t("hero.title")}
                                <br />
                                <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_40%,#7C3AED_100%)] bg-clip-text text-transparent">
                                    {t("hero.titleHighlight")}
                                </span>
                            </h1>

                            <p className="landing-fade-up landing-delay-2 mt-6 max-w-2xl text-lg leading-8 text-[#6F6B99] md:text-xl">
                                {t("hero.description")}
                            </p>

                            <div className="landing-pop landing-delay-3 mt-8 flex flex-wrap items-center gap-4">
                                <Link href={`/${locale}/register`} className="inline-block cursor-pointer">
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
                            <div className="relative overflow-hidden rounded-[38px] border border-white/70 bg-white/72 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,190,140,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(196,181,253,0.18),transparent_34%)]" />

                                <div className="relative h-[340px] rounded-[28px] bg-[linear-gradient(180deg,#FFF8F3_0%,#FFFFFF_100%)] p-4 md:h-[520px]">
                                    <Image
                                        src="/images/management.png"
                                        alt={t("hero.imageAlt")}
                                        fill
                                        priority
                                        className="object-contain object-center p-2"
                                    />
                                </div>

                                <div className="absolute bottom-6 left-6 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
                                    <p className="text-xs text-[#8B7768]">{t("hero.executiveLabel")}</p>
                                    <p className="mt-1 font-semibold text-[#261E33] text-sm">{t("hero.executiveCaption")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-fade-up relative bg-[linear-gradient(180deg,#FFF3E6_0%,#FFF8F2_100%)] py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <SectionBadge>{t("howToUse.title")}</SectionBadge>
                            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                                {t("howToUse.title")}
                            </h2>
                        </div>

                        <p className="max-w-xl text-[#6F6B99] text-[16px] leading-8">
                            {t("howToUse.description")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {howToItems.map((item, i) => (
                            <TimelineCard
                                key={i}
                                number={i + 1}
                                title={item.title}
                                desc={item.desc}
                                delayClass={`landing-delay-${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section id="features" className="landing-fade-up relative bg-white py-24 scroll-mt-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-14 text-center">
                        <SectionBadge>{t("features.title")}</SectionBadge>
                        <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                            {t("features.title")}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                            <FeaturePanel
                                title={featureItems[0].title}
                                desc={featureItems[0].desc}
                                tone={featureItems[0].tone}
                                delayClass="landing-delay-1"
                            />
                            <FeaturePanel
                                title={featureItems[1].title}
                                desc={featureItems[1].desc}
                                tone={featureItems[1].tone}
                                delayClass="landing-delay-2"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                            <FeaturePanel
                                title={featureItems[2].title}
                                desc={featureItems[2].desc}
                                tone={featureItems[2].tone}
                                delayClass="landing-delay-3"
                            />
                            <FeaturePanel
                                title={featureItems[3].title}
                                desc={featureItems[3].desc}
                                tone={featureItems[3].tone}
                                delayClass="landing-delay-4"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-fade-up relative bg-[linear-gradient(180deg,#FFF3E6_0%,#FFF9F4_100%)] py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-14 text-center">
                        <SectionBadge>{t("users.title")}</SectionBadge>
                        <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                            {t("users.title")}
                        </h2>
                        <p className="landing-fade-up landing-delay-1 mx-auto mt-4 max-w-2xl text-[#6F6B99] text-lg leading-8">
                            {t("users.subtitle")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <UseCaseCard
                            title={users[0].title}
                            desc={users[0].desc}
                            delayClass="landing-delay-2"
                        />
                        <UseCaseCard
                            title={users[1].title}
                            desc={users[1].desc}
                            delayClass="landing-delay-3"
                        />
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}
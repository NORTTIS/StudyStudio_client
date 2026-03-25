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
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {children}
        </div>
    );
}

function StepCard({
    number,
    title,
    description,
    delayClass
}: {
    number: string;
    title: string;
    description: string;
    delayClass: string;
}) {
    return (
        <div
            className={`landing-pop group rounded-[28px] border border-white/70 bg-white/70 p-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.08)] ${delayClass}`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C3AED_0%,#6D00FF_100%)] font-bold text-2xl text-white shadow-[0_10px_24px_rgba(109,0,255,0.28)] transition-transform duration-300 group-hover:scale-105">
                {number}
            </div>

            <h3 className="mt-6 text-2xl font-bold text-[#261E33] md:text-[28px]">{title}</h3>

            <p className="mt-3 whitespace-pre-line text-[16px] leading-8 text-[#6F6B99] md:text-lg">
                {description}
            </p>
        </div>
    );
}

function FeatureCard({
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
            className={`landing-pop group rounded-[30px] border border-orange-100/80 bg-[linear-gradient(180deg,#FFF1EC_0%,#FFE1D7_100%)] p-8 shadow-[0_18px_40px_rgba(249,115,22,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(249,115,22,0.12)] ${delayClass}`}>
            <h3 className="text-center text-2xl font-extrabold text-[#261E33]">{title}</h3>

            <div className="my-5 h-px bg-black/10" />

            <p className="whitespace-pre-line text-center text-[15px] leading-8 text-[#4B5563] md:text-base">
                {description}
            </p>
        </div>
    );
}

function AudienceCard({
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
            className={`landing-pop rounded-[32px] border border-orange-100/70 bg-[linear-gradient(180deg,#FFE7C7_0%,#FAD7A7_100%)] px-10 py-9 shadow-[0_18px_40px_rgba(245,158,11,0.10)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(245,158,11,0.14)] ${delayClass}`}>
            <h3 className="text-center text-2xl font-extrabold text-[#261E33]">{title}</h3>

            <div className="my-6 h-px bg-black/10" />

            <p className="whitespace-pre-line text-center text-[16px] leading-8 text-[#374151] md:text-lg">
                {description}
            </p>
        </div>
    );
}

export default function LandingPage() {
    const t = useTranslations("LandingPersonalPage");
    const locale = useLocale();

    const stepDelayClasses = ["landing-delay-1", "landing-delay-2", "landing-delay-3"];
    const featureDelayClasses = [
        "landing-delay-1",
        "landing-delay-2",
        "landing-delay-3",
        "landing-delay-4"
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
        <div className="flex min-h-screen flex-col scroll-smooth bg-[linear-gradient(180deg,#FFF8F1_0%,#FFFDFB_38%,#FFF6EA_70%,#FFFFFF_100%)] text-gray-800">
            <GuestNavbar />

            <section className="landing-fade-in relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden py-16 md:py-24">
                <Image
                    src="/images/personal.png"
                    alt={t("hero.imageAlt")}
                    fill
                    priority
                    className="object-cover object-center"
                />

                <FloatingOrb className="left-[-100px] top-[120px] h-72 w-72 bg-orange-200/30" />
                <FloatingOrb className="right-[-80px] top-[180px] h-80 w-80 bg-violet-200/25" />
                <FloatingOrb className="bottom-[-100px] left-[20%] h-96 w-96 bg-sky-200/20" />

                <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center lg:px-8">
                    <div className="landing-fade-up">
                        <SectionBadge>Personal workspace</SectionBadge>

                        <h1 className="landing-fade-up landing-delay-1 mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 md:text-6xl xl:text-7xl">
                            {t("hero.title")}
                            <br />
                            <span className="bg-[linear-gradient(135deg,#EA580C_0%,#F97316_40%,#7C3AED_100%)] bg-clip-text text-transparent">
                                {t("hero.titleHighlight")}
                            </span>
                        </h1>

                        <p className="landing-fade-up landing-delay-2 mt-6 max-w-2xl text-lg leading-8 text-[#6F6B99] md:text-xl">
                            {t("hero.subtitle")}
                            <br />
                            {t("hero.subtitleExtra")}
                        </p>

                        <div className="landing-pop landing-delay-3 mt-8 flex flex-wrap items-center justify-center gap-4">
                            <Link href={`/${locale}/register`} className="inline-block cursor-pointer">
                                <Button className="h-14 rounded-full bg-[linear-gradient(135deg,#F97316_0%,#EA580C_45%,#DC2626_100%)] px-8 text-base font-semibold shadow-[0_16px_32px_rgba(249,115,22,0.24)] transition-all duration-300 hover:scale-[1.03] hover:brightness-105 active:scale-[0.98]">
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
                </div>
            </section>

            <section className="landing-fade-up relative bg-[linear-gradient(180deg,#FFF4E8_0%,#FFF8F2_100%)] py-24">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <SectionBadge>{t("howToUse.title")}</SectionBadge>
                        <h2 className="landing-fade-up mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                            {t("howToUse.title")}
                        </h2>
                    </div>

                    <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
                        <StepCard
                            number="1"
                            title={t("howToUse.step1.title")}
                            description={t("howToUse.step1.description")}
                            delayClass={stepDelayClasses[0]}
                        />
                        <StepCard
                            number="2"
                            title={t("howToUse.step2.title")}
                            description={t("howToUse.step2.description")}
                            delayClass={stepDelayClasses[1]}
                        />
                        <StepCard
                            number="3"
                            title={t("howToUse.step3.title")}
                            description={t("howToUse.step3.description")}
                            delayClass={stepDelayClasses[2]}
                        />
                    </div>
                </div>
            </section>

            <section id="features" className="landing-fade-up relative bg-white py-24">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <SectionBadge>{t("features.title")}</SectionBadge>
                        <h2 className="landing-fade-up mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                            {t("features.title")}
                        </h2>
                    </div>

                    <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
                        <FeatureCard
                            title={t("features.smartNotes.title")}
                            description={t("features.smartNotes.description")}
                            delayClass={featureDelayClasses[0]}
                        />
                        <FeatureCard
                            title={t("features.aiSupport.title")}
                            description={t("features.aiSupport.description")}
                            delayClass={featureDelayClasses[1]}
                        />
                        <FeatureCard
                            title={t("features.schedule.title")}
                            description={t("features.schedule.description")}
                            delayClass={featureDelayClasses[2]}
                        />
                        <FeatureCard
                            title={t("features.progress.title")}
                            description={t("features.progress.description")}
                            delayClass={featureDelayClasses[3]}
                        />
                    </div>
                </div>
            </section>

            <section className="landing-fade-up relative bg-[linear-gradient(180deg,#FFF4E8_0%,#FFF9F4_100%)] py-24">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <SectionBadge>{t("users.title")}</SectionBadge>
                        <h2 className="landing-fade-up mt-6 text-4xl font-extrabold tracking-tight text-[#261E33] md:text-5xl">
                            {t("users.title")}
                        </h2>

                        <p className="landing-fade-up landing-delay-1 mt-4 text-lg text-[#6F6B99]">
                            {t("users.subtitle")}
                        </p>
                    </div>

                    <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
                        <AudienceCard
                            title={t("users.students.title")}
                            description={t("users.students.description")}
                            delayClass="landing-delay-2"
                        />

                        <AudienceCard
                            title={t("users.selfLearners.title")}
                            description={t("users.selfLearners.description")}
                            delayClass="landing-delay-3"
                        />
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}
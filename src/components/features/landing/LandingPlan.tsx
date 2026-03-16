"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, User, Sparkles, Layers, ShieldCheck } from "lucide-react";

import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

export default function LandingPlan() {
    const t = useTranslations("LandingPlanPage");
    const locale = useLocale();

    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-orange-50 via-white to-orange-100 text-gray-800">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-120px] top-[-80px] h-[280px] w-[280px] rounded-full bg-orange-200/40 blur-3xl" />
                <div className="absolute right-[-100px] top-[120px] h-[260px] w-[260px] rounded-full bg-amber-200/40 blur-3xl" />
                <div className="absolute left-1/2 top-[320px] h-[420px] w-[920px] -translate-x-1/2 rounded-full bg-orange-200/40 blur-[160px]" />
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

                {/* HERO */}
                <section className="landing-fade-in px-6 py-20 text-center md:py-24">
                    <h1 className="landing-fade-up text-4xl font-extrabold leading-tight text-gray-700 md:text-6xl">
                        {t("hero.title")} <br />
                        <span className="text-orange-500">{t("hero.titleHighlight")}</span>
                    </h1>
                </section>

                {/* PRICING */}
                <section className="landing-fade-up landing-delay-1 relative px-6 pb-20">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch lg:gap-10">
                        {/* ================= FREE PLAN ================= */}
                        <div className="landing-pop w-full max-w-[420px] rounded-2xl border border-orange-300 bg-white/80 px-8 py-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(249,115,22,0.18)] md:px-12 md:py-12">
                            <h2 className="text-2xl font-extrabold text-gray-700">{t("freePlan.title")}</h2>

                            <p className="mt-2 text-lg font-bold text-orange-500">{t("freePlan.price")}</p>

                            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                                {t("freePlan.description")}
                            </p>

                            <Link href={`/${locale}/register`}>
                                <Button className="mt-8 w-[65%] rounded-full bg-orange-500 py-6 text-lg font-semibold transition-transform duration-300 hover:scale-[1.03] hover:bg-orange-600">
                                    {t("freePlan.registerButton")}
                                </Button>
                            </Link>

                            <ul className="mt-12 flex flex-col gap-6 text-left text-sm text-gray-600">
                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <Check size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("freePlan.feature1")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <Layers size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("freePlan.feature2")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <User size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("freePlan.feature3")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <ShieldCheck size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("freePlan.feature4")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <Sparkles size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("freePlan.feature5")}</span>
                                </li>
                            </ul>
                        </div>

                        {/* ================= PREMIUM PLAN ================= */}
                        <div className="landing-pop relative w-full max-w-[420px] rounded-2xl border border-orange-300 bg-white/85 px-8 py-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(249,115,22,0.18)] md:px-12 md:py-12">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-sm font-semibold text-white shadow-md">
                                Most Popular
                            </div>

                            <h2 className="text-2xl font-extrabold text-gray-700">{t("premiumPlan.title")}</h2>

                            <p className="mt-2 text-lg font-bold text-orange-500">{t("premiumPlan.price")}</p>

                            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                                {t("premiumPlan.description")}
                            </p>

                            <Link href={`/${locale}/register`}>
                                <Button className="mt-8 w-[65%] rounded-full bg-orange-500 py-6 text-lg font-semibold transition-transform duration-300 hover:scale-[1.03] hover:bg-orange-600">
                                    {t("premiumPlan.registerButton")}
                                </Button>
                            </Link>

                            <ul className="mt-12 flex flex-col gap-6 text-left text-sm text-gray-600">
                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <Check size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("premiumPlan.feature1")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <Sparkles size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("premiumPlan.feature2")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <User size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("premiumPlan.feature3")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <ShieldCheck size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("premiumPlan.feature4")}</span>
                                </li>

                                <li className="flex items-start gap-3 leading-7">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                                        <Layers size={18} className="text-orange-500" />
                                    </span>
                                    <span>{t("premiumPlan.feature5")}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="py-16" />

                <GuestFooter />
            </div>
        </div>
    );
}

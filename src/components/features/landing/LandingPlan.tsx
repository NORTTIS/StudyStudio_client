"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

export default function LandingPlan() {
    const t = useTranslations("LandingPlanPage");
    const locale = useLocale();

    return (
        <div className="flex min-h-screen flex-col bg-white text-gray-800">
            <GuestNavbar />

            <section className="landing-fade-in py-20 text-center">
                <h1 className="landing-fade-up font-extrabold text-5xl text-gray-700 md:text-6xl">
                    {t("hero.title")} <br />
                    {t("hero.titleHighlight")}
                </h1>
            </section>

            {/* ================= PRICING CARDS ================= */}
            <section className="landing-fade-up landing-delay-1 bg-white">
                <div className="mx-auto flex max-w-6xl justify-between gap-24 px-16">
                    {/* ===== FREE PLAN ===== */}
                    <div className="landing-pop landing-delay-2 w-[460px] rounded-2xl border border-orange-500 px-14 py-12 text-center">
                        <h2 className="font-extrabold text-2xl text-gray-700">{t("freePlan.title")}</h2>

                        <p className="mt-2 font-bold text-lg text-orange-500">{t("freePlan.price")}</p>

                        <p className="mt-4 whitespace-pre-line text-gray-500 text-sm leading-relaxed">
                            {t("freePlan.description")}
                        </p>

                        <Link href={`/${locale}/register`} className="cursor-pointer">
                            <Button className="mt-8 w-[65%] rounded-full bg-orange-500 py-6 font-semibold text-lg transition-transform duration-300 hover:scale-[1.03] hover:bg-orange-600">
                                {t("freePlan.registerButton")}
                            </Button>
                        </Link>

                        <ul className="mt-12 flex flex-col items-center gap-7 text-gray-600 text-sm">
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                {t("freePlan.feature1")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                {t("freePlan.feature2")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">👤</span>
                                {t("freePlan.feature3")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                {t("freePlan.feature4")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✦</span>
                                {t("freePlan.feature5")}
                            </li>
                        </ul>
                    </div>

                    {/* ===== PREMIUM PLAN ===== */}
                    <div className="landing-pop landing-delay-3 w-[460px] rounded-2xl border border-orange-500 px-14 py-12 text-center">
                        <h2 className="font-extrabold text-2xl text-gray-700">{t("premiumPlan.title")}</h2>

                        <p className="mt-2 font-bold text-lg text-orange-500">{t("premiumPlan.price")}</p>

                        <p className="mt-4 whitespace-pre-line text-gray-500 text-sm leading-relaxed">
                            {t("premiumPlan.description")}
                        </p>

                        <Link href={`/${locale}/register`} className="cursor-pointer">
                            <Button className="mt-8 w-[65%] rounded-full bg-orange-500 py-6 font-semibold text-lg transition-transform duration-300 hover:scale-[1.03] hover:bg-orange-600">
                                {t("premiumPlan.registerButton")}
                            </Button>
                        </Link>

                        <ul className="mt-12 flex flex-col items-center gap-7 text-gray-600 text-sm">
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                {t("premiumPlan.feature1")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                {t("premiumPlan.feature2")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">👤</span>
                                {t("premiumPlan.feature3")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                {t("premiumPlan.feature4")}
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✦</span>
                                {t("premiumPlan.feature5")}
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="bg-white py-28" />

            <GuestFooter />
        </div>
    );
}

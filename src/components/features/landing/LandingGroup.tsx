"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

export default function LandingGroup() {
    const t = useTranslations("LandingGroupPage");
    const locale = useLocale();
    const stepDelayClasses = ["landing-delay-1", "landing-delay-2", "landing-delay-3", "landing-delay-4"];

    return (
        <div className="flex min-h-screen scroll-smooth flex-col bg-[#FFF7ED] text-gray-800">
            <GuestNavbar />

            <section className="landing-fade-in bg-white py-20">
                <div className="landing-fade-up mx-auto max-w-5xl px-6 text-center">
                    <h1 className="landing-fade-up landing-delay-1 text-5xl leading-tight font-extrabold text-gray-700 md:text-6xl">
                        {t("hero.title")} <br />
                        {t("hero.titleHighlight")}
                    </h1>

                    <Link
                        href={`/${locale}/group/create`}
                        className="landing-pop landing-delay-2 inline-block cursor-pointer"
                    >
                        <Button className="mt-8 rounded-full bg-orange-500 px-20 py-7 text-lg font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                            {t("hero.createButton")}
                        </Button>
                    </Link>
                </div>

                <div className="landing-fade-up landing-delay-3 mx-auto mt-12 flex max-w-5xl justify-center px-6">
                    <div className="overflow-hidden rounded-3xl">
                        <Image
                            src="/images/group.png"
                            alt={t("hero.imageAlt")}
                            width={900}
                            height={600}
                            priority
                            className="w-full max-w-[900px] object-contain transition-transform duration-[1400ms] ease-out hover:scale-[1.015]"
                        />
                    </div>
                </div>
            </section>

            <section className="landing-fade-up bg-[#FFF3E6] py-24">
                <h2 className="landing-fade-up px-6 text-center text-5xl font-extrabold text-gray-700">
                    {t("howToUse.title")}
                </h2>

                <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-4">
                    {[t("howToUse.step1"), t("howToUse.step2"), t("howToUse.step3"), t("howToUse.step4")].map(
                        (text, i) => (
                            <div
                                key={i}
                                className={`landing-pop flex flex-col items-center rounded-2xl px-4 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/40 ${stepDelayClasses[i]}`}
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6D00FF] text-lg font-bold text-white shadow-sm transition-transform duration-300 ease-out hover:scale-105">
                                    {i + 1}
                                </div>

                                <p className="mt-4 text-base leading-snug font-semibold text-black">{text}</p>
                            </div>
                        )
                    )}
                </div>

                <div className="landing-fade-up landing-delay-4 mx-auto mt-16 flex h-105 w-[85%] items-center justify-center rounded-2xl border-2 border-orange-300 bg-white/20 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md" />
            </section>

            <section className="landing-fade-up bg-white py-24">
                <h2 className="landing-fade-up px-6 text-center text-5xl font-extrabold text-gray-700">
                    {t("features.title")}
                </h2>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-16 gap-y-14 px-6 md:grid-cols-2">
                    <div className="landing-pop landing-delay-1 rounded-3xl bg-[#FFD9D2] px-10 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <h3 className="text-2xl font-extrabold text-black">{t("features.manageGroup.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-lg leading-relaxed text-black">
                            {t("features.manageGroup.description")}
                        </p>
                    </div>

                    <div className="landing-pop landing-delay-2 rounded-3xl bg-[#FFD9D2] px-10 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <h3 className="text-2xl font-extrabold text-black">{t("features.trackWork.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-lg leading-relaxed text-black">
                            {t("features.trackWork.description")}
                        </p>
                    </div>

                    <div className="landing-pop landing-delay-3 rounded-3xl bg-[#FFD9D2] px-10 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <h3 className="text-2xl font-extrabold text-black">{t("features.permissions.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-lg leading-relaxed text-black">
                            {t("features.permissions.description")}
                        </p>
                    </div>

                    <div className="landing-pop landing-delay-4 rounded-3xl bg-[#FFD9D2] px-10 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <h3 className="text-2xl font-extrabold text-black">{t("features.aiSupport.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-lg leading-relaxed text-black">
                            {t("features.aiSupport.description")}
                        </p>
                    </div>
                </div>
            </section>

            <section className="landing-fade-up bg-[#FFF3E6] py-24">
                <h2 className="landing-fade-up px-6 text-center text-4xl font-extrabold text-gray-700">
                    {t("users.title")}
                </h2>

                <p className="landing-fade-up landing-delay-1 mt-3 px-6 text-center text-lg text-gray-500">
                    {t("users.subtitle")}
                </p>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
                    <div className="landing-pop landing-delay-2 rounded-3xl bg-[#FAD7A7] px-12 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <h3 className="text-2xl font-extrabold text-black">{t("users.personal.title")}</h3>

                        <div className="my-6 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-center text-lg leading-relaxed text-black">
                            {t("users.personal.description")}
                        </p>
                    </div>

                    <div className="landing-pop landing-delay-3 rounded-3xl bg-[#FAD7A7] px-12 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <h3 className="text-2xl font-extrabold text-black">{t("users.education.title")}</h3>

                        <div className="my-6 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-center text-lg leading-relaxed text-black">
                            {t("users.education.description")}
                        </p>
                    </div>
                </div>
            </section>

            <section className="landing-fade-up bg-white py-20">
                <div className="mx-auto w-[90%] max-w-6xl">
                    <h3 className="landing-fade-up text-center text-2xl font-bold text-gray-800 md:text-3xl">
                        {t("ai.title")} <br />
                        {t("ai.subtitle")}
                    </h3>

                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="landing-pop landing-delay-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                            <h4 className="font-semibold text-gray-800">{t("ai.feature1")}</h4>
                            <div className="mt-6 h-60 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all duration-300 hover:bg-gray-100" />
                        </div>

                        <div className="landing-pop landing-delay-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                            <h4 className="font-semibold text-gray-800">{t("ai.feature2")}</h4>
                            <div className="mt-6 h-60 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all duration-300 hover:bg-gray-100" />
                        </div>
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}
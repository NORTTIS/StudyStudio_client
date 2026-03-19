"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

export default function LandingManagement() {
    const t = useTranslations("LandingManagementPage");
    const locale = useLocale();

    return (
        <div className="flex min-h-screen flex-col scroll-smooth bg-[#FFF7ED] text-gray-800">
            <GuestNavbar />

            <section className="landing-fade-in bg-white py-20">
                <div className="landing-fade-up mx-auto max-w-5xl px-6 text-center">
                    <h1 className="landing-fade-up landing-delay-1 font-extrabold text-5xl text-gray-700 leading-tight md:text-6xl">
                        {t("hero.title")} <br />
                        {t("hero.titleHighlight")}
                    </h1>

                    <Link
                        href={`/${locale}/register`}
                        className="landing-pop landing-delay-2 inline-block cursor-pointer">
                        <Button className="mt-8 rounded-full bg-orange-500 px-20 py-7 font-semibold text-lg text-white shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                            {t("hero.createButton")}
                        </Button>
                    </Link>
                </div>

                <div className="landing-fade-up landing-delay-3 mx-auto mt-12 flex max-w-5xl justify-center px-6">
                    <div className="overflow-hidden rounded-3xl">
                        <Image
                            src="/images/management.png"
                            alt={t("hero.imageAlt")}
                            width={950}
                            height={650}
                            priority
                            className="w-full max-w-[950px] object-contain transition-transform duration-[1400ms] ease-out hover:scale-[1.015]"
                        />
                    </div>
                </div>
            </section>

            <section className="landing-fade-up bg-[#FFF3E6] py-24">
                <h2 className="landing-fade-up px-6 text-center font-extrabold text-5xl text-gray-700">
                    {t("howToUse.title")}
                </h2>

                <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-4">
                    {[
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
                    ].map((item, i) => (
                        <div
                            key={i}
                            className={`landing-pop landing-delay-${i + 1} flex flex-col items-center rounded-2xl px-4 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/40`}>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-lg text-white shadow-sm transition-transform duration-300 ease-out hover:scale-105">
                                {i + 1}
                            </div>

                            <h3 className="mt-4 font-extrabold text-black text-lg">{item.title}</h3>

                            <p className="mt-2 text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="landing-fade-up landing-delay-4 mx-auto mt-16 flex h-[420px] w-[85%] items-center justify-center rounded-2xl border-2 border-orange-300 bg-white/20 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md" />
            </section>

            <section className="landing-fade-up bg-white py-24">
                <h2 className="landing-fade-up px-6 text-center font-extrabold text-5xl text-gray-700">
                    {t("features.title")}
                </h2>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-16 gap-y-14 px-6 md:grid-cols-2">
                    {[
                        {
                            title: t("features.manageMembers.title"),
                            desc: t("features.manageMembers.description")
                        },
                        {
                            title: t("features.trackProgress.title"),
                            desc: t("features.trackProgress.description")
                        },
                        {
                            title: t("features.permissions.title"),
                            desc: t("features.permissions.description")
                        },
                        {
                            title: t("features.overview.title"),
                            desc: t("features.overview.description")
                        }
                    ].map((item, i) => (
                        <div
                            key={i}
                            className={`landing-pop landing-delay-${i + 1} rounded-3xl bg-[#FFD9D2] px-10 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg`}>
                            <h3 className="font-extrabold text-2xl text-black">{item.title}</h3>

                            <div className="my-5 h-px bg-black/20" />

                            <p className="text-black text-lg leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="landing-fade-up bg-[#FFF3E6] py-24">
                <h2 className="landing-fade-up px-6 text-center font-extrabold text-4xl text-gray-700">
                    {t("users.title")}
                </h2>

                <p className="landing-fade-up landing-delay-1 mt-3 px-6 text-center text-gray-500 text-lg">
                    {t("users.subtitle")}
                </p>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
                    {[
                        {
                            title: t("users.personal.title"),
                            desc: t("users.personal.description")
                        },
                        {
                            title: t("users.education.title"),
                            desc: t("users.education.description")
                        }
                    ].map((item, i) => (
                        <div
                            key={i}
                            className={`landing-pop landing-delay-${i + 2} rounded-3xl bg-[#FAD7A7] px-12 py-10 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg`}>
                            <h3 className="font-extrabold text-2xl text-black">{item.title}</h3>

                            <div className="my-6 h-px bg-black/20" />

                            <p className="whitespace-pre-line text-black text-lg leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}

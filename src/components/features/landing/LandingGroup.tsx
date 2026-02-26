/** biome-ignore-all lint/a11y/useValidAnchor: <explanation> */
/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
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

    return (
        <div className="flex min-h-screen flex-col bg-[#FFF7ED] text-gray-800">
            <GuestNavbar />

            <section className="bg-white py-20">
                <div className="mx-auto max-w-5xl text-center">
                    <h1 className="font-extrabold text-5xl text-gray-700 leading-tight md:text-6xl">
                        {t("hero.title")} <br />
                        {t("hero.titleHighlight")}
                    </h1>

                    <Link href={`/${locale}/group/create`} className="cursor-pointer">
                        <Button className="mt-8 rounded-full bg-orange-500 px-20 py-7 font-semibold text-lg text-white hover:bg-orange-600">
                            {t("hero.createButton")}
                        </Button>
                    </Link>
                </div>

                <div className="mx-auto mt-12 flex max-w-5xl justify-center">
                    <Image
                        src="/images/group.png"
                        alt={t("hero.imageAlt")}
                        width={900}
                        height={600}
                        priority
                        className="w-full max-w-[900px] object-contain"
                    />
                </div>
            </section>

            <section className="bg-[#FFF3E6] py-24">
                <h2 className="text-center font-extrabold text-5xl text-gray-700">{t("howToUse.title")}</h2>

                <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-4">
                    {[t("howToUse.step1"), t("howToUse.step2"), t("howToUse.step3"), t("howToUse.step4")].map(
                        (text, i) => (
                            <div key={i} className="flex flex-col items-center text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-lg text-white">
                                    {i + 1}
                                </div>

                                <p className="mt-4 font-semibold text-base text-black leading-snug">{text}</p>
                            </div>
                        )
                    )}
                </div>

                <div className="mx-auto mt-16 flex h-[420px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent" />
            </section>

            <section className="bg-white py-24">
                <h2 className="text-center font-extrabold text-5xl text-gray-700">{t("features.title")}</h2>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-16 gap-y-14 px-6 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.manageGroup.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-black text-lg leading-relaxed">
                            {t("features.manageGroup.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.trackWork.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-black text-lg leading-relaxed">
                            {t("features.trackWork.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.permissions.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-black text-lg leading-relaxed">
                            {t("features.permissions.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.aiSupport.title")}</h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-black text-lg leading-relaxed">
                            {t("features.aiSupport.description")}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-[#FFF3E6] py-24">
                <h2 className="text-center font-extrabold text-4xl text-gray-700">{t("users.title")}</h2>

                <p className="mt-3 text-center text-gray-500 text-lg">{t("users.subtitle")}</p>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("users.personal.title")}</h3>

                        <div className="my-6 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-center text-black text-lg leading-relaxed">
                            {t("users.personal.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("users.education.title")}</h3>

                        <div className="my-6 h-px bg-black/20" />

                        <p className="whitespace-pre-line text-center text-black text-lg leading-relaxed">
                            {t("users.education.description")}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-white py-20">
                <div className="mx-auto w-[90%] max-w-6xl">
                    <h3 className="text-center font-bold text-2xl text-gray-800 md:text-3xl">
                        {t("ai.title")} <br />
                        {t("ai.subtitle")}
                    </h3>

                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-800">{t("ai.feature1")}</h4>
                            <div className="mt-6 h-[240px] rounded-lg border-2 border-gray-300 border-dashed bg-gray-50" />
                        </div>

                        <div className="rounded-xl border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-800">{t("ai.feature2")}</h4>
                            <div className="mt-6 h-[240px] rounded-lg border-2 border-gray-300 border-dashed bg-gray-50" />
                        </div>
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}

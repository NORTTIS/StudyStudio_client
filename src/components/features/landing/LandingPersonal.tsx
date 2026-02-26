"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
    const t = useTranslations("LandingPersonalPage");
    const locale = useLocale();

    return (
        <div className="flex min-h-screen flex-col bg-[#FFF7ED] text-gray-800">
            <GuestNavbar />

            <section className="relative min-h-[80vh] overflow-hidden bg-white">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/personal.png" alt={t("hero.imageAlt")} fill className="object-cover" priority />
                </div>

                <div className="relative z-10 mx-auto max-w-4xl pt-16 text-center">
                    <h1 className="font-extrabold text-5xl text-gray-900 leading-tight md:text-6xl">
                        {t("hero.title")} <br />
                        {t("hero.titleHighlight")}
                    </h1>

                    <p className="mx-auto mt-5 max-w-3xl text-gray-600 text-lg md:text-xl">
                        {t("hero.subtitle")} <br />
                        {t("hero.subtitleExtra")}
                    </p>

                    <Link href={`/${locale}/register`} className="cursor-pointer">
                        <Button className="mt-7 rounded-full bg-orange-500 px-8 py-6 font-semibold text-lg hover:bg-orange-600">
                            {t("hero.createButton")}
                        </Button>
                    </Link>
                </div>
            </section>

            <section className="bg-[#FFF3E6] py-24">
                <h2 className="text-center font-extrabold text-5xl text-gray-700">{t("howToUse.title")}</h2>
                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-40 gap-y-20 px-6 md:grid-cols-2">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
                            1
                        </div>

                        <h3 className="mt-6 font-extrabold text-3xl text-black">{t("howToUse.step1.title")}</h3>

                        <p className="mt-3 whitespace-pre-line text-gray-500 text-xl leading-relaxed">
                            {t("howToUse.step1.description")}
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
                            2
                        </div>

                        <h3 className="mt-6 font-extrabold text-3xl text-black">{t("howToUse.step2.title")}</h3>

                        <p className="mt-3 whitespace-pre-line text-gray-500 text-xl leading-relaxed">
                            {t("howToUse.step2.description")}
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
                            3
                        </div>

                        <h3 className="mt-6 font-extrabold text-3xl text-black">{t("howToUse.step3.title")}</h3>

                        <p className="mt-3 whitespace-pre-line text-gray-500 text-xl leading-relaxed">
                            {t("howToUse.step3.description")}
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
                            4
                        </div>

                        <h3 className="mt-6 font-extrabold text-3xl text-black">{t("howToUse.step4.title")}</h3>

                        <p className="mt-3 whitespace-pre-line text-gray-500 text-xl leading-relaxed">
                            {t("howToUse.step4.description")}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-white py-24">
                <h2 className="text-center font-extrabold text-5xl text-gray-600">{t("features.title")}</h2>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-20 gap-y-16 px-6 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.smartNotes.title")}</h3>

                        <div className="my-5 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-base text-black leading-relaxed">
                            {t("features.smartNotes.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.tasks.title")}</h3>

                        <div className="my-5 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-base text-black leading-relaxed">
                            {t("features.tasks.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.documents.title")}</h3>

                        <div className="my-5 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-base text-black leading-relaxed">
                            {t("features.documents.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.aiSupport.title")}</h3>

                        <div className="my-5 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-base text-black leading-relaxed">
                            {t("features.aiSupport.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.schedule.title")}</h3>

                        <div className="my-5 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-base text-black leading-relaxed">
                            {t("features.schedule.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="font-extrabold text-2xl text-black">{t("features.progress.title")}</h3>

                        <div className="my-5 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-base text-black leading-relaxed">
                            {t("features.progress.description")}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-[#FFF3E6] py-24">
                <h2 className="text-center font-extrabold text-4xl text-gray-700">{t("users.title")}</h2>

                <p className="mt-3 text-center text-gray-500 text-lg">{t("users.subtitle")}</p>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10">
                        <h3 className="text-center font-extrabold text-2xl text-black">{t("users.students.title")}</h3>

                        <div className="my-6 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-center text-black text-lg leading-relaxed">
                            {t("users.students.description")}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10">
                        <h3 className="text-center font-extrabold text-2xl text-black">
                            {t("users.selfLearners.title")}
                        </h3>

                        <div className="my-6 h-px bg-black/15" />

                        <p className="whitespace-pre-line text-center text-black text-lg leading-relaxed">
                            {t("users.selfLearners.description")}
                        </p>
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}

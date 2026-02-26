/** biome-ignore-all lint/a11y/useValidAnchor: <explanation> */
/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GuestFooter } from "@/components/layout/GuestFooter";
import { GuestNavbar } from "@/components/layout/GuestNavbar";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
    const t = useTranslations("LandingPage");
    const locale = useLocale();

    return (
        <div className="flex min-h-screen flex-col bg-[#FFF7ED] text-gray-800">
            <GuestNavbar />

            <section className="relative min-h-[80vh] overflow-hidden bg-white">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/2.png" alt="Hero background" fill priority className="object-cover" />
                </div>

                <div className="relative z-10 mx-auto -mt-8 max-w-4xl pt-16 text-center">
                    <h1 className="font-extrabold text-5xl text-gray-900 leading-tight md:text-6xl">
                        {t("hero.title")} <br />
                        {t("hero.subtitle")}
                    </h1>

                    <p className="mx-auto mt-5 max-w-3xl text-gray-600 text-lg md:text-xl">{t("hero.description")}</p>

                    <Link href={`/${locale}/register`} className="cursor-pointer">
                        <Button className="mt-7 rounded-full bg-orange-500 px-8 py-6 font-semibold text-lg hover:bg-orange-600">
                            {t("hero.registerButton")}
                        </Button>
                    </Link>
                </div>
            </section>

            <section className="bg-[#FFF7ED] py-20 text-center">
                <h2 className="font-extrabold text-3xl text-gray-800 md:text-4xl">{t("architecture.title")}</h2>
                <p className="mt-2 text-gray-600 text-lg md:text-xl">{t("architecture.subtitle")}</p>

                <div className="mt-14">
                    <h3 className="font-bold text-2xl text-gray-800 md:text-3xl">{t("management.title")}</h3>
                    <p className="mt-2 text-base text-gray-600 md:text-lg">{t("management.description")}</p>

                    <div className="mx-auto mt-8 flex h-[340px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent" />

                    <div className="mt-8 flex justify-center gap-4">
                        <Link href={`/${locale}/register`} className="cursor-pointer">
                            <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold hover:bg-orange-600">
                                {t("management.createButton")}
                            </Button>
                        </Link>

                        <Button className="cursor-pointer rounded-full bg-gray-200 px-7 py-5 font-semibold text-gray-700 hover:bg-gray-300">
                            {t("management.learnMore")}
                        </Button>
                    </div>
                </div>
            </section>

            <section className="bg-white py-20 text-center">
                <h3 className="font-bold text-2xl text-gray-800 md:text-3xl">{t("group.title")}</h3>
                <p className="mt-2 text-base text-gray-600 md:text-lg">{t("group.description")}</p>

                <div className="mx-auto mt-8 flex h-[340px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-[#FFF7ED]" />

                <div className="mt-8 flex justify-center gap-4">
                    <Link href={`/${locale}/register`} className="cursor-pointer">
                        <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold hover:bg-orange-600">
                            {t("group.createButton")}
                        </Button>
                    </Link>

                    <Button className="cursor-pointer rounded-full bg-[#EDEDED] px-7 py-5 font-semibold text-gray-700 hover:bg-[#E2E2E2]">
                        {t("group.learnMore")}
                    </Button>
                </div>
            </section>

            <section className="bg-[#FFF7ED] py-20 text-center">
                <h3 className="font-bold text-2xl text-gray-800 md:text-3xl">{t("personal.title")}</h3>
                <p className="mt-2 text-base text-gray-600 md:text-lg">{t("personal.description")}</p>

                <div className="mx-auto mt-8 flex h-[340px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent" />

                <div className="mt-8 flex justify-center gap-4">
                    <Link href={`/${locale}/register`} className="cursor-pointer">
                        <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold hover:bg-orange-600">
                            {t("personal.createButton")}
                        </Button>
                    </Link>

                    <Button className="cursor-pointer rounded-full bg-[#EDEDED] px-7 py-5 font-semibold text-gray-700 hover:bg-[#E2E2E2]">
                        {t("personal.learnMore")}
                    </Button>
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

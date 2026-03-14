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

    const fadeIn = "landing-fade-in";
    const fadeUp = "landing-fade-up";
    const pop = "landing-pop";
    const delay1 = "landing-delay-1";
    const delay2 = "landing-delay-2";
    const delay3 = "landing-delay-3";
    const delay4 = "landing-delay-4";
    const delay5 = "landing-delay-5";

    return (
        <div className="flex min-h-screen scroll-smooth flex-col bg-[#FFF7ED] text-gray-800">
            <GuestNavbar />

            <section className={`relative min-h-[80vh] overflow-hidden bg-white ${fadeIn}`}>
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <Image
                        src="/images/2.png"
                        alt="Hero background"
                        fill
                        priority
                        className="object-cover transition-transform duration-[1600ms] ease-out hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/5" />
                </div>

                <div className={`relative z-10 mx-auto -mt-8 max-w-4xl px-6 pt-16 text-center ${fadeUp}`}>
                    <h1
                        className={`text-5xl leading-tight font-extrabold text-gray-900 ${fadeUp} ${delay1} md:text-6xl`}
                    >
                        {t("hero.title")} <br />
                        {t("hero.subtitle")}
                    </h1>

                    <p className={`mx-auto mt-5 max-w-3xl text-lg text-gray-600 ${fadeUp} ${delay2} md:text-xl`}>
                        {t("hero.description")}
                    </p>

                    <Link
                        href={`/${locale}/register`}
                        className={`inline-block cursor-pointer ${pop} ${delay3}`}
                    >
                        <Button className="mt-7 rounded-full bg-orange-500 px-8 py-6 text-lg font-semibold shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                            {t("hero.registerButton")}
                        </Button>
                    </Link>
                </div>
            </section>

            <section className={`bg-[#FFF7ED] py-20 text-center ${fadeUp}`}>
                <h2 className={`text-3xl font-extrabold text-gray-800 ${fadeUp} md:text-4xl`}>
                    {t("architecture.title")}
                </h2>
                <p className={`mt-2 text-lg text-gray-600 ${fadeUp} ${delay1} md:text-xl`}>
                    {t("architecture.subtitle")}
                </p>

                <div className="mt-14 px-6">
                    <h3 className={`text-2xl font-bold text-gray-800 ${fadeUp} ${delay2} md:text-3xl`}>
                        {t("management.title")}
                    </h3>
                    <p className={`mt-2 text-base text-gray-600 ${fadeUp} ${delay3} md:text-lg`}>
                        {t("management.description")}
                    </p>

                    <div
                        className={`mx-auto mt-8 flex h-85 w-[85%] items-center justify-center rounded-2xl border-2 border-orange-300 bg-white/30 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md ${fadeUp} ${delay4}`}
                    />

                    <div className={`mt-8 flex justify-center gap-4 ${pop} ${delay5}`}>
                        <Link href={`/${locale}/login`} className="cursor-pointer">
                            <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                                {t("management.createButton")}
                            </Button>
                        </Link>

                        <Button className="cursor-pointer rounded-full bg-gray-200 px-7 py-5 font-semibold text-gray-700 shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-gray-300 hover:shadow-md active:scale-[0.98]">
                            {t("management.learnMore")}
                        </Button>
                    </div>
                </div>
            </section>

            <section className={`bg-white py-20 text-center ${fadeUp}`}>
                <div className="px-6">
                    <h3 className={`text-2xl font-bold text-gray-800 ${fadeUp} md:text-3xl`}>
                        {t("group.title")}
                    </h3>
                    <p className={`mt-2 text-base text-gray-600 ${fadeUp} ${delay1} md:text-lg`}>
                        {t("group.description")}
                    </p>

                    <div
                        className={`mx-auto mt-8 flex h-85 w-[85%] items-center justify-center rounded-2xl border-2 border-orange-300 bg-[#FFF7ED] shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md ${fadeUp} ${delay2}`}
                    />

                    <div className={`mt-8 flex justify-center gap-4 ${pop} ${delay3}`}>
                        <Link href={`/${locale}/login`} className="cursor-pointer">
                            <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                                {t("group.createButton")}
                            </Button>
                        </Link>

                        <Button className="cursor-pointer rounded-full bg-[#EDEDED] px-7 py-5 font-semibold text-gray-700 shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-[#E2E2E2] hover:shadow-md active:scale-[0.98]">
                            {t("group.learnMore")}
                        </Button>
                    </div>
                </div>
            </section>

            <section className={`bg-[#FFF7ED] py-20 text-center ${fadeUp}`}>
                <div className="px-6">
                    <h3 className={`text-2xl font-bold text-gray-800 ${fadeUp} md:text-3xl`}>
                        {t("personal.title")}
                    </h3>
                    <p className={`mt-2 text-base text-gray-600 ${fadeUp} ${delay1} md:text-lg`}>
                        {t("personal.description")}
                    </p>

                    <div
                        className={`mx-auto mt-8 flex h-85 w-[85%] items-center justify-center rounded-2xl border-2 border-orange-300 bg-transparent shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md ${fadeUp} ${delay2}`}
                    />

                    <div className={`mt-8 flex justify-center gap-4 ${pop} ${delay3}`}>
                        <Link href={`/${locale}/login`} className="cursor-pointer">
                            <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]">
                                {t("personal.createButton")}
                            </Button>
                        </Link>

                        <Button className="cursor-pointer rounded-full bg-[#EDEDED] px-7 py-5 font-semibold text-gray-700 shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-[#E2E2E2] hover:shadow-md active:scale-[0.98]">
                            {t("personal.learnMore")}
                        </Button>
                    </div>
                </div>
            </section>

            <section className={`bg-white py-20 ${fadeUp}`}>
                <div className="mx-auto w-[90%] max-w-6xl">
                    <h3 className={`text-center text-2xl font-bold text-gray-800 ${fadeUp} md:text-3xl`}>
                        {t("ai.title")} <br />
                        {t("ai.subtitle")}
                    </h3>

                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div
                            className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${pop} ${delay1}`}
                        >
                            <h4 className="font-semibold text-gray-800">{t("ai.feature1")}</h4>
                            <div className="mt-6 h-60 rounded-xl border-2 border-gray-300 border-dashed bg-gray-50 transition-all duration-300 hover:bg-gray-100" />
                        </div>

                        <div
                            className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${pop} ${delay2}`}
                        >
                            <h4 className="font-semibold text-gray-800">{t("ai.feature2")}</h4>
                            <div className="mt-6 h-60 rounded-xl border-2 border-gray-300 border-dashed bg-gray-50 transition-all duration-300 hover:bg-gray-100" />
                        </div>
                    </div>
                </div>
            </section>

            <GuestFooter />
        </div>
    );
}
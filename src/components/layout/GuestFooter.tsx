"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export interface GuestFooterProps {
    className?: string;
}

export function GuestFooter({ className = "" }: GuestFooterProps) {
    const t = useTranslations("GuestFooter");
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    const changeLocale = (nextLocale: "en" | "vi") => {
        const pathWithoutLocale = (pathname || "").replace(/^\/[a-z]{2}(?=\/|$)/i, "");
        router.push(`/${nextLocale}${pathWithoutLocale}`);
    };

    const productLinks = [
        {
            href: `/${locale}/landing/personal`,
            label: t("personal"),
            key: "personal"
        },
        {
            href: `/${locale}/landing/group`,
            label: t("group"),
            key: "group"
        },
        {
            href: `/${locale}/landing/management`,
            label: t("management"),
            key: "management"
        },
        {
            href: `/${locale}/landing/plan`,
            label: t("plan"),
            key: "plan"
        }
    ];

    return (
        <footer className={`relative overflow-hidden bg-[linear-gradient(180deg,#FFEAD3_0%,#FFD8AF_100%)] py-12 ${className}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70" />

            <div className="mx-auto w-[92%] max-w-7xl">
                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-5">
                        <Link href={`/${locale}`} className="inline-flex items-center gap-2">
                            <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
                                <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                                <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                            </svg>
                            <div className="font-bold text-orange-600 text-xl leading-tight">
                                Study
                                <br />
                                Studio
                            </div>
                        </Link>

                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/45 text-sm shadow-[0_6px_18px_rgba(249,115,22,0.12)]">
                                🌐
                            </div>
                            <div className="flex items-center rounded-full border border-white/70 bg-white/55 p-1 shadow-[0_8px_24px_rgba(249,115,22,0.14)] backdrop-blur">
                                <button
                                    type="button"
                                    onClick={() => changeLocale("vi")}
                                    className={`rounded-full px-4 py-1.5 font-semibold text-xs transition-colors ${locale === "vi"
                                        ? "bg-orange-500 text-white"
                                        : "text-[#5F4A3A] hover:bg-orange-100"
                                        }`}
                                    aria-label={t("switchToVietnamese")}
                                >
                                    VI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeLocale("en")}
                                    className={`rounded-full px-4 py-1.5 font-semibold text-xs transition-colors ${locale === "en"
                                        ? "bg-orange-500 text-white"
                                        : "text-[#5F4A3A] hover:bg-orange-100"
                                        }`}
                                    aria-label={t("switchToEnglish")}
                                >
                                    EN
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="md:max-w-[62%]">
                        <p className="mb-3 text-center font-semibold text-[#261E33] text-sm">{t("products")}</p>
                        <ul className="flex flex-wrap justify-center gap-2">
                            {productLinks.map((link) => (
                                <li key={link.key}>
                                    <Link
                                        href={link.href}
                                        className="inline-flex items-center rounded-full border border-white/70 bg-white/45 px-4 py-2 font-medium text-[#5F4A3A] text-sm transition-colors hover:bg-white/70 hover:text-orange-700"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}

"use client";

import { motion } from "framer-motion";
import { Home, Sparkles, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { twMerge } from "tailwind-merge";

type Tab = {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: (locale: string) => string;
};

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");

export default function HomeTopTabs() {
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations("HomeTopTabs");

    const tabs: Tab[] = [
        {
            key: "home",
            label: t("home"),
            icon: Home,
            href: (l) => `/${l}/home`
        },
        {
            key: "analysis",
            label: t("analysis"),
            icon: BarChart3,
            href: (l) => `/${l}/analysis`
        },
        {
            key: "ai",
            label: t("ai"),
            icon: Sparkles,
            href: (l) => `/${l}/ai`
        }
    ];

    const curPath = stripLocale(pathname || "");

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-[#F3E4D7] bg-white/90 p-1.5 shadow-sm">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const href = tab.href(locale);
                const target = stripLocale(href);

                const active =
                    target === "/home" ? curPath === "/home" : curPath === target || curPath.startsWith(`${target}/`);

                return (
                    <Link key={tab.key} href={href} className="relative shrink-0">
                        <motion.div
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className={twMerge(
                                "group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-200",
                                active
                                    ? "text-white shadow-md shadow-orange-200"
                                    : "text-[#6B7280] hover:bg-[#FFF1E6] hover:text-[#EA580C]"
                            )}>
                            {active ? (
                                <motion.div
                                    layoutId="activeHomeTab"
                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600"
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 30
                                    }}
                                />
                            ) : null}

                            <Icon
                                className={twMerge(
                                    "relative z-10 h-4 w-4 transition-colors duration-200",
                                    active ? "text-white" : "text-[#8C8C8C] group-hover:text-[#EA580C]"
                                )}
                            />
                            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                        </motion.div>
                    </Link>
                );
            })}
        </motion.div>
    );
}

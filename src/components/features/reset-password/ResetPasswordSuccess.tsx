"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ResetPasswordSuccess() {
    const locale = useLocale();
    const t = useTranslations("ResetPasswordPage");

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <Logo />

                <h1 className="mt-4 font-bold text-2xl">{t("successTitle")}</h1>

                <div className="my-6 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
                        <Check className="text-orange-500" />
                    </div>
                </div>

                <p className="mb-6 text-muted-foreground text-sm">{t("successMessage")}</p>

                <Link href={`/${locale}/login`}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600">{t("goToLogin")}</Button>
                </Link>
            </div>
        </div>
    );
}

function Logo() {
    return (
        <div className="mb-6 flex items-center justify-center gap-3">
            <svg width="48" height="48" viewBox="0 0 64 64">
                <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
            </svg>

            <span className="font-bold text-3xl text-orange-500">
                Study <br /> Studio
            </span>
        </div>
    );
}

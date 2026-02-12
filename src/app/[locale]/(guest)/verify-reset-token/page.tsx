"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { verifyResetToken } from "@/api/auth-verify";
import { LoadingPage } from "@/components/common/LoadingPage";

const resetTokenStorageKey = "resetPasswordToken";

export default function VerifyResetTokenPage() {
    const locale = useLocale();
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");

        const redirectToReset = () => {
            router.replace(`/${locale}/reset-password`);
        };

        if (!token) {
            if (typeof window !== "undefined") {
                sessionStorage.removeItem(resetTokenStorageKey);
            }
            redirectToReset();
            return;
        }

        const verify = async () => {
            const result = await verifyResetToken(token, locale);

            if (result.status === "success" && typeof window !== "undefined") {
                sessionStorage.setItem(resetTokenStorageKey, token);
            } else if (typeof window !== "undefined") {
                sessionStorage.removeItem(resetTokenStorageKey);
            }

            redirectToReset();
        };

        verify();
    }, [locale, params, router]);

    return <LoadingPage />;
}

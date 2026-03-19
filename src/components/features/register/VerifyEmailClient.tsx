"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { verifyEmailToken } from "@/api/auth-verify";
import {
    VerifyEmailError,
    VerifyEmailInvalidToken,
    VerifyEmailLoading,
    VerifyEmailSuccess
} from "./VerifyEmailStates";

export default function VerifyEmailClient() {
    const locale = useLocale();
    const params = useSearchParams();

    const token = params.get("token");

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"success" | "invalid" | "error">("error");
    const [message, setMessage] = useState("");

    // ================= VERIFY EMAIL =================
    useEffect(() => {
        let ignore = false;
        let redirectTimer: NodeJS.Timeout;

        const verifyEmail = async () => {
            setLoading(true);

            if (!token) {
                setStatus("invalid");
                setMessage("");
                setLoading(false);
                return;
            }

            try {
                const result = await verifyEmailToken(token, locale);

                if (ignore) return;

                const msg = (result.message || "").toLowerCase();
                const isAlreadyVerified =
                    msg.includes("đã xác thực") ||
                    msg.includes("already verified") ||
                    msg.includes("token used");

                // Verify success or already verified
                if (result.status === "success" || isAlreadyVerified) {
                    setStatus("success");
                    setMessage(result.message);
                    setLoading(false);

                    // Auto redirect after 5 seconds
                    redirectTimer = setTimeout(() => {
                        if (!ignore) {
                            window.location.href = `/${locale}/login`;
                        }
                    }, 5000);

                    return;
                }

                // Case: Invalid or expired token
                if (
                    msg.includes("hết hạn") ||
                    msg.includes("expired") ||
                    msg.includes("invalid") ||
                    msg.includes("không hợp lệ")
                ) {
                    setStatus("invalid");
                    setMessage(result.message);
                } else {
                    setStatus("error");
                    setMessage(result.message);
                }
            } catch {
                if (ignore) return;
                setStatus("error");
                setMessage("");
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        verifyEmail();

        return () => {
            ignore = true;
            if (redirectTimer) clearTimeout(redirectTimer);
        };
    }, [token, locale]);

    // ================= RENDER =================
    if (loading) {
        return <VerifyEmailLoading />;
    }

    if (status === "success") {
        return <VerifyEmailSuccess message={message} locale={locale} />;
    }

    if (status === "invalid") {
        return <VerifyEmailInvalidToken message={message} locale={locale} />;
    }

    return <VerifyEmailError message={message} locale={locale} />;
}

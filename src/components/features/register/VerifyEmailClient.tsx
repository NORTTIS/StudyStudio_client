"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { verifyEmailToken } from "@/api/auth-verify";
import {
    VerifyEmailAlreadyVerified,
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
    const [status, setStatus] = useState<"success" | "invalid" | "already" | "error">("error");
    const [message, setMessage] = useState("");

    // ================= VERIFY EMAIL =================
    useEffect(() => {
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

                // ✅ Verify success
                if (result.status === "success") {
                    setStatus("success");
                    setMessage(result.message);
                    setLoading(false);
                    return;
                }

                // ❌ Error - parse message to determine type
                const msg = result.message.toLowerCase();

                // Case: Already verified
                if (msg.includes("đã xác thực") || msg.includes("already verified") || msg.includes("token used")) {
                    setStatus("already");
                    setMessage(result.message);
                }
                // Case: Invalid or expired token
                else if (
                    msg.includes("hết hạn") ||
                    msg.includes("expired") ||
                    msg.includes("invalid") ||
                    msg.includes("không hợp lệ")
                ) {
                    setStatus("invalid");
                    setMessage(result.message);
                }
                // Case: Other errors
                else {
                    setStatus("error");
                    setMessage(result.message);
                }
            } catch {
                setStatus("error");
                setMessage("");
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [token, locale]);

    // ================= RENDER =================
    if (loading) {
        return <VerifyEmailLoading />;
    }

    if (status === "success") {
        return <VerifyEmailSuccess message={message} locale={locale} />;
    }

    if (status === "already") {
        return <VerifyEmailAlreadyVerified message={message} locale={locale} />;
    }

    if (status === "invalid") {
        return <VerifyEmailInvalidToken message={message} locale={locale} />;
    }

    return <VerifyEmailError message={message} locale={locale} />;
}

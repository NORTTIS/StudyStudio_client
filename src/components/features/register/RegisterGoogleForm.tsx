"use client";

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useState } from "react";
import { apiPost } from "@/api/api-client";
import type { AuthTokens } from "@/api/auth";
import { setAuthTokens } from "@/api/auth";
import type { components } from "@/api/types";

type Props = {
    mode: "login" | "register";
};

export function RegisterGoogleForm({ mode }: Props) {
    const router = useRouter();
    const locale = useLocale();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    type GoogleLoginRequest = components["schemas"]["GoogleLoginRequest"];

    const title = "Continue with Google";
    const subtitle = "Choose a Google account to continue";
    const backLabel = mode === "login" ? "Back to standard login" : "Back to standard register";
    const backHref = `/${locale}/${mode === "login" ? "login" : "register"}`;

    // ✅ Register with Google
    const handleGoogleAuth = async (credential: string | undefined) => {
        setError("");

        if (!credential) {
            setError("Unable to read Google token");
            return;
        }

        setIsSubmitting(true);

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const payload: GoogleLoginRequest = { idToken: credential };

            const result = await apiPost<AuthTokens>(`${baseUrl}/auth/google`, payload, locale, true);

            if (result.status === "error") {
                setError(result.message || "Google sign-in failed");
                return;
            }

            if (result.data) {
                setAuthTokens(result.data);
                router.push(`/${locale}/home`);
                return;
            }

            router.push(`/${locale}/login`);
        } catch {
            setError("Cannot connect to server");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
                    <h1 className="text-center font-bold text-2xl">{title}</h1>

                    <p className="text-center text-muted-foreground text-sm">{subtitle}</p>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={(res) => handleGoogleAuth(res.credential)}
                            onError={() => setError("Google sign-in failed or canceled")}
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => router.push(backHref)}
                        disabled={isSubmitting}
                        className="w-full text-center text-orange-600 text-sm hover:underline disabled:cursor-not-allowed disabled:opacity-60">
                        ← {backLabel}
                    </button>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
}

/** biome-ignore-all lint/a11y/useButtonType: legacy markup in this screen intentionally omits explicit type on secondary button */
/** biome-ignore-all lint/a11y/noLabelWithoutControl: static display block uses visual label without form control */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { resendVerifyEmail } from "@/api/auth-verify";
import { Button, Logo } from "@/components/common";
import { useToast } from "@/components/ui/use-toast";

export default function ResendEmailVerifyClient() {
    const t = useTranslations("ResendEmailVerifyPage");
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success">("idle");
    const [email, setEmail] = useState("");

    // ✅ Pre-fill email from query params if available
    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            const decodedEmail = decodeURIComponent(emailParam);
            setEmail(decodedEmail);
        }
    }, [searchParams]);

    // ✅ Submit handler
    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast({
                description: t("emailRequired"),
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            const result = await resendVerifyEmail(email, locale);

            if (result.status === "error") {
                toast({
                    description: result.message,
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            // Show success toast
            toast({
                description: result.message || t("successMessage"),
                variant: "success"
            });

            setStatus("success");
            setLoading(false);
        } catch {
            toast({
                description: t("connectionError"),
                variant: "destructive"
            });
            setLoading(false);
        }
    };

    // ✅ Success state
    if (status === "success") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                    <Logo />
                    <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>
                    <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

                    <div className="mb-6 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                stroke="#F97316"
                                strokeWidth="3"
                                fill="none">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="mb-2 text-center font-semibold text-base">{t("successTitle")}</h2>

                    <p className="mb-6 text-center text-muted-foreground text-sm leading-relaxed">
                        {t("successDescription", { email })}
                    </p>

                    <div className="flex gap-3">
                        <Link
                            href={`/${locale}/login`}
                            className="flex-1 rounded-lg bg-gray-200 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-300">
                            {t("backToLogin")}
                        </Link>
                        <button
                            onClick={() => {
                                setStatus("idle");
                            }}
                            className="flex-1 rounded-lg bg-orange-500 py-3 text-center font-semibold text-white transition hover:bg-orange-600">
                            {t("sendAnother")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Form state
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
            <div className="w-full max-w-md">
                <div className="rounded-xl bg-white p-8 shadow-xl">
                    <Logo className="mb-6" />

                    <div className="mb-6 text-center">
                        <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
                        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <p className="mb-4 text-muted-foreground text-sm">{t("description")}</p>

                            {/* Email Display (not editable) */}
                            <div>
                                <label className="mb-1 block font-medium text-sm">{t("email")}</label>
                                <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-600">
                                    {email || t("emailPlaceholder")}
                                </div>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600">
                            {t("sendButton")}
                        </Button>
                    </form>

                    {/* FOOTER LOGIN LINK */}
                    <p className="mt-6 text-center text-muted-foreground text-sm">
                        {t("alreadyHaveEmail")}{" "}
                        <Link href={`/${locale}/login`} className="font-medium text-orange-600 hover:underline">
                            {t("backToLoginLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

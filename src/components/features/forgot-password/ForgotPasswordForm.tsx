"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiPost } from "@/api/api-client";
import type { components } from "@/api/types";

export function ForgotPasswordForm() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("ForgotPasswordPage");

    const [error, setError] = useState("");

    type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];

    /* ================= VALIDATION SCHEMA ================= */
    const forgotPasswordSchema = z.object({
        email: z
            .string()
            .min(1, t("emailRequired"))
            .refine((val) => !val.includes(" "), t("emailNoSpaces"))
            .email(t("emailInvalid"))
    });

    type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema)
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setError("");

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const payload: ForgotPasswordRequest = { email: data.email };

            const result = await apiPost(
                `${baseUrl}/auth/forgot`,
                payload,
                locale,
                true // skipAuth - forgot password doesn't require authentication
            );

            if (result.status === "error") {
                setError(result.message || t("emailInvalid"));
                return;
            }

            router.push(`/${locale}/forgot-password/success?email=${encodeURIComponent(data.email)}`);
        } catch (err) {
            setError(t("emailInvalid"));
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                    </svg>

                    <span className="font-bold text-3xl text-orange-500">
                        Study <br /> Studio
                    </span>
                </div>

                <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>

                <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                    <div>
                        <label htmlFor="email" className="mb-1 block font-medium text-sm">
                            {t("email")}
                        </label>
                        <input
                            id="email"
                            type="text"
                            placeholder={t("emailPlaceholder")}
                            className="w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            {...register("email")}
                            disabled={isSubmitting}
                        />
                        {errors.email && <p className="mt-1 text-red-600 text-xs">{errors.email.message}</p>}
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">
                        {isSubmitting ? "..." : t("sendResetLink")}
                    </button>

                    <div className="mt-4 flex items-center gap-2 text-gray-500 transition hover:text-orange-500">
                        <span className="text-xl">←</span>
                        <Link href={`/${locale}/login`} className="font-medium text-sm">
                            {t("backToLogin")}
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

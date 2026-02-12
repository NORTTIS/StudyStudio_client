"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiPost } from "@/api/api-client";
import type { AuthTokens } from "@/api/auth";
import { setAuthTokens } from "@/api/auth";
import type { components } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegisterSuccess } from "./RegisterSuccess";

export function RegisterForm() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("RegisterPage");

    // ================= STATE =================
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    type GoogleLoginRequest = components["schemas"]["GoogleLoginRequest"];

    // ================= VALIDATION SCHEMA =================
    const registerSchema = z
        .object({
            firstName: z
                .string()
                .min(1, t("firstNameRequired"))
                .regex(/^[A-Za-zÀ-ỹ\s]{1,10}$/, t("firstNameInvalid")),
            lastName: z
                .string()
                .min(1, t("lastNameRequired"))
                .regex(/^[A-Za-zÀ-ỹ\s]{1,10}$/, t("lastNameInvalid")),
            email: z
                .string()
                .min(1, t("emailRequired"))
                .refine((val) => !val.includes(" "), t("emailNoSpaces"))
                .email(t("emailInvalid")),
            password: z
                .string()
                .min(1, t("passwordRequired"))
                .regex(/^(?=.*[A-Z])(?=.*\d).{10,20}$/, t("passwordInvalid")),
            confirmPassword: z.string().min(1, t("confirmPasswordRequired"))
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: t("confirmPasswordMismatch"),
            path: ["confirmPassword"]
        });

    type RegisterFormData = z.infer<typeof registerSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema)
    });

    // ================= SUBMIT REGISTER =================
    const onSubmit = async (data: RegisterFormData) => {
        setError("");

        try {
            const result = await apiPost(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`,
                data,
                locale,
                true // skipAuth - no authentication required for registration
            );

            if (result.status === "error") {
                setError(result.message || t("registrationFailed"));
                return;
            }

            // Show success screen instead of redirecting
            setRegisteredEmail(data.email);
            setShowSuccess(true);
        } catch {
            setError(t("connectionError"));
        }
    };

    const handleRegisterWithGoogle = async (credential: string | undefined) => {
        setError("");

        if (!credential) {
            setError(t("registrationFailed"));
            return;
        }

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const payload: GoogleLoginRequest = { idToken: credential };

            const result = await apiPost<AuthTokens>(`${baseUrl}/auth/google`, payload, locale, true);

            if (result.status === "error" || !result.data) {
                setError(result.message || t("registrationFailed"));
                return;
            }

            setAuthTokens(result.data);
            setShowSuccess(false);
            router.push(`/${locale}/home`);
        } catch {
            setError(t("connectionError"));
        }
    };

    // Show success screen after successful registration
    if (showSuccess) {
        return <RegisterSuccess email={registeredEmail} locale={locale} />;
    }

    return (
        <div className="space-y-6">
            {/* Title */}
            <div>
                <h1 className="font-bold text-2xl">{t("title")}</h1>
                <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
            </div>

            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={(res) => handleRegisterWithGoogle(res.credential)}
                        onError={() => setError(t("registrationFailed"))}
                    />
                </div>
            </GoogleOAuthProvider>

            {/* Divider */}
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <div className="h-px flex-1 bg-border" />
                {t("orContinueWith")}
                <div className="h-px flex-1 bg-border" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>{t("lastName")}</Label>
                        <Input {...register("lastName")} />
                        {errors.lastName && <p className="text-red-600 text-xs">{errors.lastName.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label>{t("firstName")}</Label>
                        <Input {...register("firstName")} />
                        {errors.firstName && <p className="text-red-600 text-xs">{errors.firstName.message}</p>}
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                    <Label>{t("email")}</Label>
                    <Input type="email" {...register("email")} />
                    {errors.email && <p className="text-red-600 text-xs">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1">
                    <Label>{t("password")}</Label>
                    <div className="relative">
                        <Input type={showPassword ? "text" : "password"} className="pr-10" {...register("password")} />

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-xs">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                    <Label>{t("confirmPassword")}</Label>
                    <div className="relative">
                        <Input type={showConfirm ? "text" : "password"} className="pr-10" {...register("confirmPassword")} />

                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-600 text-xs">{errors.confirmPassword.message}</p>}
                </div>

                {/* ERROR */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>
                )}

                {/* Submit */}
                <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
                    {t("createAccountButton")}
                </Button>
            </form>

            {/* Footer */}
            <p className="text-center text-muted-foreground text-sm">
                {t("hasAccount")}{" "}
                <Link href={`/${locale}/login`} className="font-medium text-orange-600 hover:underline">
                    {t("signInLink")}
                </Link>
            </p>
        </div>
    );
}

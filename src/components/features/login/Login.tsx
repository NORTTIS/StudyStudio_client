"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { apiPost } from "@/api/api-client";
import type { AuthTokens } from "@/api/auth";
import { setAuthTokens } from "@/api/auth";
import type { components } from "@/api/types";
import { Button, Input, Logo } from "@/components/common";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
    const t = useTranslations("LoginPage");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const locale = useLocale();

    const [showPassword, setShowPassword] = useState(false);

    const loginSchema = z.object({
        email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
        password: z.string().min(1, t("passwordRequired"))
    });

    type LoginFormData = z.infer<typeof loginSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema)
    });

    // ✅ Submit handler
    const onSubmit = async (data: LoginFormData) => {
        try {
            const result = await apiPost<AuthTokens>(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`,
                data,
                locale,
                true // skipAuth - no authentication required for login
            );

            if (result.status === "error") {
                // Check if error is due to unverified email (code === "AUTH005")
                if (result.code === "AUTH005") {
                    toast({
                        description: result.message,
                        variant: "destructive"
                    });
                    // Redirect to resend email verification page
                    const email = encodeURIComponent(data.email);
                    router.push(`/${locale}/resend-email-verify?email=${email}`);
                    return;
                }

                // Show error toast for other errors
                toast({
                    description: result.message,
                    variant: "destructive"
                });
                return;
            }

            if (result.data) {
                // Store tokens in localStorage
                setAuthTokens(result.data);

                // Show success toast
                toast({
                    description: "Đăng nhập thành công",
                    variant: "success"
                });

                // Redirect to intended destination or home page
                const redirectUrl = searchParams.get("redirect");
                if (redirectUrl) {
                    router.push(decodeURIComponent(redirectUrl));
                } else {
                    router.push(`/${locale}/home`);
                }
            }
        } catch {
            toast({
                description: t("connectionError"),
                variant: "destructive"
            });
        }
    };

    type GoogleLoginRequest = components["schemas"]["GoogleLoginRequest"];

    const handleGoogleLogin = async (credential: string | undefined) => {
        if (!credential) {
            toast({
                description: t("credentialError"),
                variant: "destructive"
            });
            return;
        }

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const payload: GoogleLoginRequest = { idToken: credential };

            const result = await apiPost<AuthTokens>(`${baseUrl}/auth/google`, payload, locale, true);

            if (result.status === "error" || !result.data) {
                // Check if error is due to unverified email (code === "AUTH005")
                if (result.code === "AUTH005") {
                    toast({
                        description: result.message,
                        variant: "destructive"
                    });
                    // Redirect to resend email verification page without email (will be filled by user)
                    router.push(`/${locale}/resend-email-verify`);
                    return;
                }

                toast({
                    description: result.message,
                    variant: "destructive"
                });
                return;
            }

            setAuthTokens(result.data);

            toast({
                description: "Đăng nhập thành công",
                variant: "success"
            });

            const redirectUrl = searchParams.get("redirect");
            if (redirectUrl) {
                router.push(decodeURIComponent(redirectUrl));
            } else {
                router.push(`/${locale}/home`);
            }
        } catch {
            toast({
                description: t("connectionError"),
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
            <div className="w-full max-w-md">
                {/* ✅ CARD */}
                <div className="rounded-xl bg-white p-8 shadow-xl">
                    {/* ✅ LOGO Study Studio */}
                    <Logo className="mb-6" />

                    {/* ✅ HEADER */}
                    <div className="mb-6 text-center">
                        <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
                        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
                    </div>

                    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
                        <div className="mb-6 flex justify-center">
                            <GoogleLogin
                                onSuccess={(res) => handleGoogleLogin(res.credential)}
                                onError={() =>
                                    toast({
                                        description: "Google authentication failed",
                                        variant: "destructive"
                                    })
                                }
                            />
                        </div>
                    </GoogleOAuthProvider>

                    {/* ✅ DIVIDER */}
                    <div className="mb-6 flex items-center gap-3 text-muted-foreground text-sm">
                        <div className="h-px flex-1 bg-border" />
                        {t("orContinueWith")}
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* ✅ LOGIN FORM */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* EMAIL */}
                        <Input
                            {...register("email")}
                            type="email"
                            label={t("email")}
                            placeholder={t("emailPlaceholder")}
                            error={errors.email?.message}
                            fullWidth
                        />

                        {/* PASSWORD + Eye Icon */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-[#261E33] text-sm">{t("password")}</span>

                                {/* ✅ FIX locale link */}
                                <Link
                                    href={`/${locale}/forgot-password`}
                                    className="text-muted-foreground text-sm hover:text-orange-500">
                                    {t("forgotPassword")}
                                </Link>
                            </div>

                            <div className="relative">
                                <Input
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t("passwordPlaceholder")}
                                    error={errors.password?.message}
                                    fullWidth
                                    className="pr-10"
                                />

                                {/* 👁 Eye Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isSubmitting}
                            className="w-full bg-orange-500 hover:bg-orange-600">
                            {t("signInButton")}
                        </Button>
                    </form>

                    {/* ✅ FOOTER REGISTER LINK FIX */}
                    <p className="mt-6 text-center text-muted-foreground text-sm">
                        {t("noAccount")}{" "}
                        <Link href={`/${locale}/register`} className="font-medium text-orange-600 hover:underline">
                            {t("signUpLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

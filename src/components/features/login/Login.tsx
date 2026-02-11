"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Eye, EyeOff } from "lucide-react";

import { Button, Input } from "@/components/common";

export default function Login() {
  const t = useTranslations("LoginPage");

  // ✅ Get current locale (vi/en)
  const locale = useLocale();

  // ✅ Toggle show/hide password
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Schema validation
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
    console.warn("Login data:", data);
  };

  // ✅ Google login handler
  const handleGoogleLogin = () => {
    console.warn("Google login clicked");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* ✅ CARD */}
        <div className="rounded-xl bg-white p-8 shadow-xl">
          {/* ✅ LOGO Study Studio */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <svg width="48" height="48" viewBox="0 0 64 64">
              <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
              <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
            </svg>

            <span className="font-bold text-3xl text-orange-500 leading-tight">
              Study <br /> Studio
            </span>
          </div>

          {/* ✅ HEADER */}
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-bold text-2xl text-[#261E33]">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* ✅ GOOGLE LOGIN BUTTON */}
          <Button
            type="button"
            variant="outline"
            fullWidth
            className="mb-6 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}>
            {/* Google Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.2 1.53 7.63 2.8l5.56-5.56C33.64 3.36 29.24 1.5 24 1.5 14.98 1.5 7.21 6.98 3.69 14.91l6.91 5.36C12.4 14.3 17.77 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.14 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.46c-.54 2.88-2.16 5.32-4.6 6.98l7.05 5.49C43.73 36.36 46.14 30.9 46.14 24.5z"
              />
              <path
                fill="#FBBC05"
                d="M10.6 28.27A14.5 14.5 0 0 1 9.5 24c0-1.48.26-2.91.72-4.27l-6.9-5.36A23.9 23.9 0 0 0 1.5 24c0 3.86.93 7.5 2.82 10.73l6.28-6.46z"
              />
              <path
                fill="#34A853"
                d="M24 46.5c6.48 0 11.92-2.13 15.9-5.78l-7.05-5.49c-1.96 1.32-4.47 2.1-8.85 2.1-6.2 0-11.45-4.19-13.3-9.83l-6.3 6.47C7.9 41.94 15.5 46.5 24 46.5z"
              />
            </svg>

            {t("continueWithGoogle")}
          </Button>

          {/* ✅ DIVIDER */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
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
                <label className="font-medium text-sm text-[#261E33]">{t("password")}</label>

                {/* ✅ FIX locale link */}
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-sm text-muted-foreground hover:text-orange-500">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href={`/${locale}/register`} className="text-orange-600 font-medium hover:underline">
              {t("signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

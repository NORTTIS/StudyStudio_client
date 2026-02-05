"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Input } from "@/components/common";

export default function Login() {
  const t = useTranslations("LoginPage");

  // Create schema with translated messages
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

  const onSubmit = async (data: LoginFormData) => {
    // TODO: Implement login logic
    console.warn("Login data:", data);
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google login
    console.warn("Google login clicked");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="mb-6 flex justify-center">
          <svg
            className="h-16 w-16 text-[#261E33]"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>

        {/* Card Container */}
        <div className="rounded-lg bg-white px-6 py-8 shadow-sm sm:px-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-semibold text-3xl text-[#261E33]">{t("title")}</h1>
            <p className="text-[#6F6B99]">{t("subtitle")}</p>
          </div>

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            fullWidth
            className="mb-6 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("continueWithGoogle")}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-[#8A8A8A] border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-[#6F6B99]">{t("orContinueWith")}</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Input */}
            <Input
              {...register("email")}
              type="email"
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              error={errors.email?.message}
              fullWidth
            />

            {/* Password Input */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="font-medium text-[#261E33] text-sm">
                  {t("password")}
                </label>
                <Link href="/forgot-password" className="text-[#6F6B99] text-sm hover:text-[#4C6AA8]">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                {...register("password")}
                type="password"
                id="password"
                placeholder={t("passwordPlaceholder")}
                error={errors.password?.message}
                fullWidth
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting} className="mt-6">
              {t("signInButton")}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-[#6F6B99] text-sm">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-[#4C6AA8] hover:underline">
              {t("signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

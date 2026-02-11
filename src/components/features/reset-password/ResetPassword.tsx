"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResetPasswordSuccess } from "./ResetPasswordSuccess";

type Props = {
  token?: string;
};

export function ResetPassword({ token }: Props) {
  const locale = useLocale();
  const t = useTranslations("ResetPasswordPage");

  // true = còn hạn | false = hết hạn
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidToken(true);
      return;
    }

    // 🔹 TODO: GET /reset-password/verify?token=...
    setIsValidToken(true); // mock
  }, [token]);

  // ================= VALIDATION SCHEMA =================
  const resetPasswordSchema = z
    .object({
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

  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  if (isSuccess) {
    return <ResetPasswordSuccess />;
  }

  if (!isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <Logo />

          <h1 className="mt-4 font-bold text-2xl">{t("invalidTokenTitle")}</h1>

          <p className="mt-2 text-muted-foreground text-sm">{t("invalidTokenMessage")}</p>

          <Link href={`/${locale}/login`}>
            <Button className="mt-6 w-full bg-orange-500 hover:bg-orange-600">{t("backToLogin")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async () => {
    setError("");

    // 🔹 TODO: POST /reset-password
    // body: { token, password }

    // MOCK success
    setIsSuccess(true);
  };

  /* ================= TOKEN CÒN HẠN ================= */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />

        <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>

        <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1 block font-medium text-sm">{t("password")}</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} {...register("password")} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-red-600 text-xs">{errors.password.message}</p>}
          </div>

          <div>
            <Label className="mb-1 block font-medium text-sm">{t("confirmPassword")}</Label>
            <div className="relative">
              <Input type={showConfirm ? "text" : "password"} {...register("confirmPassword")} />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-red-600 text-xs">{errors.confirmPassword.message}</p>}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
            {t("resetPasswordButton")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <svg width="48" height="48" viewBox="0 0 64 64">
        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
      </svg>

      <span className="font-bold text-3xl text-orange-500">
        Study <br /> Studio
      </span>
    </div>
  );
}

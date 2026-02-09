"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-[#6F6B99] hover:text-[#261E33] focus:outline-none"
    tabIndex={-1}>
    {visible ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    )}
  </button>
);

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterForm() {
  const t = useTranslations("RegisterPage");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t("firstNameRequired");
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t("lastNameRequired");
    }

    if (!formData.email.trim()) {
      newErrors.email = t("emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("emailInvalid");
    }

    if (!formData.password) {
      newErrors.password = t("passwordRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("passwordMinLength");
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("confirmPasswordRequired");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("passwordMismatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSuccessMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const existingUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const emailExists = existingUsers.some((user: FormData) => user.email === formData.email);

      if (emailExists) {
        setErrors({ email: t("emailInvalid") });
        setIsSubmitting(false);
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        createdAt: new Date().toISOString()
      };

      existingUsers.push(newUser);
      localStorage.setItem("users", JSON.stringify(existingUsers));

      setSuccessMessage(`${t("signUpButton")} successful! Redirecting...`);

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
      });

      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      console.error("Registration failed:", error);
      setErrors({ email: t("emailInvalid") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    alert(t("continueWithGoogle"));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl text-[#261E33]">{t("title")}</h1>
        <p className="text-[#6F6B99]">{t("subtitle")}</p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="font-medium text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="mb-8 flex h-auto w-full items-center justify-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 font-medium text-[#261E33] transition-colors hover:bg-gray-50"
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

      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-[#F0F0F0] border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-white px-4 text-[#9CA3AF]">{t("orContinueWith")}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-4">
          <div className="w-1/2">
            <label htmlFor="firstName" className="mb-2 block font-semibold text-[#261E33] text-sm">
              {t("firstName")}
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder={t("firstNamePlaceholder")}
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className={`rounded-xl border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] ${
                errors.firstName ? "border-red-500" : ""
              }`}
            />
            {errors.firstName && <p className="mt-1 text-red-500 text-xs">{errors.firstName}</p>}
          </div>
          <div className="w-1/2">
            <label htmlFor="lastName" className="mb-2 block font-semibold text-[#261E33] text-sm">
              {t("lastName")}
            </label>
            <Input
              id="lastName"
              type="text"
              placeholder={t("lastNamePlaceholder")}
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className={`rounded-xl border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] ${
                errors.lastName ? "border-red-500" : ""
              }`}
            />
            {errors.lastName && <p className="mt-1 text-red-500 text-xs">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block font-semibold text-[#261E33] text-sm">
            {t("email")}
          </label>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={`rounded-xl border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] ${
              errors.email ? "border-red-500" : ""
            }`}
          />
          {errors.email && <p className="mt-1 text-red-500 text-xs">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block font-semibold text-[#261E33] text-sm">
            {t("password")}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className={`rounded-xl border-[#E5E5E5] bg-white py-2.5 pr-10 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] ${
                errors.password ? "border-red-500" : ""
              }`}
            />
            <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
          </div>
          {errors.password && <p className="mt-1 text-red-500 text-xs">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block font-semibold text-[#261E33] text-sm">
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("confirmPasswordPlaceholder")}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className={`rounded-xl border-[#E5E5E5] bg-white py-2.5 pr-10 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] ${
                errors.confirmPassword ? "border-red-500" : ""
              }`}
            />
            <EyeIcon visible={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
          </div>
          {errors.confirmPassword && <p className="mt-1 text-red-500 text-xs">{errors.confirmPassword}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 h-auto w-full rounded-xl bg-[#FF5F3D] py-3 font-semibold text-base text-white shadow-sm transition-all hover:bg-[#ff4620] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? `${t("signUpButton")}...` : t("signUpButton")}
        </Button>
      </form>

      <p className="mt-8 text-center text-[#6F6B99] text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-[#FF5F3D] hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}

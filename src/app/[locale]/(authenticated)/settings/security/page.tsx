"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { changePassword } from "@/app/[locale]/(authenticated)/settings/user";
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

export default function SecuritySettingsPage() {
    const t = useTranslations("SecurityPage");
    const pathname = usePathname();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [_mounted, setMounted] = useState(false);

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load from localStorage on mount
    useState(() => {
        setMounted(true);
    });

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value
        }));
        setErrors((prev) => ({
            ...prev,
            [name]: ""
        }));
    };

    const validatePasswordForm = () => {
        const newErrors: Record<string, string> = {};

        if (!passwordData.currentPassword) {
            newErrors.currentPassword = t("currentPasswordRequired");
        }

        if (!passwordData.newPassword) {
            newErrors.newPassword = t("newPasswordRequired");
        } else if (passwordData.newPassword.length < 8) {
            newErrors.newPassword = t("passwordMinLength");
        }

        if (!passwordData.confirmPassword) {
            newErrors.confirmPassword = t("confirmPasswordRequired");
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            newErrors.confirmPassword = t("passwordMismatch");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePasswordForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Get current locale from pathname
            const locale = pathname.split("/")[1] || "vi";

            // Call change password API
            const response = await changePassword(
                {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                    confirmPassword: passwordData.confirmPassword,
                },
                locale,
            );

            if (response.status === "success") {
                // Save password change history to localStorage
                if (typeof window !== "undefined") {
                    const passwordHistory = JSON.parse(localStorage.getItem("passwordHistory") || "[]");
                    passwordHistory.push({
                        timestamp: new Date().toISOString(),
                        success: true,
                    });
                    localStorage.setItem("passwordHistory", JSON.stringify(passwordHistory));
                }

                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });

                alert(t("changePasswordSuccess"));
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Password update failed:", error);
            alert(t("changePasswordError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        });
        setErrors({});
    };

    return (
        <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                <div className="mb-8">
                    <h2 className="mb-2 font-bold text-[#261E33] text-xl">{t("changePasswordTitle")}</h2>
                    <p className="text-[#6F6B99] text-sm">{t("changePasswordSubtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Password */}
                    <div>
                        <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("currentPassword")}</label>
                        <div className="relative">
                            <Input
                                type={showCurrentPassword ? "text" : "password"}
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                placeholder={t("currentPasswordPlaceholder")}
                                className="rounded-lg border-[#E5E5E5] bg-white py-2.5 pr-10 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                            />
                            <EyeIcon visible={showCurrentPassword} onClick={() => setShowCurrentPassword(!showCurrentPassword)} />
                        </div>
                        {errors.currentPassword && <p className="mt-1 text-red-500 text-xs">{errors.currentPassword}</p>}
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("newPassword")}</label>
                        <div className="relative">
                            <Input
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                placeholder={t("newPasswordPlaceholder")}
                                className="rounded-lg border-[#E5E5E5] bg-white py-2.5 pr-10 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                            />
                            <EyeIcon visible={showNewPassword} onClick={() => setShowNewPassword(!showNewPassword)} />
                        </div>
                        {errors.newPassword && <p className="mt-1 text-red-500 text-xs">{errors.newPassword}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("confirmPassword")}</label>
                        <div className="relative">
                            <Input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                placeholder={t("confirmPasswordPlaceholder")}
                                className="rounded-lg border-[#E5E5E5] bg-white py-2.5 pr-10 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                            />
                            <EyeIcon visible={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
                        </div>
                        {errors.confirmPassword && <p className="mt-1 text-red-500 text-xs">{errors.confirmPassword}</p>}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 border-[#E5E5E5] border-t pt-6">
                        <Button
                            type="button"
                            onClick={handleCancel}
                            className="rounded-lg border border-[#E5E5E5] bg-white px-6 py-2.5 font-semibold text-[#261E33] text-sm hover:bg-[#F5F5F5]">
                            {t("cancelButton")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-[#FF5F3D] px-6 py-2.5 font-semibold text-sm text-white hover:bg-[#ff4620] disabled:opacity-50">
                            {isSubmitting ? t("updatingButton") : t("updateButton")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

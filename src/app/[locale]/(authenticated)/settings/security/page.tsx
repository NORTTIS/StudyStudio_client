"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { changePassword } from "@/app/[locale]/(authenticated)/settings/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{10,20}$/;

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
        } else if (!passwordRegex.test(passwordData.newPassword)) {
            newErrors.newPassword = t("passwordInvalid");
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
                    confirmPassword: passwordData.confirmPassword
                },
                locale
            );

            if (response.status === "success") {
                // Save password change history to localStorage
                if (typeof window !== "undefined") {
                    const passwordHistory = JSON.parse(localStorage.getItem("passwordHistory") || "[]");
                    passwordHistory.push({
                        timestamp: new Date().toISOString(),
                        success: true
                    });
                    localStorage.setItem("passwordHistory", JSON.stringify(passwordHistory));
                }

                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
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

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            alert(t("deleteAccount.confirmTextError"));
            return;
        }

        setIsDeleting(true);
        try {
            // TODO: Call API to delete account
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Clear all localStorage
            if (typeof window !== "undefined") {
                localStorage.clear();
            }

            alert(t("deleteAccount.success"));
            // Redirect to login page
            window.location.href = `/${pathname.split("/")[1]}/login`;
        } catch (error) {
            console.error("Delete account failed:", error);
            alert(t("deleteAccount.error"));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            {/* Change Password Section */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                <div className="mb-8">
                    <h2 className="mb-2 font-bold text-[#261E33] text-xl">{t("changePasswordTitle")}</h2>
                    <p className="text-[#6F6B99] text-sm">{t("changePasswordSubtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Password */}
                    <div>
                        <label htmlFor="currentPassword" className="mb-2 block font-semibold text-[#261E33] text-sm">
                            {t("currentPassword")}
                        </label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
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
                        <label htmlFor="newPassword" className="mb-2 block font-semibold text-[#261E33] text-sm">
                            {t("newPassword")}
                        </label>
                        <div className="relative">
                            <Input
                                id="newPassword"
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
                        <label htmlFor="confirmPassword" className="mb-2 block font-semibold text-[#261E33] text-sm">
                            {t("confirmPassword")}
                        </label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
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

            {/* Danger Zone - Delete Account */}
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8">
                <div className="mb-6">
                    <h2 className="mb-2 font-bold text-red-600 text-xl">{t("deleteAccount.title")}</h2>
                    <p className="text-red-600 text-sm">{t("deleteAccount.subtitle")}</p>
                </div>

                <div className="space-y-4 rounded-lg bg-white p-6">
                    <div className="flex items-start gap-3">
                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="font-semibold text-[#261E33] text-sm">{t("deleteAccount.warning")}</p>
                            <ul className="mt-2 space-y-1 text-[#6F6B99] text-sm">
                                <li>• {t("deleteAccount.consequence1")}</li>
                                <li>• {t("deleteAccount.consequence2")}</li>
                                <li>• {t("deleteAccount.consequence3")}</li>
                                <li>• {t("deleteAccount.consequence4")}</li>
                            </ul>
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full rounded-lg border-2 border-red-500 bg-white px-6 py-2.5 font-semibold text-red-600 text-sm hover:bg-red-50">
                        {t("deleteAccount.button")}
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-2 font-bold text-[#261E33] text-xl">{t("deleteAccount.modalTitle")}</h3>
                            <p className="text-[#6F6B99] text-sm">{t("deleteAccount.modalSubtitle")}</p>
                        </div>

                        <div className="mb-6 space-y-4">
                            <div className="rounded-lg bg-red-50 p-4">
                                <p className="mb-2 font-semibold text-red-600 text-sm">{t("deleteAccount.modalWarning")}</p>
                                <ul className="space-y-1 text-red-600 text-xs">
                                    <li>• {t("deleteAccount.consequence1")}</li>
                                    <li>• {t("deleteAccount.consequence2")}</li>
                                    <li>• {t("deleteAccount.consequence3")}</li>
                                </ul>
                            </div>

                            <div>
                                <label htmlFor="deleteConfirmText" className="mb-2 block font-semibold text-[#261E33] text-sm">
                                    {t("deleteAccount.confirmLabel")}
                                </label>
                                <Input
                                    id="deleteConfirmText"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="rounded-lg border-red-300 focus:border-red-500 focus:ring-red-500"
                                />
                                <p className="mt-1 text-[#6F6B99] text-xs">{t("deleteAccount.confirmHint")}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText("");
                                }}
                                disabled={isDeleting}
                                className="flex-1 rounded-lg border border-[#E5E5E5] bg-white px-6 py-2.5 font-semibold text-[#261E33] text-sm hover:bg-[#F5F5F5]">
                                {t("deleteAccount.cancelButton")}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || deleteConfirmText !== "DELETE"}
                                className="flex-1 rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-sm text-white hover:bg-red-700 disabled:opacity-50">
                                {isDeleting ? t("deleteAccount.deleting") : t("deleteAccount.confirmButton")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

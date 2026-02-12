"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { UpdateProfileRequest, UserProfile } from "@/app/[locale]/(authenticated)/settings/user";
import { updateUserProfile } from "@/app/[locale]/(authenticated)/settings/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const languages = [
    { value: "en", label: "English" },
    { value: "vi", label: "Tiếng Việt" }
];

interface SettingsClientProps {
    initialData: UserProfile;
}

export default function SettingsClient({ initialData }: SettingsClientProps) {
    const t = useTranslations("SettingsPage");
    const router = useRouter();
    const pathname = usePathname();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(initialData.avatar || "/images/image-removebg-preview.png");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<UserProfile>(initialData);

    // Load data from localStorage on mount (for avatar and any local overrides)
    useEffect(() => {
        const savedAvatar = localStorage.getItem("userAvatar");
        const preferredLocale = localStorage.getItem("preferredLocale");

        if (savedAvatar) {
            setAvatarPreview(savedAvatar);
        }

        if (preferredLocale && preferredLocale !== formData.language) {
            setFormData((prev) => ({
                ...prev,
                language: preferredLocale
            }));
        }
    }, [formData.language]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        // Handle language change immediately
        if (name === "language") {
            const newLocale = value;
            setFormData((prev) => ({
                ...prev,
                [name]: value
            }));

            const pathWithoutLocale = pathname.replace(/^\/(en|vi)/, "");
            const newPath = `/${newLocale}${pathWithoutLocale || "/"}`;
            localStorage.setItem("preferredLocale", newLocale);
            router.push(newPath);
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setAvatarPreview(result);
                localStorage.setItem("userAvatar", result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Get current locale from pathname
            const locale = pathname.split("/")[1] || "vi";

            // Prepare update request
            const updateData: UpdateProfileRequest = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                bio: formData.bio,
                language: formData.language,
                emailNotificationEnabled: formData.emailNotificationEnabled,
            };

            // Add avatar if changed
            if (avatarFile) {
                updateData.avatar = avatarFile;
            }

            // Call API to update profile
            const response = await updateUserProfile(updateData, locale);

            if (response.status === "success") {
                localStorage.setItem("userSettings", JSON.stringify(formData));
                alert(t("profile.saveSuccess"));
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Save failed:", error);
            alert(t("profile.saveError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8 pb-16">
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Avatar Card */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                    <h2 className="mb-1 text-lg font-semibold text-[#261E33]">
                        {t("profile.avatarTitle")}
                    </h2>

                    <p className="mb-6 text-sm text-[#6F6B99]">
                        Chọn bức ảnh đẹp nhất
                    </p>

                    <div className="flex items-center gap-6">
                        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-200">
                            <Image
                                src={avatarPreview}
                                alt="User Avatar"
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />

                            <Button
                                type="button"
                                className="w-[160px] rounded-lg bg-[#261E33] text-white hover:bg-[#1a1424]"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Thay đổi ảnh
                            </Button>

                            <p className="text-xs text-[#9CA3AF]">
                                Tệp hỗ trợ: JPG, PNG (tối đa 5MB)
                            </p>
                        </div>
                    </div>
                </div>

                {/* User Info Card */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                    <h2 className="mb-1 text-lg font-semibold text-[#261E33]">
                        {t("profile.userInfoTitle")}
                    </h2>

                    <p className="mb-6 text-sm text-[#6F6B99]">
                        {t("profile.userInfoSubtitle")}
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#261E33]">
                                {t("profile.firstName")}
                            </label>
                            <Input
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#261E33]">
                                {t("profile.lastName")}
                            </label>
                            <Input
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-sm font-medium text-[#261E33]">
                            {t("profile.email")}
                        </label>
                        <Input value={formData.email} disabled />
                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-sm font-medium text-[#261E33]">
                            {t("profile.phoneNumber")}
                        </label>
                        <Input
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* Bio đúng placeholder như ảnh */}
                    <div className="mt-6">
                        <label className="mb-2 block text-sm font-medium text-[#261E33]">
                            {t("profile.bio")}
                        </label>

                        <textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            rows={4}
                            placeholder="Viết gì đó về bạn..."
                            className="w-full resize-none rounded-lg border border-[#E5E5E5] bg-white p-3 text-sm
                       text-[#261E33] placeholder:text-[#9CA3AF]
                       focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                        />
                    </div>
                </div>

                {/* Preferences Card */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                    <h2 className="mb-1 text-lg font-semibold text-[#261E33]">
                        {t("profile.preferencesTitle")}
                    </h2>

                    <p className="mb-6 text-sm text-[#6F6B99]">
                        {t("profile.preferencesSubtitle")}
                    </p>

                    <label className="mb-2 block text-sm font-medium text-[#261E33]">
                        {t("profile.language")}
                    </label>

                    <select
                        name="language"
                        value={formData.language}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm
                     focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                    >
                        {languages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Notifications Card (Toggle Switch đúng chuẩn) */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                    <h2 className="mb-1 text-lg font-semibold text-[#261E33]">
                        {t("profile.notificationsTitle")}
                    </h2>

                    <p className="mb-6 text-sm text-[#6F6B99]">
                        {t("profile.notificationsSubtitle")}
                    </p>

                    <div className="flex items-center justify-between rounded-lg border border-[#E5E5E5] p-4">
                        <div>
                            <p className="font-medium text-[#261E33]">
                                {t("profile.studioNotifications")}
                            </p>
                            <p className="text-sm text-[#6F6B99]">
                                {t("profile.studioNotificationsDesc")}
                            </p>
                        </div>

                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                name="emailNotificationEnabled"
                                checked={formData.emailNotificationEnabled}
                                onChange={handleInputChange}
                                className="sr-only"
                            />

                            <div
                                className={`h-6 w-11 rounded-full transition-colors ${formData.emailNotificationEnabled
                                    ? "bg-[#2563EB]"
                                    : "bg-[#E5E5E5]"
                                    }`}
                            />

                            <div
                                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${formData.emailNotificationEnabled
                                    ? "translate-x-5"
                                    : "translate-x-0"
                                    }`}
                            />
                        </label>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setFormData(initialData);
                            setAvatarPreview(
                                initialData.avatar || "/images/image-removebg-preview.png"
                            );
                        }}
                    >
                        {t("profile.cancelButton")}
                    </Button>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]"
                    >
                        {isSubmitting
                            ? t("profile.savingButton")
                            : t("profile.saveButton")}
                    </Button>
                </div>
            </form>
        </div>
    );

}

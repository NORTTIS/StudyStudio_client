"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { UpdateProfileRequest, UserProfile } from "@/app/[locale]/(authenticated)/settings/user";
import { deleteUserProfile, updateUserProfile } from "@/app/[locale]/(authenticated)/settings/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const languages = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" }
];

const phoneRegex = /^\d{10,11}$/;

interface SettingsClientProps {
  initialData: UserProfile;
}

export default function SettingsClient({ initialData }: SettingsClientProps) {
  const t = useTranslations("SettingsPage");
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [errors, setErrors] = useState<{ phoneNumber?: string; bio?: string }>({});
  const [avatarPreview, setAvatarPreview] = useState(initialData.avatar || "/images/image-removebg-preview.png");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<UserProfile>(initialData);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("userAvatar");
    const currentLocale = pathname.split("/")[1] || "vi";
    const profileLanguage = initialData.language || currentLocale;

    if (savedAvatar) {
      setAvatarPreview(savedAvatar);
    }

    setFormData((prev) =>
      prev.language === profileLanguage
        ? prev
        : {
            ...prev,
            language: profileLanguage
          }
    );

    localStorage.setItem("preferredLocale", profileLanguage);

    if (profileLanguage !== currentLocale) {
      const pathWithoutLocale = pathname.replace(/^\/(en|vi)/, "");
      const newPath = `/${profileLanguage}${pathWithoutLocale || "/"}`;
      router.replace(newPath);
    }
  }, [initialData.language, pathname, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isEditing) return;

    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === "phoneNumber" || name === "bio") {
      setErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(initialData);
    setAvatarPreview(initialData.avatar || "/images/image-removebg-preview.png");
    setAvatarFile(null);
    setErrors({});
  };

  const validateProfileForm = () => {
    const newErrors: { phoneNumber?: string; bio?: string } = {};
    const trimmedPhoneNumber = formData.phoneNumber?.trim() || "";
    const bioLength = formData.bio?.length || 0;

    if (trimmedPhoneNumber && !phoneRegex.test(trimmedPhoneNumber)) {
      newErrors.phoneNumber = t("profile.phoneNumberInvalid");
    }

    if (bioLength > 500) {
      newErrors.bio = t("profile.bioMaxLength");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const locale = pathname.split("/")[1] || "vi";

      const updateData: UpdateProfileRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio
      };

      if (avatarFile) {
        updateData.avatar = avatarFile;
      }

      const response = await updateUserProfile(updateData, locale);

      if (response.status === "success") {
        localStorage.setItem("userSettings", JSON.stringify(formData));
        toast({
          variant: "success",
          description: response.message || t("profile.saveSuccess")
        });
        setIsEditing(false);
      } else {
        toast({
          variant: "destructive",
          description: response.message || t("profile.saveError")
        });
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        variant: "destructive",
        description: t("profile.saveError")
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = e.target.value;
    const previousLanguage = formData.language;

    if (nextLanguage === previousLanguage || isUpdatingLanguage) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      language: nextLanguage
    }));
    setIsUpdatingLanguage(true);

    try {
      const locale = pathname.split("/")[1] || "vi";
      const response = await updateUserProfile({ language: nextLanguage }, locale);

      if (response.status !== "success") {
        setFormData((prev) => ({
          ...prev,
          language: previousLanguage
        }));
        toast({
          variant: "destructive",
          description: response.message || t("profile.saveError")
        });
        return;
      }

      localStorage.setItem("preferredLocale", nextLanguage);
      localStorage.setItem(
        "userSettings",
        JSON.stringify({
          ...formData,
          language: nextLanguage
        })
      );

      const pathWithoutLocale = pathname.replace(/^\/(en|vi)/, "");
      const newPath = `/${nextLanguage}${pathWithoutLocale || "/"}`;
      toast({
        variant: "success",
        description: response.message || t("profile.saveSuccess")
      });
      router.push(newPath);
    } catch {
      setFormData((prev) => ({
        ...prev,
        language: previousLanguage
      }));
      toast({
        variant: "destructive",
        description: t("profile.saveError")
      });
    } finally {
      setIsUpdatingLanguage(false);
    }
  };

  const handleNotificationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.checked;
    const previousValue = formData.emailNotificationEnabled;

    if (nextValue === previousValue || isUpdatingNotification) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      emailNotificationEnabled: nextValue
    }));
    setIsUpdatingNotification(true);

    try {
      const locale = pathname.split("/")[1] || "vi";
      const response = await updateUserProfile({ emailNotificationEnabled: nextValue }, locale);

      if (response.status !== "success") {
        setFormData((prev) => ({
          ...prev,
          emailNotificationEnabled: previousValue
        }));
        toast({
          variant: "destructive",
          description: response.message || t("profile.saveError")
        });
        return;
      }

      localStorage.setItem(
        "userSettings",
        JSON.stringify({
          ...formData,
          emailNotificationEnabled: nextValue
        })
      );
      toast({
        variant: "success",
        description: response.message || t("profile.saveSuccess")
      });
    } catch {
      setFormData((prev) => ({
        ...prev,
        emailNotificationEnabled: previousValue
      }));
      toast({
        variant: "destructive",
        description: t("profile.saveError")
      });
    } finally {
      setIsUpdatingNotification(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        variant: "destructive",
        description: t("profile.deleteAccount.confirmTextError")
      });
      return;
    }

    setIsDeleting(true);

    try {
      const locale = pathname.split("/")[1] || "vi";
      const response = await deleteUserProfile(locale);

      if (response.status !== "success") {
        toast({
          variant: "destructive",
          description: response.message || t("profile.deleteAccount.error")
        });
        return;
      }

      toast({
        variant: "success",
        description: response.message || t("profile.deleteAccount.success")
      });

      localStorage.clear();
      window.location.href = `/${locale}/login`;
    } catch {
      toast({
        variant: "destructive",
        description: t("profile.deleteAccount.error")
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* User Info Card */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
          <h2 className="mb-1 font-semibold text-[#261E33] text-lg">{t("profile.userInfoTitle")}</h2>

          <p className="mb-6 text-[#6F6B99] text-sm">{t("profile.userInfoSubtitle")}</p>

          <div className="mb-6">
            <h3 className="mb-1 font-medium text-[#261E33] text-sm">{t("profile.avatarTitle")}</h3>
            <p className="mb-4 text-[#6F6B99] text-xs">{t("profile.avatarSupport")}</p>

            <div className="flex items-center gap-6">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-200">
                <Image src={avatarPreview} alt="User Avatar" fill className="object-cover" />
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={!isEditing}
                />

                <Button
                  type="button"
                  className="w-40 rounded-lg bg-[#261E33] text-white hover:bg-[#1a1424] disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isEditing}>
                  {t("profile.changeAvatar")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="mb-2 block font-medium text-[#261E33] text-sm">
                {t("profile.firstName")}
              </label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="mb-2 block font-medium text-[#261E33] text-sm">
                {t("profile.lastName")}
              </label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="email" className="mb-2 block font-medium text-[#261E33] text-sm">
              {t("profile.email")}
            </label>
            <Input id="email" value={formData.email} disabled />
          </div>

          <div className="mt-6">
            <label htmlFor="phoneNumber" className="mb-2 block font-medium text-[#261E33] text-sm">
              {t("profile.phoneNumber")}
            </label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
            {errors.phoneNumber && <p className="mt-1 text-red-500 text-xs">{errors.phoneNumber}</p>}
          </div>

          <div className="mt-6">
            <label htmlFor="bio" className="mb-2 block font-medium text-[#261E33] text-sm">
              {t("profile.bio")}
            </label>

            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              placeholder="Viết gì đó về bạn..."
              disabled={!isEditing}
              className="w-full resize-none rounded-lg border border-[#E5E5E5] bg-white p-3 text-[#261E33] text-sm placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] disabled:cursor-not-allowed disabled:opacity-60"
            />
            {errors.bio && <p className="mt-1 text-red-500 text-xs">{errors.bio}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-4">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {t("profile.cancelButton")}
                </Button>

                <Button type="submit" disabled={isSubmitting} className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                  {isSubmitting ? t("profile.savingButton") : t("profile.saveButton")}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleEdit} className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {t("profile.editButton")}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Preferences Card */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
        <h2 className="mb-1 font-semibold text-[#261E33] text-lg">{t("profile.preferencesTitle")}</h2>

        <p className="mb-6 text-[#6F6B99] text-sm">{t("profile.preferencesSubtitle")}</p>

        <label htmlFor="language" className="mb-2 block font-medium text-[#261E33] text-sm">
          {t("profile.language")}
        </label>

        <select
          id="language"
          name="language"
          value={formData.language}
          onChange={handleLanguageChange}
          disabled={isUpdatingLanguage}
          className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D] disabled:cursor-not-allowed disabled:opacity-60">
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notifications Card */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
        <h2 className="mb-1 font-semibold text-[#261E33] text-lg">{t("profile.notificationsTitle")}</h2>

        <p className="mb-6 text-[#6F6B99] text-sm">{t("profile.notificationsSubtitle")}</p>

        <div className="flex items-center justify-between rounded-lg border border-[#E5E5E5] p-4">
          <div>
            <p className="font-medium text-[#261E33]">{t("profile.studioNotifications")}</p>
            <p className="text-[#6F6B99] text-sm">{t("profile.studioNotificationsDesc")}</p>
          </div>

          <label
            className={`relative inline-flex items-center ${isUpdatingNotification ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              name="emailNotificationEnabled"
              checked={formData.emailNotificationEnabled}
              onChange={handleNotificationChange}
              disabled={isUpdatingNotification}
              className="sr-only"
            />

            <div
              className={`h-6 w-11 rounded-full transition-colors ${
                formData.emailNotificationEnabled ? "bg-[#2563EB]" : "bg-[#E5E5E5]"
              }`}
            />

            <div
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                formData.emailNotificationEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8">
        <h2 className="mb-2 font-semibold text-lg text-red-600">{t("profile.deleteAccount.title")}</h2>
        <p className="mb-6 text-red-600 text-sm">{t("profile.deleteAccount.subtitle")}</p>

        <div className="rounded-lg bg-white p-6">
          <p className="font-medium text-[#261E33] text-sm">{t("profile.deleteAccount.warning")}</p>
          <ul className="mt-3 space-y-1 text-[#6F6B99] text-sm">
            <li>• {t("profile.deleteAccount.consequence1")}</li>
            <li>• {t("profile.deleteAccount.consequence2")}</li>
            <li>• {t("profile.deleteAccount.consequence3")}</li>
          </ul>

          <Button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="mt-6 w-full rounded-lg border-2 border-red-500 bg-white px-6 py-2.5 font-semibold text-red-600 text-sm hover:bg-red-50">
            {t("profile.deleteAccount.button")}
          </Button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <h3 className="mb-2 font-bold text-[#261E33] text-xl">{t("profile.deleteAccount.modalTitle")}</h3>
            <p className="mb-5 text-[#6F6B99] text-sm">{t("profile.deleteAccount.modalSubtitle")}</p>

            <label htmlFor="deleteConfirmText" className="mb-2 block font-semibold text-[#261E33] text-sm">
              {t("profile.deleteAccount.confirmLabel")}
            </label>
            <Input
              id="deleteConfirmText"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="rounded-lg border-red-300 focus:border-red-500 focus:ring-red-500"
            />
            <p className="mt-1 text-[#6F6B99] text-xs">{t("profile.deleteAccount.confirmHint")}</p>

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-[#E5E5E5] bg-white px-6 py-2.5 font-semibold text-[#261E33] text-sm hover:bg-[#F5F5F5]">
                {t("profile.deleteAccount.cancelButton")}
              </Button>
              <Button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== "DELETE"}
                className="flex-1 rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? t("profile.deleteAccount.deleting") : t("profile.deleteAccount.confirmButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

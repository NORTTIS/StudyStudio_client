"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.41 22C3.41 18.13 7.26 15 12 15C16.74 15 20.59 18.13 20.59 22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="5"
      y="11"
      width="14"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 11V7C8 5.93913 8.42143 4.92172 9.17157 4.17157C9.92172 3.42143 10.9391 3 12 3C13.0609 3 14.0783 3.42143 14.8284 4.17157C15.5786 4.92172 16 5.93913 16 7V11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="2"
      y="5"
      width="20"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const languages = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" }
];

export default function SettingsPage() {
  const t = useTranslations("SettingsPage");
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("/images/image-removebg-preview.png");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current locale from pathname
  const currentLocale = pathname.split("/")[1] || "vi";

  const menuItems = [
    { id: "profile", label: t("menu.profile"), icon: <UserIcon /> },
    { id: "security", label: t("menu.security"), icon: <LockIcon /> },
    { id: "billing", label: t("menu.billing"), icon: <CreditCardIcon /> },
    { id: "notifications", label: t("menu.notifications"), icon: <BellIcon /> }
  ];

  const [formData, setFormData] = useState({
    firstName: "Dương",
    lastName: "Trần",
    email: "dat@studist.edu.vn",
    phoneNumber: "0987654321",
    bio: "Phó giáo sư về khoa học máy tính tại đại học. Chuyên về trí tuệ nhân tạo và kỹ thuật phần mềm.",
    language: currentLocale,
    notificationEmail: true
  });

  // Load data from localStorage on mount
  React.useEffect(() => {
    const savedFormData = localStorage.getItem("userSettings");
    const savedAvatar = localStorage.getItem("userAvatar");
    const preferredLocale = localStorage.getItem("preferredLocale");

    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        setFormData({
          ...parsed,
          language: preferredLocale || currentLocale
        });
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    } else if (preferredLocale) {
      setFormData((prev) => ({
        ...prev,
        language: preferredLocale
      }));
    }

    if (savedAvatar) {
      setAvatarPreview(savedAvatar);
    }
  }, [currentLocale]);

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.setItem("userSettings", JSON.stringify(formData));
      console.log("Settings saved:", formData);
      alert(t("profile.saveSuccess"));
    } catch (error) {
      console.error("Save failed:", error);
      alert(t("profile.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header with Notifications */}
      <Header />

      {/* Main Content */}
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/" className="mb-4 inline-flex items-center text-[#6F6B99] text-sm hover:text-[#261E33]">
                ← {t("backToDashboard")}
              </Link>
              <h1 className="flex items-center gap-3 font-bold text-3xl text-[#261E33]">{t("title")}</h1>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left font-medium text-sm transition-all ${
                      activeTab === item.id
                        ? "bg-[#261E33] text-white"
                        : "text-[#6F6B99] hover:bg-[#E5E5E5] hover:text-[#261E33]"
                    }`}>
                    <span className="flex-shrink-0">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1">
              <div className="rounded-2xl bg-white p-8">
                {activeTab === "profile" && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                      <h2 className="mb-4 font-semibold text-[#261E33] text-lg">{t("profile.avatarTitle")}</h2>
                      <div className="flex items-center gap-6">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-[#FF5F3D] to-[#FF8A7A]">
                          <Image
                            src={avatarPreview || "/placeholder.svg"}
                            alt="User Avatar"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            className="bg-[#261E33] text-white hover:bg-[#1a1424]"
                            onClick={() => fileInputRef.current?.click()}>
                            {t("profile.changeAvatar")}
                          </Button>
                          <p className="text-[#9CA3AF] text-xs">{t("profile.avatarSupport")}</p>
                        </div>
                      </div>
                    </div>

                    <hr className="border-[#E5E5E5] border-t" />

                    <div>
                      <h2 className="mb-4 font-semibold text-[#261E33] text-lg">{t("profile.userInfoTitle")}</h2>
                      <p className="mb-6 text-[#6F6B99] text-sm">{t("profile.userInfoSubtitle")}</p>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="firstName" className="mb-2 block font-semibold text-[#261E33] text-sm">
                            {t("profile.firstName")}
                          </label>
                          <Input
                            id="firstName"
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                          />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="mb-2 block font-semibold text-[#261E33] text-sm">
                            {t("profile.lastName")}
                          </label>
                          <Input
                            id="lastName"
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                          />
                        </div>
                      </div>
                      <div className="mt-6">
                        <label htmlFor="email" className="mb-2 block font-semibold text-[#261E33] text-sm">
                          {t("profile.email")}
                        </label>
                        <Input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                        />
                      </div>
                      <div className="mt-6">
                        <label htmlFor="phoneNumber" className="mb-2 block font-semibold text-[#261E33] text-sm">
                          {t("profile.phoneNumber")}
                        </label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                        />
                      </div>
                      <div className="mt-6">
                        <label htmlFor="bio" className="mb-2 block font-semibold text-[#261E33] text-sm">
                          {t("profile.bio")}
                        </label>
                        <textarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full rounded-lg border border-[#E5E5E5] bg-white p-3 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                          placeholder={t("profile.bioPlaceholder")}
                        />
                      </div>
                    </div>

                    <hr className="border-[#E5E5E5] border-t" />

                    <div>
                      <h2 className="mb-4 font-semibold text-[#261E33] text-lg">{t("profile.preferencesTitle")}</h2>
                      <p className="mb-6 text-[#6F6B99] text-sm">{t("profile.preferencesSubtitle")}</p>
                      <div>
                        <label htmlFor="language" className="mb-2 block font-semibold text-[#261E33] text-sm">
                          {t("profile.language")}
                        </label>
                        <select
                          id="language"
                          name="language"
                          value={formData.language}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-[#261E33] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]">
                          {languages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <hr className="border-[#E5E5E5] border-t" />

                    <div>
                      <h2 className="mb-4 font-semibold text-[#261E33] text-lg">{t("profile.notificationsTitle")}</h2>
                      <p className="mb-6 text-[#6F6B99] text-sm">{t("profile.notificationsSubtitle")}</p>
                      <div className="flex items-center justify-between rounded-lg border border-[#E5E5E5] p-4">
                        <div>
                          <p className="font-medium text-[#261E33]">{t("profile.studioNotifications")}</p>
                          <p className="text-[#6F6B99] text-sm">{t("profile.studioNotificationsDesc")}</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            name="notificationEmail"
                            checked={formData.notificationEmail}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          <div
                            className={`h-6 w-11 rounded-full transition-colors ${formData.notificationEmail ? "bg-[#2563EB]" : "bg-[#E5E5E5]"}`}
                          />
                          <div
                            className={`absolute h-5 w-5 rounded-full bg-white transition-transform ${formData.notificationEmail ? "translate-x-5" : "translate-x-0.5"}`}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-8">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg border border-[#E5E5E5] bg-white px-6 py-2 text-[#261E33] hover:bg-[#F8F9FB]"
                        onClick={() => {
                          const savedFormData = localStorage.getItem("userSettings");
                          const savedAvatar = localStorage.getItem("userAvatar");
                          if (savedFormData) setFormData(JSON.parse(savedFormData));
                          if (savedAvatar) setAvatarPreview(savedAvatar);
                        }}>
                        {t("profile.cancelButton")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-lg bg-[#FF5F3D] px-6 py-2 text-white hover:bg-[#ff4620] disabled:opacity-50">
                        {isSubmitting ? t("profile.savingButton") : t("profile.saveButton")}
                      </Button>
                    </div>
                  </form>
                )}

                {activeTab === "security" && (
                  <div className="py-12 text-center">
                    <p className="text-[#6F6B99]">{t("security.comingSoon")}</p>
                  </div>
                )}

                {activeTab === "billing" && (
                  <div className="py-12 text-center">
                    <p className="text-[#6F6B99]">{t("billing.comingSoon")}</p>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="py-12 text-center">
                    <p className="text-[#6F6B99]">{t("notifications.comingSoon")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

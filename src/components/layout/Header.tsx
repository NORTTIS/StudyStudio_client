"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/api/auth";
import { NotificationDropdown } from "@/components/common/NotificationDropdown";

/* ================= ICONS ================= */

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
            d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
        <path
            d="M19 19L14.65 14.65"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
            d="M19.4 15C19.27 15.3 19.23 15.64 19.29 15.96C19.35 16.28 19.5 16.58 19.73 16.82L19.79 16.88C20.12 17.21 20.31 17.66 20.31 18.13C20.31 18.6 20.12 19.05 19.79 19.38C19.46 19.71 19.01 19.9 18.54 19.9C18.07 19.9 17.62 19.71 17.29 19.38"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const LogoutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
            d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M16 17L21 12L16 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M21 12H9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
            d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z"
            stroke="currentColor"
            strokeWidth="2"
        />
        <path
            d="M3.41 22C3.41 18.13 7.26 15 12 15C16.74 15 20.59 18.13 20.59 22"
            stroke="currentColor"
            strokeWidth="2"
        />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

/* ================= HEADER ================= */

export function Header() {
    const t = useTranslations("Header");
    const router = useRouter();
    const locale = useLocale();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const userMenuRef = useRef<HTMLDivElement>(null);

    /* User Data */
    const getUserData = () => {
        if (typeof window !== "undefined") {
            const settings = localStorage.getItem("userSettings");
            const avatar = localStorage.getItem("userAvatar");

            if (settings) {
                const data = JSON.parse(settings);
                return {
                    name: `${data.firstName} ${data.lastName}`,
                    email: data.email,
                    avatar: avatar || "/images/image-removebg-preview.png",
                };
            }
        }

        return {
            name: "John Doe",
            email: "john@example.com",
            avatar: "/images/image-removebg-preview.png",
        };
    };

    const userData = getUserData();

    /* Close menu outside */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target as Node)
            ) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /* Logout */
    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            await logout(locale);

            localStorage.removeItem("userSettings");
            localStorage.removeItem("userAvatar");

            router.push(`/${locale}/login`);
        } catch (error) {
            console.error("Logout error:", error);
            router.push(`/${locale}/login`);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        /* ✅ FIXED HEADER DÍNH SÁT TRÊN + SÁT SIDEBAR */
        <header className="fixed top-0 left-64 right-0 z-50 h-16 border-b border-[#E5E5E5] bg-white">
            <div className="flex h-16 items-center gap-6 px-6">
                {/* SEARCH */}
                <div className="flex flex-1">
                    <div className="relative w-full max-w-[650px]">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9CA3AF]">
                            <SearchIcon />
                        </div>

                        <input
                            type="text"
                            placeholder={t("searchPlaceholder")}
                            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9F9F9] py-2 pr-4 pl-10 text-sm text-[#261E33]
              placeholder:text-[#9CA3AF]
              focus:border-[#FF5F3D] focus:outline-none focus:ring-1 focus:ring-[#FF5F3D]"
                        />
                    </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-3 justify-end">
                    <NotificationDropdown />

                    {/* USER MENU */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[#F4F5FA]"
                        >
                            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[#FF5F3D]">
                                <Image
                                    src={userData.avatar}
                                    alt={userData.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            <div className="hidden text-left md:block leading-tight">
                                <p className="font-medium text-[#261E33] text-sm">
                                    {userData.name}
                                </p>
                                <p className="text-[#9CA3AF] text-xs">{userData.email}</p>
                            </div>

                            <ChevronDownIcon />
                        </button>

                        {/* DROPDOWN */}
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-[#E5E5E5] bg-white shadow-xl">
                                <div className="border-b border-[#E5E5E5] px-4 py-3">
                                    <p className="font-semibold text-sm text-[#261E33]">
                                        {userData.name}
                                    </p>
                                    <p className="text-xs text-[#9CA3AF]">{userData.email}</p>
                                </div>

                                <div className="py-2">
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-[#6F6B99] hover:bg-[#F4F5FA] hover:text-[#261E33]"
                                    >
                                        <SettingsIcon />
                                        {t("settings")}
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-[#6F6B99] hover:bg-[#F4F5FA] hover:text-[#261E33]"
                                    >
                                        <UserIcon />
                                        {t("profile")}
                                    </Link>
                                </div>

                                <div className="border-t border-[#E5E5E5] py-2">
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <LogoutIcon />
                                        {isLoggingOut ? t("loggingOut") : t("logout")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

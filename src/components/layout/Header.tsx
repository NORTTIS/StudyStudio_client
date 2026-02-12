"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/api/auth";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import { NotificationDropdown } from "@/components/common/NotificationDropdown";

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
            d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const LogoutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

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

const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

interface HeaderProps {
    userProfile?: UserProfile | null;
}

export function Header({ userProfile: userProfileProp }: HeaderProps = {}) {
    const t = useTranslations("Header");
    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(userProfileProp || null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(!userProfileProp);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Fetch user profile on mount only if not provided via props
    useEffect(() => {
        if (userProfileProp) {
            setUserProfile(userProfileProp);
            setIsLoadingProfile(false);
            return;
        }

        const fetchUserProfile = async () => {
            try {
                const result = await getUserProfile(locale);
                if (result.status === "success" && result.data) {
                    setUserProfile(result.data);

                    // Update locale if user's preferred language is different
                    if (result.data.language && result.data.language !== locale) {
                        // Extract the path without locale prefix
                        const pathWithoutLocale = pathname.replace(`/${locale}`, "");
                        router.push(`/${result.data.language}${pathWithoutLocale}`);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchUserProfile();
    }, [locale, pathname, router, userProfileProp]);

    // Get user display data
    const getUserData = () => {
        if (userProfile) {
            // Replace localhost with 127.0.0.1 for Next.js Image optimization
            const avatarUrl = userProfile.avatarUrl
                ? userProfile.avatarUrl.replace("localhost", "127.0.0.1")
                : "/images/image-removebg-preview.png";

            return {
                name: `${userProfile.firstName} ${userProfile.lastName}`,
                email: userProfile.email,
                avatar: avatarUrl
            };
        }
        return {
            name: "John Doe",
            email: "john@example.com",
            avatar: "/images/image-removebg-preview.png"
        };
    };

    const userData = getUserData();

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            // Call logout API
            await logout(locale);

            // Clear user session data
            if (typeof window !== "undefined") {
                localStorage.removeItem("userSettings");
                localStorage.removeItem("userAvatar");
            }

            // Redirect to login
            router.push(`/${locale}/login`);
        } catch (error) {
            console.error("Logout error:", error);
            // Still redirect even if API fails since tokens are cleared
            router.push(`/${locale}/login`);
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Show loading state while fetching profile
    if (isLoadingProfile) {
        return (
            <header className="sticky top-0 z-40 border-[#E5E5E5] border-b bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="sticky top-0 z-40 border-[#E5E5E5] border-b bg-white">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5F3D]">
                        <span className="font-bold text-sm text-white">SS</span>
                    </div>
                    <span className="hidden font-bold text-[#261E33] sm:block">Study Studio</span>
                </Link>

                {/* Search Bar */}
                <div className="hidden max-w-md flex-1 md:block">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder={t("searchPlaceholder")}
                            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9F9F9] py-2 pr-4 pl-10 text-[#261E33] text-sm placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:outline-none focus:ring-1 focus:ring-[#FF5F3D]"
                        />
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* User Menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[#F4F5FA]">
                            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-linear-to-br from-[#FF5F3D] to-[#FF8A7A]">
                                <Image src={userData.avatar} alt={userData.name} fill className="object-cover" />
                            </div>
                            <div className="hidden text-left md:block">
                                <p className="font-medium text-[#261E33] text-sm">{userData.name}</p>
                                <p className="text-[#9CA3AF] text-xs">{userData.email}</p>
                            </div>
                            <ChevronDownIcon />
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-[#E5E5E5] bg-white shadow-xl">
                                {/* User Info */}
                                <div className="border-[#E5E5E5] border-b px-4 py-3">
                                    <p className="font-semibold text-[#261E33] text-sm">{userData.name}</p>
                                    <p className="text-[#9CA3AF] text-xs">{userData.email}</p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-2">
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-3 px-4 py-2 text-[#6F6B99] text-sm transition-colors hover:bg-[#F4F5FA] hover:text-[#261E33]">
                                        <SettingsIcon />
                                        <span>{t("settings")}</span>
                                    </Link>
                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-3 px-4 py-2 text-[#6F6B99] text-sm transition-colors hover:bg-[#F4F5FA] hover:text-[#261E33]">
                                        <UserIcon />
                                        <span>{t("profile")}</span>
                                    </Link>
                                </div>

                                {/* Logout */}
                                <div className="border-[#E5E5E5] border-t py-2">
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-red-600 text-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        <LogoutIcon />
                                        <span>{isLoggingOut ? t("loggingOut") : t("logout")}</span>
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

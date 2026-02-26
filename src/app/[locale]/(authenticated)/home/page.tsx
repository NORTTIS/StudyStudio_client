"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { getUserProfile, type UserProfile } from "@/api/user-profile";
import HomePage from "@/components/features/home/Home";
import type { HomeData } from "@/components/features/home/types";
import { mockHomeData } from "@/mocks/home-data";

export default function Home() {
    const locale = useLocale();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [homeData, setHomeData] = useState<HomeData>(mockHomeData);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const result = await getUserProfile(locale);
                if (result.status === "success" && result.data) {
                    setUserProfile(result.data);

                    // Update homeData with user initials
                    const initials =
                        `${result.data.firstName.charAt(0)}${result.data.lastName.charAt(0)}`.toUpperCase();
                    setHomeData({
                        ...mockHomeData,
                        userInitials: initials
                    });
                    console.log("User initials:", initials);
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [locale]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8]">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }
    console.log("Rendering HomePage with userProfile:", userProfile);

    return <HomePage data={homeData} userProfile={userProfile} />;
}

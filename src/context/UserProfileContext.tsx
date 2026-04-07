"use client";

import * as React from "react";
import { getUserProfile, type UserProfile } from "@/api/user-profile";

interface UserProfileContextValue {
    profile: UserProfile | null;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const UserProfileContext = React.createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = React.useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const fetchAttempted = React.useRef(false);

    const fetchProfile = React.useCallback(async () => {
        if (fetchAttempted.current) return;
        fetchAttempted.current = true;

        try {
            const result = await getUserProfile("vi");
            if (result.status === "success" && result.data) {
                setProfile(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    const refresh = React.useCallback(async () => {
        fetchAttempted.current = false;
        setIsLoading(true);
        await fetchProfile();
    }, [fetchProfile]);

    return (
        <UserProfileContext.Provider value={{ profile, isLoading, refresh }}>
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const context = React.useContext(UserProfileContext);
    if (!context) {
        throw new Error("useUserProfile must be used within UserProfileProvider");
    }
    return context;
}

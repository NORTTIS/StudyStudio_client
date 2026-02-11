import { serverFetchApi } from "@/api/server-client";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import SettingsClient from "@/components/features/settings/SettingsClient";

interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    bio: string;
    avatar?: string;
}

interface UserSettings extends UserProfile {
    language: string;
    notificationEmail: boolean;
}

export default async function SettingsPage() {
    // Fetch user profile data from API
    const { data, status } = await serverFetchApi.GET<UserSettings>("/user/profile");

    // Log error to console and return error component if API fails
    if (status === "error" || !data) {
        console.error("[Settings Page] Failed to load user settings:", { status });
        return <ErrorDisplay message="Không thể tải thông tin cài đặt" />;
    }

    return <SettingsClient initialData={data} />;
}


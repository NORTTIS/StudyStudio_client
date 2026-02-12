import { serverFetchApi } from "@/api/server-client";
import type { UserProfile } from "@/app/[locale]/(authenticated)/settings/user";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import SettingsClient from "@/components/features/settings/SettingsClient";

export default async function SettingsPage() {
    const response = await serverFetchApi.GET<UserProfile>("/user-profile");


    // Log error to console and return error component if API fails
    if (response.status === "error" || !response.data) {
        console.error("[Settings Page] Failed to load user settings:", response);
        return <ErrorDisplay message={`Không thể tải thông tin cài đặt: ${response.message}`} />;
    }
    console.log("SettingsPage fetched user profile:", response.data);

    return <SettingsClient initialData={response.data} />;
}


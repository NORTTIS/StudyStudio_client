import { serverFetchApi } from "@/api/server-client";
import type { components } from "@/api/types";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import SettingsClient from "@/components/features/settings/SettingsClient";

export default async function SettingsPage() {
    type UserProfileResponse = components["schemas"]["UserProfileResponse"];
    const response = await serverFetchApi.GET<UserProfileResponse>("/user-profile");

    // Log error to console and return error component if API fails
    if (response.status === "error" || !response.data) {
        console.error("[Settings Page] Failed to load user settings:", response);
        return <ErrorDisplay message="Không thể tải thông tin cài đặt" />;
    }
    console.log("SettingsPage fetched user profile:", response.data);

    return <SettingsClient initialData={response.data} />;
}

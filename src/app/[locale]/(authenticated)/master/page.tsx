import { serverFetchApi } from "@/api/server-client";
import type { StudioUI } from "@/api/studios";
import type { components } from "@/api/types";
import type { UserProfile } from "@/api/user-profile";
import MasterPageClient from "@/components/features/master/MasterPageClient";
import { mockStudios } from "@/mocks/studios-data";

type UserProfileResponse = components["schemas"]["UserProfileResponse"];
type StudioResponse = components["schemas"]["StudioResponse"];

const mapUserProfile = (profile: UserProfileResponse): UserProfile => ({
    userId: profile.userId || "",
    aiDailyLimit: profile.aiDailyLimit,
    aiRequestsRemaining: profile.aiRequestsRemaining,
    aiRequestsUsedToday: profile.aiRequestsUsedToday,
    email: profile.email || "",
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    phoneNumber: profile.phoneNumber || "",
    bio: profile.bio || "",
    avatarUrl: profile.avatarUrl || "",
    status: profile.status || "",
    isAdmin: profile.isAdmin ?? false,
    language: profile.language || "vi",
    emailNotificationEnabled: profile.emailNotificationEnabled ?? false,
    googleId: profile.googleId || null,
    createdAt: profile.createdAt || "",
    updatedAt: profile.updatedAt || ""
});

const mapStudioToUI = (studio: StudioResponse): StudioUI => ({
    id: studio.studioId || "",
    name: studio.studioName || "",
    description: studio.description || "",
    type: "group",
    memberCount: 0,
    groupCount: studio.groupCount || 0,
    completionProgress: 0,
    createdAt: studio.createdAt || "",
    updatedAt: studio.updatedAt || ""
});

export default async function MasterPage() {
    const [profileResponse, studiosResponse] = await Promise.all([
        serverFetchApi.GET<UserProfileResponse>("/user-profile"),
        serverFetchApi.GET<StudioResponse[]>("/studio")
    ]);

    const initialUserProfile =
        profileResponse.status === "success" && profileResponse.data ? mapUserProfile(profileResponse.data) : null;

    const initialStudios =
        studiosResponse.status === "success" && Array.isArray(studiosResponse.data)
            ? studiosResponse.data.map(mapStudioToUI)
            : mockStudios;

    return <MasterPageClient initialUserProfile={initialUserProfile} initialStudios={initialStudios} />;
}

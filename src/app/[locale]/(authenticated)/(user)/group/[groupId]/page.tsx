import { redirect } from "next/navigation";
import { serverFetchApi } from "@/api/server-client";
import ErrorDisplay from "@/components/common/ErrorDisplay";
import { GroupBoardScreen } from "@/components/features/group/board/GroupBoardScreen";

function isUuidLike(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value ?? "").trim()
    );
}

export default async function Page({ params }: { params: Promise<{ locale: string; groupId: string }> }) {
    const resolvedParams = await params;
    const groupId = String(resolvedParams.groupId ?? "").trim();

    if (!isUuidLike(groupId)) {
        redirect(`/${resolvedParams.locale}/group-access-denied?reason=not_found`);
    }

    const response = await serverFetchApi.GET(`/group/${encodeURIComponent(groupId)}/detail`, {
        headers: {
            "Accept-Language": resolvedParams.locale
        }
    });

    if (response.status === "error") {
        if (response.code === "HTTP_401") {
            const redirectPath = encodeURIComponent(`/${resolvedParams.locale}/group/${groupId}`);
            redirect(`/${resolvedParams.locale}/login?redirect=${redirectPath}&fromLogin=1`);
        }

        if (response.code === "HTTP_403") {
            redirect(`/${resolvedParams.locale}/group-access-denied?reason=forbidden`);
        }

        if (response.code === "HTTP_404") {
            redirect(`/${resolvedParams.locale}/group-access-denied?reason=not_found`);
        }

        // 429 Rate Limit: do NOT show error display — just pass the error to the client
        // GroupShell (client component) will handle showing toast + keep existing data
        if (response.code === "RATE_LIMIT_EXCEEDED") {
            console.warn("[GroupBoardPage] Rate limit exceeded, keeping existing state");
            return <GroupBoardScreen />;
        }

        console.error("[GroupBoardPage] Failed to load group detail on the server", {
            locale: resolvedParams.locale,
            groupId,
            status: response.status,
            code: response.code ?? null,
            message: response.message ?? null
        });

        return <ErrorDisplay message={response.message || "Unable to open this group right now."} />;
    }

    if (!response.data) {
        console.error("[GroupBoardPage] Group detail response was missing data", {
            locale: resolvedParams.locale,
            groupId,
            status: response.status
        });

        return <ErrorDisplay message="Unable to open this group right now." />;
    }

    return <GroupBoardScreen />;
}

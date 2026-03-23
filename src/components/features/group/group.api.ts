import type { components, paths } from "@/api/types";
import type { Group, GroupRole, GroupsPageData } from "./types";

type GetGroupsResponse =
    | paths["/api/group"]["get"]["responses"][200]["content"]["application/json"]
    | paths["/api/group"]["get"]["responses"][200]["content"]["text/json"]
    | paths["/api/group"]["get"]["responses"][200]["content"]["text/plain"];

type GroupListResponse = NonNullable<GetGroupsResponse["data"]>;
type GroupSections = NonNullable<GroupListResponse["sections"]>;
type SubscriptionInfo = NonNullable<GroupListResponse["subscription"]>;
type GroupCardDto = NonNullable<NonNullable<GroupSections["favorites"]>[number]>;

type RequestDocumentUploadRequest = components["schemas"]["RequestDocumentUploadRequest"];
type DocumentItem = components["schemas"]["DocumentItem"];
type AIQuestionRequest = components["schemas"]["AIQuestionRequest"];
type AIAnswerResponse = components["schemas"]["AIAnswerResponse"];

type RequestDocumentUploadResponseApi =
    | paths["/api/documents/request-upload"]["post"]["responses"][200]["content"]["application/json"]
    | paths["/api/documents/request-upload"]["post"]["responses"][200]["content"]["text/json"]
    | paths["/api/documents/request-upload"]["post"]["responses"][200]["content"]["text/plain"];

type GroupDocumentsResponseApi =
    | paths["/api/documents/group/{groupId}"]["get"]["responses"][200]["content"]["application/json"]
    | paths["/api/documents/group/{groupId}"]["get"]["responses"][200]["content"]["text/json"]
    | paths["/api/documents/group/{groupId}"]["get"]["responses"][200]["content"]["text/plain"];

type DocumentDownloadUrlResponseApi =
    | paths["/api/documents/{attachmentId}/download"]["get"]["responses"][200]["content"]["application/json"]
    | paths["/api/documents/{attachmentId}/download"]["get"]["responses"][200]["content"]["text/json"]
    | paths["/api/documents/{attachmentId}/download"]["get"]["responses"][200]["content"]["text/plain"];

type AIAskResponseApi =
    | paths["/api/ai/ask"]["post"]["responses"][200]["content"]["application/json"]
    | paths["/api/ai/ask"]["post"]["responses"][200]["content"]["text/json"]
    | paths["/api/ai/ask"]["post"]["responses"][200]["content"]["text/plain"];

type AIAskStreamRequest = NonNullable<
    paths["/api/ai/ask/stream"]["post"]["requestBody"]
>["content"]["application/json"];

function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || "";
}

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
}

function toInitials(firstName?: string | null, lastName?: string | null) {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    const a = f ? f[0].toUpperCase() : "";
    const b = l ? l[0].toUpperCase() : "";
    const res = `${a}${b}`.trim();
    return res || "U";
}

function toShortCode(name: string) {
    const words = (name || "").trim().split(/\s+/).filter(Boolean);
    return words
        .slice(0, 3)
        .map((w) => w[0].toUpperCase())
        .join("");
}

export function mapRole(role?: string | null): GroupRole {
    const r = (role || "").toLowerCase().trim();
    if (r.includes("owner")) return "owner";
    if (r.includes("moderator")) return "moderator";
    if (r.includes("member")) return "member";
    if (r.includes("commenter")) return "commenter";
    if (r.includes("viewer")) return "viewer";
    if (r === "admin") return "owner";
    return "member";
}

function mapGroup(item: GroupCardDto): Group {
    const name = item.name || "";
    const preview = item.membersPreview || [];

    return {
        id: item.id || "",
        title: name,
        description: item.description || "",
        role: mapRole(item.role),
        membersCount: item.memberCount ?? 0,
        tasksCount: item.taskCount ?? 0,
        createdByInitials: toInitials(item.createdBy?.firstName, item.createdBy?.lastName),
        memberInitials: preview.map((u) => toInitials(u.firstName, u.lastName)),
        isStarred: !!item.isFavorite,
        tag: item.studio?.name || undefined,
        shortCode: toShortCode(name)
    };
}

export async function fetchGroupsPageData(): Promise<GroupsPageData> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/group`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(
            res.status === 401 ? "Unauthorized: thiếu token hoặc token hết hạn" : `Request failed: ${res.status}`
        );
    }

    const json = (await res.json()) as GetGroupsResponse;

    const data = json.data;
    const subscription = data?.subscription as SubscriptionInfo | undefined;
    const sections = data?.sections as GroupSections | undefined;

    const favoriteItems = ((sections?.favorites || []) as GroupCardDto[]).filter(Boolean);
    const managedItems = ((sections?.studioGroups || []) as GroupCardDto[]).filter(Boolean);
    const independentItems = ((sections?.independentGroups || []) as GroupCardDto[]).filter(Boolean);

    const favorites = favoriteItems.map(mapGroup);
    const managed = managedItems.map(mapGroup);
    const independent = independentItems.map(mapGroup);

    return {
        usage: {
            current: subscription?.groupCreated ?? 0,
            max: subscription?.groupLimit ?? 0
        },
        favorites,
        managed,
        independent
    };
}

async function apiFetch(path: string, method: "POST" | "DELETE", body: unknown) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            res.status === 401
                ? "Unauthorized: thiếu token hoặc token hết hạn"
                : text || `Request failed: ${res.status}`
        );
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return null;
}

export async function addFavourite(groupId: string) {
    return apiFetch("/favourite/add", "POST", { groupId });
}

export async function removeFavourite(groupId: string) {
    return apiFetch("/favourite/remove", "DELETE", { groupId });
}

export async function requestDocumentUpload(payload: RequestDocumentUploadRequest) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/request-upload`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const json = (await res.json()) as RequestDocumentUploadResponseApi;
    if (!(json.data?.attachmentId && json.data?.uploadUrl)) {
        throw new Error(json.message || "Invalid upload response");
    }

    return json.data;
}

export async function completeDocumentUpload(attachmentId: string) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/${attachmentId}/complete`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }
}

export async function fetchGroupDocuments(groupId: string): Promise<DocumentItem[]> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/group/${groupId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const json = (await res.json()) as GroupDocumentsResponseApi;
    return (json.data?.documents || []).filter((item): item is DocumentItem => !!item);
}

export async function deleteGroupDocument(attachmentId: string) {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/documents/${attachmentId}`, {
        method: "DELETE",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }
}

export async function getDocumentDownloadUrl(attachmentId: string, expirationMinutes?: number) {
    const baseUrl = getBaseUrl();
    const token = getToken();
    const query =
        typeof expirationMinutes === "number" ? `?expirationMinutes=${encodeURIComponent(expirationMinutes)}` : "";

    const res = await fetch(`${baseUrl}/documents/${attachmentId}/download${query}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const json = (await res.json()) as DocumentDownloadUrlResponseApi;
    if (!json.data?.downloadUrl) {
        throw new Error(json.message || "Missing download url");
    }

    return json.data.downloadUrl;
}

export function toOptionalNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function extractRemainingRequests(json: AIAskResponseApi, headers: Headers): number | null {
    const candidates: unknown[] = [
        (json as { data?: { remainingRequests?: unknown } }).data?.remainingRequests,
        (json as { data?: { requestRemaining?: unknown } }).data?.requestRemaining,
        (json as { data?: { remainingRequestCount?: unknown } }).data?.remainingRequestCount,
        (json as { remainingRequests?: unknown }).remainingRequests,
        (json as { requestRemaining?: unknown }).requestRemaining,
        headers.get("x-requests-remaining"),
        headers.get("x-request-remaining"),
        headers.get("x-ai-requests-remaining")
    ];

    for (const candidate of candidates) {
        const n = toOptionalNumber(candidate);
        if (n != null) return n;
    }

    return null;
}

function extractRemainingRequestsFromHeaders(headers: Headers): number | null {
    const candidates: unknown[] = [
        headers.get("x-requests-remaining"),
        headers.get("x-request-remaining"),
        headers.get("x-ai-requests-remaining")
    ];

    for (const candidate of candidates) {
        const n = toOptionalNumber(candidate);
        if (n != null) return n;
    }

    return null;
}

async function extractApiErrorMessage(res: Response): Promise<string> {
    const text = await res.text().catch(() => "");
    if (!text) return `Request failed: ${res.status}`;

    try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
            return parsed.message;
        }
    } catch {
        // ignore
    }

    return text;
}

function parseSseChunk(data: string): string {
    const trimmed = data.trim();
    if (!trimmed || trimmed === "[DONE]") return "";

    try {
        const parsed = JSON.parse(trimmed) as {
            type?: string;
            content?: unknown;
            message?: unknown;
        };

        switch (parsed.type) {
            case "chunk":
                return typeof parsed.content === "string" ? parsed.content : "";
            case "metadata":
                return "";
            case "done":
                return "";
            case "error":
                throw new Error(typeof parsed.message === "string" ? parsed.message : "AI error");
            default:
                return "";
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        return data;
    }
}

type ParsedSseBlock = {
    chunk: string;
    done: boolean;
    metadata?: {
        remainingRequests: number | null;
        dailyLimit: number | null;
    };
};

export function parseSseBlock(block: string, options?: {
    onMetadata?: (metadata: { remainingRequests: number | null; dailyLimit: number | null }) => void;
}): ParsedSseBlock {
    if (!block.trim()) return { chunk: "", done: false };

    const dataLines = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

    const raw = dataLines.length === 0 ? block : dataLines.join("\n");
    const trimmed = raw.trim();
    if (!trimmed) return { chunk: "", done: false };
    if (trimmed === "[DONE]") return { chunk: "", done: true };

    try {
        const parsed = JSON.parse(trimmed) as {
            type?: unknown;
            message?: unknown;
            remainingRequests?: unknown;
            dailyLimit?: unknown;
        };

        if (parsed.type === "done") return { chunk: "", done: true };
        if (parsed.type === "error") {
            throw new Error(typeof parsed.message === "string" ? parsed.message : "AI error");
        }

        // Xử lý metadata event - extract remainingRequests và dailyLimit
        if (parsed.type === "metadata") {
            const remainingRequests = toOptionalNumber(parsed.remainingRequests);
            const dailyLimit = toOptionalNumber(parsed.dailyLimit);

            if (remainingRequests !== null || dailyLimit !== null) {
                const metadata = { remainingRequests, dailyLimit };
                options?.onMetadata?.(metadata);
                return { chunk: "", done: false, metadata };
            }
        }

        // No type field — treat as raw data, not a structured SSE event
        if (parsed.type === undefined || parsed.type === null) {
            return { chunk: "", done: false };
        }

        return { chunk: parseSseChunk(raw), done: false };
    } catch (error) {
        if (error instanceof Error) throw error;
    }

    // Fallback for non-JSON content
    return { chunk: parseSseChunk(raw), done: false };
}

export type AskGroupAiResult = {
    answer: AIAnswerResponse;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

export async function askGroupAi(payload: AIQuestionRequest): Promise<AskGroupAiResult> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/ai/group/ask`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res));
    }

    const json = (await res.json()) as AIAskResponseApi;
    if (!json.data) {
        throw new Error(json.message || "Empty AI response");
    }

    return {
        answer: json.data,
        remainingRequests: extractRemainingRequests(json, res.headers),
        dailyLimit: toOptionalNumber((json as { data?: { dailyLimit?: unknown } }).data?.dailyLimit)
    };
}

export async function askGroupAiStream(
    payload: AIAskStreamRequest,
    options?: {
        onChunk?: (fullText: string, delta: string) => void;
        onMetadata?: (metadata: { remainingRequests: number | null; dailyLimit: number | null }) => void;
    }
): Promise<AskGroupAiResult> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/ai/group/ask/stream`, {
        method: "POST",
        headers: {
            Accept: "text/event-stream, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res));
    }

    const body = res.body;
    if (!body) {
        throw new Error("Empty AI response");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let doneByEvent = false;
    let remainingRequests: number | null = null;
    let dailyLimit: number | null = null;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
            const parsed = parseSseBlock(block, {
                onMetadata: (metadata) => {
                    if (metadata.remainingRequests !== null) {
                        remainingRequests = metadata.remainingRequests;
                    }
                    if (metadata.dailyLimit !== null) {
                        dailyLimit = metadata.dailyLimit;
                    }
                    options?.onMetadata?.(metadata);
                }
            });
            if (parsed.chunk) {
                answer += parsed.chunk;
                options?.onChunk?.(answer, parsed.chunk);
            }
            if (parsed.done) {
                doneByEvent = true;
                break;
            }
        }

        if (doneByEvent) break;
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
        const parsed = parseSseBlock(buffer, {
            onMetadata: (metadata) => {
                if (metadata.remainingRequests !== null) {
                    remainingRequests = metadata.remainingRequests;
                }
                if (metadata.dailyLimit !== null) {
                    dailyLimit = metadata.dailyLimit;
                }
                options?.onMetadata?.(metadata);
            }
        });
        if (parsed.chunk) {
            answer += parsed.chunk;
            options?.onChunk?.(answer, parsed.chunk);
        }
    }

    const finalAnswer = answer.trim();
    if (!finalAnswer) {
        throw new Error("Empty AI response");
    }

    return {
        answer: {
            answer: finalAnswer
        },
        remainingRequests: remainingRequests ?? extractRemainingRequestsFromHeaders(res.headers),
        dailyLimit
    };
}

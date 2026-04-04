import { apiGet } from "./api-client";
import { parseSseBlock } from "@/components/features/group/group.api";
import type { components } from "./types";
import { sanitizeErrorMessage } from "@/utils/error-message";

function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || "";
}

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
}

function toOptionalNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
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
    if (!text) return "Đã xảy ra lỗi";

    try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
            return sanitizeErrorMessage(parsed.message, "Đã xảy ra lỗi");
        }
    } catch {
        // ignore
    }

    return sanitizeErrorMessage(text, "Đã xảy ra lỗi");
}

export type AskStudioAiResult = {
    answer: string;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

export async function askStudioAiStream(
    studioId: string,
    payload: { question: string },
    options?: {
        onChunk?: (fullText: string, delta: string) => void;
        onMetadata?: (metadata: { remainingRequests: number | null; dailyLimit: number | null }) => void;
    }
): Promise<AskStudioAiResult> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/ai/master/ask/stream`, {
        method: "POST",
        headers: {
            Accept: "text/event-stream, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ studioId, question: payload.question }),
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
        answer: finalAnswer,
        remainingRequests: remainingRequests ?? extractRemainingRequestsFromHeaders(res.headers),
        dailyLimit
    };
}

export async function getStudioAiInfo(studioId: string) {
    return apiGet<components["schemas"]["AIResponse"]>(`/ai/master/info/${studioId}`);
}

export async function getStudioAiSuggestions(studioId: string) {
    return apiGet<components["schemas"]["AIResponse"]>(`/ai/master/suggestions/${studioId}`);
}

export async function getStudioAiStats(studioId: string) {
    return apiGet<components["schemas"]["AIResponse"]>(`/ai/master/stats/${studioId}`);
}

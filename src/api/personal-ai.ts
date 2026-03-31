import { apiGet, apiPost } from "./api-client";
import { parseSseBlock, toOptionalNumber } from "@/components/features/group/group.api";
import type { components } from "./types";

export type PersonalAIQuestionRequest = components["schemas"]["PersonalAIRequest"];

type AIMetadata = { remainingRequests: number | null; dailyLimit: number | null };

export type PersonalAiResult = {
    answer: string;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || "";
}

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
}

export async function askPersonalAiStream(
    payload: { question: string; personalGroupId?: string },
    options?: {
        onChunk?: (fullText: string, delta: string) => void;
        onMetadata?: (metadata: AIMetadata) => void;
    }
): Promise<PersonalAiResult> {
    const baseUrl = getBaseUrl();
    const token = getToken();

    const res = await fetch(`${baseUrl}/ai/personal/ask/stream`, {
        method: "POST",
        headers: {
            Accept: "text/event-stream, application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const body = res.body;
    if (!body) throw new Error("Empty AI response");

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
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
                onMetadata: (meta) => {
                    if (meta.remainingRequests !== null) remainingRequests = meta.remainingRequests;
                    if (meta.dailyLimit !== null) dailyLimit = meta.dailyLimit;
                    options?.onMetadata?.(meta);
                }
            });
            if (parsed.chunk) {
                answer += parsed.chunk;
                options?.onChunk?.(answer, parsed.chunk);
            }
            if (parsed.done) {
                done;
                break;
            }
        }
    }

    return {
        answer: answer.trim(),
        remainingRequests,
        dailyLimit
    };
}

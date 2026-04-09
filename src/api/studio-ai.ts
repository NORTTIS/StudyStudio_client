import { apiGet } from "./api-client";
import { streamAIWithResult, type AIMetadata } from "./ai-stream";
import type { components } from "./types";

export type AskStudioAiResult = {
    answer: string;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

export async function askStudioAiStream(
    studioId: string,
    payload: { question: string },
    options?: {
        signal?: AbortSignal;
        onChunk?: (fullText: string, delta: string) => void;
        onMetadata?: (metadata: AIMetadata) => void;
    }
): Promise<AskStudioAiResult> {
    return streamAIWithResult("/ai/master/ask/stream", { studioId, question: payload.question }, {
        signal: options?.signal,
        onChunk: options?.onChunk,
        onMetadata: options?.onMetadata
    });
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

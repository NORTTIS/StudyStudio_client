import { streamAIWithResult, type AIMetadata } from "./ai-stream";

export type PersonalAiResult = {
    answer: string;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

export async function askPersonalAiStream(
    payload: { question: string; personalGroupId?: string },
    options?: {
        signal?: AbortSignal;
        onChunk?: (fullText: string, delta: string) => void;
        onMetadata?: (metadata: AIMetadata) => void;
    }
): Promise<PersonalAiResult> {
    return streamAIWithResult("/ai/personal/ask/stream", payload, {
        signal: options?.signal,
        onChunk: options?.onChunk,
        onMetadata: options?.onMetadata
    });
}

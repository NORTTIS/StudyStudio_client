/**
 * Shared AI SSE Streaming Utilities
 * Provides common SSE parsing, auth token handling, and streaming utilities for AI endpoints
 */
import { getAccessToken } from "@/api/auth";
import { env } from "@/env";

/**
 * Base URL for API calls
 */
function getBaseUrl(): string {
    return env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
}

/**
 * Standard metadata from AI SSE responses
 */
export type AIMetadata = {
    remainingRequests?: number;
    dailyLimit?: number;
    toolCount?: number;
    processingTime?: number;
};

/**
 * Parsed SSE block from AI responses
 */
export type ParsedSseBlock = {
    chunk: string | null;
    done: boolean;
    error: string | null;
    metadata: AIMetadata | null;
};

/**
 * Parse a single SSE data block
 */
function parseSseData(data: string): ParsedSseBlock {
    const result: ParsedSseBlock = {
        chunk: null,
        done: false,
        error: null,
        metadata: null
    };

    // Remove "data: " prefix if present
    const jsonStr = data.startsWith("data: ") ? data.slice(6) : data;
    const trimmed = jsonStr.trim();

    if (!trimmed) return result;

    try {
        const parsed = JSON.parse(trimmed);

        switch (parsed.type) {
            case "chunk":
                result.chunk = typeof parsed.content === "string" ? parsed.content : String(parsed.content || "");
                break;
            case "done":
                result.done = true;
                break;
            case "error":
                result.error = typeof parsed.message === "string" ? parsed.message : "Unknown error";
                break;
            case "metadata":
                result.metadata = {
                    remainingRequests: toOptionalNumber(parsed.remainingRequests),
                    dailyLimit: toOptionalNumber(parsed.dailyLimit),
                    toolCount: toOptionalNumber(parsed.toolCount),
                    processingTime: toOptionalNumber(parsed.processingTime)
                };
                break;
        }
    } catch {
        // If not JSON, try to extract raw content
        result.chunk = trimmed;
    }

    return result;
}

/**
 * Convert value to optional number
 */
function toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

/**
 * SSE parsing callback options
 */
type ParseCallbacks = {
    onChunk?: (chunk: string) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
    onMetadata?: (metadata: AIMetadata) => void;
};

/**
 * Parse SSE block with callbacks
 */
function parseSseBlock(data: string, callbacks: ParseCallbacks): void {
    const parsed = parseSseData(data);

    if (parsed.metadata) {
        callbacks.onMetadata?.(parsed.metadata);
    }
    if (parsed.chunk) {
        callbacks.onChunk?.(parsed.chunk);
    }
    if (parsed.done) {
        callbacks.onDone?.();
    }
    if (parsed.error) {
        callbacks.onError?.(parsed.error);
    }
}

/**
 * Options for streaming AI requests
 */
export type StreamAIOptions = {
    signal?: AbortSignal;
    onChunk?: (fullText: string, delta: string) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
    onMetadata?: (metadata: AIMetadata) => void;
};

/**
 * Result from streaming AI requests
 */
export type StreamAIResult = {
    answer: string;
    remainingRequests: number | null;
    dailyLimit: number | null;
};

/**
 * Generic SSE streaming function for AI endpoints
 * Uses proper auth module with token refresh support
 */
export async function* streamAISSE<T extends StreamAIOptions>(
    endpoint: string,
    body: Record<string, unknown>,
    options?: T
): AsyncGenerator<ParsedSseBlock> {
    const baseUrl = getBaseUrl();
    const token = getAccessToken();

    const headers: Record<string, string> = {
        Accept: "text/event-stream, application/json",
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: options?.signal
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const bodyStream = res.body;
    if (!bodyStream) throw new Error("Empty AI response");

    const reader = bodyStream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
            const parsed = parseSseData(block);

            // Call callbacks
            if (parsed.metadata) {
                options?.onMetadata?.(parsed.metadata);
            }
            if (parsed.chunk) {
                accumulated += parsed.chunk;
                options?.onChunk?.(accumulated, parsed.chunk);
            }
            if (parsed.done) {
                options?.onDone?.();
            }
            if (parsed.error) {
                options?.onError?.(parsed.error);
            }

            yield parsed;

            if (parsed.done || parsed.error) {
                return;
            }
        }
    }

    // Process remaining buffer
    if (buffer.trim()) {
        const parsed = parseSseData(buffer);
        if (parsed.metadata) {
            options?.onMetadata?.(parsed.metadata);
        }
        if (parsed.chunk) {
            accumulated += parsed.chunk;
            options?.onChunk?.(accumulated, parsed.chunk);
        }
        if (parsed.error) {
            options?.onError?.(parsed.error);
        }
        yield parsed;
    }
}

/**
 * Stream AI with result accumulation
 */
export async function streamAIWithResult(
    endpoint: string,
    body: Record<string, unknown>,
    options?: StreamAIOptions
): Promise<StreamAIResult> {
    let answer = "";
    let remainingRequests: number | null = null;
    let dailyLimit: number | null = null;

    for await (const parsed of streamAISSE(endpoint, body, {
        ...options,
        onChunk: (_fullText, delta) => {
            answer += delta;
            options?.onChunk?.(answer, delta);
        },
        onMetadata: (metadata) => {
            remainingRequests = metadata.remainingRequests ?? null;
            dailyLimit = metadata.dailyLimit ?? null;
            options?.onMetadata?.(metadata);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
        onDone: () => {
            options?.onDone?.();
        }
    })) {
        // Parsed chunks are yielded but handled via callbacks
        if (parsed.error) {
            throw new Error(parsed.error);
        }
    }

    return {
        answer: answer.trim(),
        remainingRequests,
        dailyLimit
    };
}

export { parseSseBlock };
export type { ParseCallbacks };

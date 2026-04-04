const CODE_TOKEN_REGEX = /\b[A-Z]{2,}(?:_[A-Z0-9]{2,})+\b/g;

function extractJsonMessage(raw: string): string {
    const text = raw.trim();
    if (!(text.startsWith("{") && text.endsWith("}"))) {
        return raw;
    }

    try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
            return parsed.message;
        }
    } catch {
        // Ignore JSON parse errors and keep original text.
    }

    return raw;
}

export function sanitizeErrorMessage(message: string, fallback = "Đã xảy ra lỗi"): string {
    const raw = extractJsonMessage(String(message ?? "")).trim();
    if (!raw) return fallback;

    const cleaned = raw
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/\((?:at|url)\s+https?:\/\/[^)]+\)/gi, " ")
        .replace(/\b(?:m[aã]\s*l[oỗ]i|error\s*code|code|status)\s*[:=]\s*[^\s,;)}]+/gi, " ")
        .replace(/\brequest\s+failed\s*[:=-]\s*(?:http\s*)?\d{3}\b/gi, " ")
        .replace(/\b(?:http\s*)?\d{3}\b/g, " ")
        .replace(CODE_TOKEN_REGEX, " ")
        .replace(/[()\[\]{}]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

    return cleaned || fallback;
}

export function getErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi"): string {
    if (error instanceof Error) {
        return sanitizeErrorMessage(error.message, fallback);
    }

    if (typeof error === "string") {
        return sanitizeErrorMessage(error, fallback);
    }

    if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") {
            return sanitizeErrorMessage(message, fallback);
        }
    }

    return fallback;
}
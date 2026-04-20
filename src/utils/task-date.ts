const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";
const ONE_DAY_MS = 86400000;

type ApiDateTimeOptions = {
    endExclusiveNextDay?: boolean;
};

export function toApiDateTimeOrNull(input: string, options?: ApiDateTimeOptions) {
    const s = String(input ?? "").trim();
    if (!s) return null;

    // Task dates in this app are date-only values interpreted in Vietnam time.
    // The backend stores them as date-time strings, and the reader path
    // (`toDueDateInputValue`) also normalizes using Asia/Ho_Chi_Minh.
    // Using the browser's local offset here would break round-tripping between
    // create/edit/read flows for users outside UTC+07:00.
    if (!options?.endExclusiveNextDay) {
        return `${s}T00:00:00+07:00`;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!match) return `${s}T00:00:00+07:00`;

    const nextDay = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
    const y = nextDay.getUTCFullYear();
    const m = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nextDay.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}T00:00:00+07:00`;
}

export function toDueDateInputValue(input?: string | null) {
    const s = String(input ?? "").trim();
    if (!s || s.startsWith("0001-01-01")) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
        const dateOnly = s.slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : "";
    }

    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: VN_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
    const vnTime = timeFormatter.format(d);

    if (vnTime === "00:00:00") {
        // We currently treat midnight-in-Vietnam due dates as the
        // exclusive-next-day format written by `endExclusiveNextDay: true`.
        // Legacy tasks that were stored as inclusive same-day midnight cannot
        // be distinguished here without a backend contract flag or a data
        // migration, so this branch intentionally follows the new contract.
        d.setTime(d.getTime() - ONE_DAY_MS);
    }

    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: VN_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = formatter.formatToParts(d);
    const y = parts.find((part) => part.type === "year")?.value ?? "";
    const m = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    if (!(y && m && day)) return "";
    return `${y}-${m}-${day}`;
}

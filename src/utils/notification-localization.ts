const VI_EXACT_TEXT_MAP: Record<string, string> = {
    "Task overdue": "Công việc quá hạn",
    "Task deadline reminder": "Nhắc nhở hạn công việc",
    "Task assigned": "Đã giao công việc",
    "Task deleted": "Đã xóa công việc",
    "Task is overdue": "Công việc quá hạn",
    "Deadline is approaching": "Hạn sắp đến"
};

const VI_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Task is overdue:\s*/gi, "Công việc đã quá hạn: "],
    [/Deadline is approaching:\s*/gi, "Hạn sắp đến: "],
    [/assigned you a task:\s*/gi, "đã giao cho bạn một công việc: "],
    [/deleted task:\s*/gi, "đã xóa công việc: "]
];

export function localizeNotificationText(text: string, locale = "vi"): string {
    if (locale !== "vi" || !text) {
        return text;
    }

    const exact = VI_EXACT_TEXT_MAP[text];
    if (exact) {
        return exact;
    }

    return VI_TEXT_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

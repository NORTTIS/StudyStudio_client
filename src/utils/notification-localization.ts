const VI_EXACT_TEXT_MAP: Record<string, string> = {
    "Task overdue": "Công việc quá hạn",
    "Task deadline reminder": "Nhắc nhở hạn công việc",
    "Task assigned": "Đã giao công việc",
    "Task deleted": "Đã xóa công việc",
    "Task is overdue": "Công việc quá hạn",
    "Deadline is approaching": "Hạn sắp đến",
    "You were mentioned": "Bạn đã được nhắc đến"
};

const EN_EXACT_TEXT_MAP: Record<string, string> = {
    "Công việc quá hạn": "Task overdue",
    "Nhắc nhở hạn công việc": "Task deadline reminder",
    "Đã giao công việc": "Task assigned",
    "Đã xóa công việc": "Task deleted",
    "Hạn sắp đến": "Deadline is approaching",
    "Bạn đã được nhắc đến": "You were mentioned"
};

const VI_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Task is overdue:\s*/gi, "Công việc đã quá hạn: "],
    [/Deadline is approaching:\s*/gi, "Hạn sắp đến: "],
    [/assigned you a task:\s*/gi, "đã giao cho bạn một công việc: "],
    [/deleted task:\s*/gi, "đã xóa công việc: "],
    [/you were mentioned/gi, "Bạn đã được nhắc đến"],
    [/mentioned you from task\s*/gi, "đã nhắc đến bạn từ công việc "],
    [/mentioned you from group\s*/gi, "đã nhắc đến bạn từ nhóm "],
    [/mentioned you in comment\s*/gi, "đã nhắc đến bạn trong bình luận "]
];

const EN_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Công việc đã quá hạn:\s*/gi, "Task is overdue: "],
    [/Hạn sắp đến:\s*/gi, "Deadline is approaching: "],
    [/đã giao cho bạn một công việc:\s*/gi, "assigned you a task: "],
    [/đã xóa công việc:\s*/gi, "deleted task: "],
    [/Bạn đã được nhắc đến/gi, "You were mentioned"],
    [/đã nhắc đến bạn từ công việc\s*/gi, "mentioned you from task "],
    [/đã nhắc đến bạn từ nhóm\s*/gi, "mentioned you from group "],
    [/đã nhắc đến bạn trong bình luận\s*/gi, "mentioned you in comment "]
];

function applyMapAndRules(
    text: string,
    exactMap: Record<string, string>,
    replacements: Array<[RegExp, string]>
) {
    const exact = exactMap[text];
    if (exact) return exact;

    return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

export function localizeNotificationText(text: string, locale = "vi"): string {
    if (!text) return text;

    if (locale === "vi") {
        return applyMapAndRules(text, VI_EXACT_TEXT_MAP, VI_TEXT_REPLACEMENTS);
    }

    if (locale === "en") {
        return applyMapAndRules(text, EN_EXACT_TEXT_MAP, EN_TEXT_REPLACEMENTS);
    }

    return text;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskItem = {
    title: string;
    priority: TaskPriority;
    stats: {
        comments?: number;
        attachments?: number;
        date?: string;
    };
};

export type Column = {
    name: string;
    count: number;
    tasks: TaskItem[];
};

export type BoardSection = {
    title: string;
    columns: Column[];
};

export type StatusChip = {
    label: string;
    count: number;
};

export type HomeData = {
    userInitials: string;
    statusChips: StatusChip[];
    boardSections: BoardSection[];
};

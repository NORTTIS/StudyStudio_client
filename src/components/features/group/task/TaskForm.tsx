"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import "react-day-picker/dist/style.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { components } from "@/api/types";
import AssigneeAvatar from "./AssigneeAvatar";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function parseDateString(value?: string) {
    if (!value) return undefined;
    const [y, m, d] = value.split("-").map(Number);
    if (!(y && m && d)) return undefined;
    return new Date(y, m - 1, d);
}

function formatDateToInputValue(date?: Date) {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateDisplay(
    value: string | undefined,
    locale: string,
    i18n: Pick<DatePickerTranslations, "selectDate" | "today" | "tomorrow">
) {
    const date = parseDateString(value);
    if (!date) return i18n.selectDate;

    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return i18n.today;
    if (diffDays === 1) return i18n.tomorrow;

    const normalizedLocale = locale.includes("-") ? locale : locale === "vi" ? "vi-VN" : "en-US";

    return new Intl.DateTimeFormat(normalizedLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    }).format(target);
}

export type TaskPriority = 0 | 1 | 2;
export type TaskSeverity = 0 | 1 | 2 | 3;

export type CreateTaskSubmitValues = components["schemas"]["TaskItemGroupRequest"];
export type TaskFormValues = CreateTaskSubmitValues;

export type TaskFormOption = {
    value: string;
    label: string;
    avatarUrl?: string | null;
    role?: string | null; // Add role to track permissions
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: CreateTaskSubmitValues) => Promise<void> | void;
    members?: TaskFormOption[];
    statuses?: TaskFormOption[];
    defaultStatusId?: string | null;
    defaultAssigneeId?: string | null;
    defaultPriority?: TaskPriority;
    defaultSeverity?: TaskSeverity;
};

function priorityTone(value: TaskPriority) {
    if (value === 2) return "text-rose-600";
    if (value === 1) return "text-yellow-500";
    return "text-emerald-700";
}

function severityTone(value: TaskSeverity) {
    if (value === 3) return "text-red-600";
    if (value === 2) return "text-orange-600";
    if (value === 1) return "text-sky-600";
    return "text-emerald-600";
}

function priorityLabel(value: TaskPriority, t: (key: string) => string) {
    if (value === 2) return t("priorityHigh");
    if (value === 1) return t("priorityMedium");
    return t("priorityLow");
}

function severityLabel(value: TaskSeverity, t: (key: string) => string) {
    if (value === 3) return t("severityCritical");
    if (value === 2) return t("severityHigh");
    if (value === 1) return t("severityMedium");
    return t("severityLow");
}

const selectItemClassName =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-zinc-900 outline-none data-highlighted:bg-zinc-100 hover:bg-zinc-100 focus:bg-zinc-100";

const TASK_TITLE_MAX_LENGTH = 30;
const TASK_DESCRIPTION_MAX_LENGTH = 200;

type PopupPosition = {
    top: number;
    left: number;
    width: number;
};

type TrelloDatePickerProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    locale: string;
    i18n: DatePickerTranslations;
};

type DatePickerTranslations = {
    selectDate: string;
    today: string;
    tomorrow: string;
    nextWeek: string;
    noDate: string;
    months: string[];
};

function TrelloDatePicker({ label, value, onChange, min, locale, i18n }: TrelloDatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [popupPosition, setPopupPosition] = React.useState<PopupPosition | null>(null);

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const selectedDate = React.useMemo(() => parseDateString(value), [value]);
    const minDate = React.useMemo(() => parseDateString(min), [min]);

    const initialMonth = React.useMemo(() => selectedDate ?? minDate ?? new Date(), [selectedDate, minDate]);
    const [month, setMonth] = React.useState<Date>(initialMonth);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (open) {
            setMonth(selectedDate ?? minDate ?? new Date());
        }
    }, [open, selectedDate, minDate]);

    const updatePopupPosition = React.useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const popupWidth = 420;
        const popupHeight = 560;
        const gap = 8;
        const viewportPadding = 12;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        const shouldOpenUp = spaceBelow < popupHeight && spaceAbove > spaceBelow;

        let top = shouldOpenUp ? rect.top - popupHeight - gap : rect.bottom + gap;
        let left = rect.left;

        if (left + popupWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popupWidth - viewportPadding;
        }

        if (left < viewportPadding) {
            left = viewportPadding;
        }

        if (top < viewportPadding) {
            top = viewportPadding;
        }

        if (top + popupHeight > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, window.innerHeight - popupHeight - viewportPadding);
        }

        setPopupPosition({
            top,
            left,
            width: popupWidth
        });
    }, []);

    React.useEffect(() => {
        if (!open) return;

        updatePopupPosition();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const popup = rootRef.current;
            const trigger = triggerRef.current;

            if (popup?.contains(target)) return;
            if (trigger?.contains(target)) return;

            setOpen(false);
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        const handleReposition = () => updatePopupPosition();

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEsc);
        window.addEventListener("resize", handleReposition);
        window.addEventListener("scroll", handleReposition, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEsc);
            window.removeEventListener("resize", handleReposition);
            window.removeEventListener("scroll", handleReposition, true);
        };
    }, [open, updatePopupPosition]);

    const pickDate = (date?: Date) => {
        if (!date) return;

        const normalized = startOfDay(date);

        if (minDate && normalized < startOfDay(minDate)) return;

        onChange(formatDateToInputValue(normalized));
        setOpen(false);
    };

    const yearOptions = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = Math.min(minDate?.getFullYear() ?? currentYear - 5, currentYear - 5);
        const endYear = currentYear + 10;

        return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    }, [minDate]);

    const handleMonthChange = (value: string) => {
        const nextMonth = Number(value);
        setMonth(new Date(month.getFullYear(), nextMonth, 1));
    };

    const handleYearChange = (value: string) => {
        const nextYear = Number(value);
        setMonth(new Date(nextYear, month.getMonth(), 1));
    };

    const goPrevMonth = () => {
        const next = new Date(month.getFullYear(), month.getMonth() - 1, 1);

        if (minDate) {
            const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            if (next < minMonth) return;
        }

        setMonth(next);
    };

    const goNextMonth = () => {
        setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    };

    const isPrevDisabled = React.useMemo(() => {
        if (!minDate) return false;
        const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        return prev < minMonth;
    }, [month, minDate]);

    const popup =
        mounted && open && popupPosition
            ? createPortal(
                <div
                    ref={rootRef}
                    className="fixed z-[20000] rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                    style={{
                        top: popupPosition.top,
                        left: popupPosition.left,
                        width: popupPosition.width
                    }}>
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex-1">
                            <Select value={String(month.getMonth())} onValueChange={handleMonthChange}>
                                <SelectTrigger className="h-12 w-full font-semibold text-base">
                                    <SelectValue placeholder={i18n.months[month.getMonth()]} />
                                </SelectTrigger>
                                <SelectContent>
                                    {i18n.months.map((monthLabel, monthIndex) => (
                                        <SelectItem key={monthLabel} value={String(monthIndex)}>
                                            {monthLabel}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[140px]">
                            <Select value={String(month.getFullYear())} onValueChange={handleYearChange}>
                                <SelectTrigger className="h-12 w-full font-semibold text-base">
                                    <SelectValue placeholder={String(month.getFullYear())} />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((year) => (
                                        <SelectItem key={year} value={String(year)}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-[20px] border border-zinc-200 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goPrevMonth}
                                disabled={isPrevDisabled}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="font-bold text-[18px] text-zinc-900">
                                {i18n.months[month.getMonth()]} {month.getFullYear()}
                            </div>

                            <button
                                type="button"
                                onClick={goNextMonth}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        <DayPicker
                            mode="single"
                            month={month}
                            onMonthChange={setMonth}
                            selected={selectedDate}
                            onSelect={pickDate}
                            disabled={minDate ? { before: minDate } : undefined}
                            showOutsideDays
                            className="w-full"
                            styles={{
                                day: {
                                    outline: "none",
                                    boxShadow: "none"
                                },
                                button: {
                                    outline: "none",
                                    boxShadow: "none"
                                }
                            }}
                            classNames={{
                                months: "flex w-full flex-col",
                                month: "w-full space-y-3",
                                caption: "hidden",
                                table: "w-full border-collapse",
                                tbody: "w-full",
                                head_row: "flex w-full justify-between",
                                head_cell: "h-10 w-10 text-center text-[13px] font-semibold text-zinc-500",
                                row: "mt-2 flex w-full justify-between",
                                cell: "h-10 w-10 p-0 text-center",
                                day: "h-10 w-10 rounded-xl border-0 bg-transparent p-0 text-sm font-medium text-zinc-800 shadow-none outline-none ring-0 transition hover:bg-orange-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                                day_button:
                                    "h-10 w-10 rounded-xl border-0 bg-transparent p-0 font-medium text-inherit shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                                selected: "!bg-orange-500 !text-white",
                                day_selected:
                                    "!bg-orange-500 !text-white hover:!bg-orange-500 hover:!text-white focus:!bg-orange-500 focus:!text-white focus-visible:!bg-orange-500 focus-visible:!text-white",
                                today: "text-orange-600 font-bold",
                                day_today: "text-orange-600 font-bold",
                                outside: "text-zinc-300",
                                day_outside: "text-zinc-300",
                                disabled: "text-zinc-300 opacity-40",
                                day_disabled: "text-zinc-300 opacity-40",
                                hidden: "invisible",
                                day_hidden: "invisible"
                            }}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => pickDate(new Date())}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                            {i18n.today}
                        </button>

                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 1))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                            {i18n.tomorrow}
                        </button>

                        <button
                            type="button"
                            onClick={() => pickDate(addDays(new Date(), 7))}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-zinc-700 hover:bg-zinc-50">
                            {i18n.nextWeek}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-base text-rose-500 hover:bg-rose-50">
                            {i18n.noDate}
                        </button>
                    </div>
                </div>,
                document.body
            )
            : null;

    return (
        <>
            <div className="relative">
                <div className="font-semibold text-sm text-zinc-600">{label}</div>

                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        "mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
                        open
                            ? "border-orange-400 bg-orange-50 text-zinc-900 ring-2 ring-orange-100"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                    )}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                open ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-500"
                            )}>
                            <CalendarDays className="h-4 w-4" />
                        </div>

                        <span
                            className={cn("truncate text-left", value ? "font-medium text-zinc-900" : "text-zinc-400")}>
                            {formatDateDisplay(value, locale, i18n)}
                        </span>
                    </div>
                </button>
            </div>

            {popup}
        </>
    );
}

function toApiDateTimeOrNull(input: string) {
    const s = String(input ?? "").trim();
    if (!s) return undefined;
    return `${s}T00:00:00`;
}

function isRestrictedMemberRole(memberRole?: string | null | number): boolean {
    if (!memberRole) return false;
    const roleStr = String(memberRole).trim().toLowerCase();
    return roleStr === "3" || roleStr === "4" || roleStr === "commenter" || roleStr === "viewer";
}

export default function TaskFormModal({
    open,
    onClose,
    onSubmit,
    members = [],
    statuses = [],
    defaultStatusId = null,
    defaultAssigneeId = null,
    defaultPriority = 0,
    defaultSeverity = 0
}: Props) {
    const t = useTranslations("TaskFormModal");
    const locale = useLocale();
    const [mounted, setMounted] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [assignees, setAssignees] = React.useState<string | null>(defaultAssigneeId);
    const [statusId, setStatusId] = React.useState<string>(defaultStatusId ?? statuses[0]?.value ?? "");
    const [priority, setPriority] = React.useState<TaskPriority>(defaultPriority);
    const [severity, setSeverity] = React.useState<TaskSeverity>(defaultSeverity);

    const [startDate, setStartDate] = React.useState("");
    const [dueDate, setDueDate] = React.useState("");
    const [estimatedHours, setEstimatedHours] = React.useState<number | undefined>(undefined);
    const [actualHours, setActualHours] = React.useState<number | undefined>(undefined);
    const [estimatedHoursError, setEstimatedHoursError] = React.useState<string | null>(null);
    const [actualHoursError, setActualHoursError] = React.useState<string | null>(null);

    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Calculate max hours allowed based on startDate and dueDate
    const maxHours = React.useMemo((): number | null => {
        if (!startDate || !dueDate) return null;

        const startDay = Date.UTC(
            new Date(startDate).getFullYear(),
            new Date(startDate).getMonth(),
            new Date(startDate).getDate()
        );
        const endDay = Date.UTC(
            new Date(dueDate).getFullYear(),
            new Date(dueDate).getMonth(),
            new Date(dueDate).getDate()
        );

        const diffDays = (endDay - startDay) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) return null;

        return (diffDays + 1) * 24;
    }, [startDate, dueDate]);

    // Validate and clamp estimated hours
    const handleEstimatedHoursChange = (rawVal: string) => {
        const val = rawVal;
        const num = parseFloat(val);
        const parsed = val === "" ? undefined : isNaN(num) || num < 0 ? 0 : num;

        if (parsed != null && maxHours != null && parsed > maxHours) {
            setEstimatedHoursError(t("estimatedHoursExceed", { max: maxHours }));
            setEstimatedHours(maxHours);
        } else {
            setEstimatedHoursError(null);
            setEstimatedHours(parsed);
        }
    };

    // Validate and clamp actual hours
    const handleActualHoursChange = (rawVal: string) => {
        const val = rawVal;
        const num = parseFloat(val);
        const parsed = val === "" ? undefined : isNaN(num) || num < 0 ? 0 : num;

        if (parsed != null && maxHours != null && parsed > maxHours) {
            setActualHoursError(t("actualHoursExceed", { max: maxHours }));
            setActualHours(maxHours);
        } else {
            setActualHoursError(null);
            setActualHours(parsed);
        }
    };

    // Re-validate hours when dates change
    React.useEffect(() => {
        if (estimatedHours != null && maxHours != null && estimatedHours > maxHours) {
            setEstimatedHoursError(t("estimatedHoursExceed", { max: maxHours }));
            setEstimatedHours(maxHours);
        } else {
            setEstimatedHoursError(null);
        }

        if (actualHours != null && maxHours != null && actualHours > maxHours) {
            setActualHoursError(t("actualHoursExceed", { max: maxHours }));
            setActualHours(maxHours);
        } else {
            setActualHoursError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxHours]);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!open) return;

        setError(null);
        setSubmitting(false);
        setTitle("");
        setDescription("");
        setAssignees(defaultAssigneeId);
        setStatusId(defaultStatusId ?? statuses[0]?.value ?? "");
        setPriority(defaultPriority);
        setSeverity(defaultSeverity);
        setStartDate("");
        setDueDate("");
        setEstimatedHours(undefined);
        setActualHours(undefined);
        setEstimatedHoursError(null);
        setActualHoursError(null);
    }, [open, defaultAssigneeId, defaultStatusId, defaultPriority, defaultSeverity, statuses]);

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    React.useEffect(() => {
        if (!open) return;

        const scrollY = window.scrollY;
        const originalBodyStyle = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            top: document.body.style.top,
            width: document.body.style.width
        };
        const originalHtmlOverflow = document.documentElement.style.overflow;

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";

        return () => {
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.overflow = originalBodyStyle.overflow;
            document.body.style.position = originalBodyStyle.position;
            document.body.style.top = originalBodyStyle.top;
            document.body.style.width = originalBodyStyle.width;
            window.scrollTo(0, scrollY);
        };
    }, [open]);

    const selectedStatusName = React.useMemo(() => {
        return statuses.find((s) => s.value === statusId)?.label ?? "";
    }, [statuses, statusId]);

    const selectedAssignee = React.useMemo(() => {
        return members.find((m) => m.value === assignees) ?? null;
    }, [members, assignees]);

    const selectedAssigneeDisplay = React.useMemo(() => {
        if (selectedAssignee) return selectedAssignee;
        return { value: "unassigned", label: t("unassigned"), avatarUrl: null };
    }, [selectedAssignee, t]);

    const datePickerI18n = React.useMemo<DatePickerTranslations>(
        () => ({
            selectDate: t("datePicker.selectDate"),
            today: t("datePicker.today"),
            tomorrow: t("datePicker.tomorrow"),
            nextWeek: t("datePicker.nextWeek"),
            noDate: t("datePicker.noDate"),
            months: [
                t("datePicker.month1"),
                t("datePicker.month2"),
                t("datePicker.month3"),
                t("datePicker.month4"),
                t("datePicker.month5"),
                t("datePicker.month6"),
                t("datePicker.month7"),
                t("datePicker.month8"),
                t("datePicker.month9"),
                t("datePicker.month10"),
                t("datePicker.month11"),
                t("datePicker.month12")
            ]
        }),
        [t]
    );

    const canSubmit =
        title.trim().length > 0 &&
        !submitting &&
        !estimatedHoursError &&
        !actualHoursError;

    const handleSubmit = async () => {
        const trimmedTitle = title.trim().slice(0, TASK_TITLE_MAX_LENGTH);
        const trimmedDescription = description.trim().slice(0, TASK_DESCRIPTION_MAX_LENGTH);

        if (!trimmedTitle) {
            setError(t("errors.taskTitleRequired"));
            return;
        }

        if (startDate && dueDate && startDate > dueDate) {
            setError(t("errors.startDateAfterDueDate"));
            return;
        }

        // Check if assignee has restricted role
        if (assignees) {
            const selectedMember = members.find((m) => m.value === assignees);
            if (selectedMember && isRestrictedMemberRole(selectedMember.role)) {
                setError(t("errors.restrictedAssignee"));
                return;
            }
        }

        if (estimatedHoursError || actualHoursError) {
            setError(estimatedHoursError ?? actualHoursError ?? "");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const payload: CreateTaskSubmitValues = {
                taskName: trimmedTitle,
                taskDescription: trimmedDescription || null,
                assignees: assignees || null,
                groupStatusId: statusId || null,
                taskPriority: priority,
                taskSeverity: severity,
                startDate: toApiDateTimeOrNull(startDate),
                dueDate: toApiDateTimeOrNull(dueDate)
            };

            if (estimatedHours != null && estimatedHours > 0) {
                payload.estimatedHours = estimatedHours;
            }

            if (actualHours != null && actualHours > 0) {
                payload.actualHours = actualHours;
            }

            await onSubmit(payload);
            onClose();
        } catch (e: any) {
            setError(e?.message ?? t("errors.createTaskFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (!(open && mounted)) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}>
            <div
                className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="relative border-zinc-200 border-b px-7 py-5 pr-24">
                    <input
                        value={title}
                        maxLength={TASK_TITLE_MAX_LENGTH}
                        onChange={(e) => {
                            setTitle(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH));
                            if (error) setError(null);
                        }}
                        placeholder={t("titlePlaceholder")}
                        className="w-full max-w-[600px] rounded-xl border border-zinc-200 bg-white px-4 py-3 font-extrabold text-[30px] text-zinc-900 leading-none outline-none"
                    />

                    <div className="mt-2 max-w-[600px] text-right font-medium text-xs text-zinc-500">
                        {title.length}/{TASK_TITLE_MAX_LENGTH}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-1/2 right-7 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        aria-label={t("closeAriaLabel")}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-7 py-5">
                    {error ? (
                        <div className="mt-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-sm">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("assigneeLabel")}</div>
                            <Select
                                value={assignees ?? "unassigned"}
                                onValueChange={(v) => setAssignees(v === "unassigned" ? null : v)}>
                                    <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <AssigneeAvatar
                                                avatarUrl={selectedAssigneeDisplay.avatarUrl}
                                                name={selectedAssigneeDisplay.label}
                                                size={24}
                                                unassigned={!selectedAssignee}
                                                className="text-[11px]"
                                            />
                                        <span className="truncate">{selectedAssigneeDisplay.label}</span>
                                    </div>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-[260px] rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="unassigned" className={selectItemClassName}>
                                        <div className="flex items-center gap-2">
                                            <AssigneeAvatar size={24} unassigned className="text-[11px]" />
                                            <span>{t("unassigned")}</span>
                                        </div>
                                    </SelectItem>

                                    {members.map((m) => (
                                        <SelectItem key={m.value} value={m.value} className={selectItemClassName}>
                                            <div className="flex items-center gap-2">
                                                <AssigneeAvatar
                                                    avatarUrl={m.avatarUrl}
                                                    name={m.label}
                                                    size={24}
                                                    className="text-[11px]"
                                                />
                                                <span className="truncate">{m.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("statusLabel")}</div>
                            <Select
                                value={statusId || "no-status"}
                                onValueChange={(v) => setStatusId(v === "no-status" ? "" : v)}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-medium text-sm text-zinc-800">
                                    <span className="truncate">{selectedStatusName || t("noStatus")}</span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="start"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-54 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="no-status" className={selectItemClassName}>
                                        {t("noStatus")}
                                    </SelectItem>

                                    {statuses.map((s) => (
                                        <SelectItem key={s.value} value={s.value} className={selectItemClassName}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("priorityLabel")}</div>
                            <Select
                                value={String(priority)}
                                onValueChange={(v) => setPriority(Number(v) as TaskPriority)}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm">
                                    <span className={cn("inline-flex items-center gap-2", priorityTone(priority))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {priorityLabel(priority, t)}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="0" className={selectItemClassName}>
                                        {t("priorityLow")}
                                    </SelectItem>
                                    <SelectItem value="1" className={selectItemClassName}>
                                        {t("priorityMedium")}
                                    </SelectItem>
                                    <SelectItem value="2" className={selectItemClassName}>
                                        {t("priorityHigh")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <TrelloDatePicker
                            label={t("startDateLabel")}
                            value={startDate}
                            onChange={setStartDate}
                            locale={locale}
                            i18n={datePickerI18n}
                        />

                        <TrelloDatePicker
                            label={t("dueDateLabel")}
                            value={dueDate}
                            onChange={setDueDate}
                            min={startDate || undefined}
                            locale={locale}
                            i18n={datePickerI18n}
                        />

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("severityLabel")}</div>
                            <Select
                                value={String(severity)}
                                onValueChange={(v) => setSeverity(Number(v) as TaskSeverity)}>
                                <SelectTrigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 px-3 font-semibold text-sm">
                                    <span className={cn("inline-flex items-center gap-2", severityTone(severity))}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {severityLabel(severity, t)}
                                    </span>
                                </SelectTrigger>

                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    align="end"
                                    sideOffset={8}
                                    avoidCollisions
                                    className="z-[10010] min-w-42 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    <SelectItem value="0" className={selectItemClassName}>
                                        {t("severityLow")}
                                    </SelectItem>
                                    <SelectItem value="1" className={selectItemClassName}>
                                        {t("severityMedium")}
                                    </SelectItem>
                                    <SelectItem value="2" className={selectItemClassName}>
                                        {t("severityHigh")}
                                    </SelectItem>
                                    <SelectItem value="3" className={selectItemClassName}>
                                        {t("severityCritical")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("estimatedHoursLabel")}</div>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={estimatedHours ?? ""}
                                onChange={(e) => handleEstimatedHoursChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                                        e.preventDefault();
                                    }
                                }}
                                placeholder={t("estimatedHoursPlaceholder")}
                                className="mt-2 flex h-11 w-full items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {estimatedHoursError ? (
                                <div className="mt-1 text-xs font-medium text-rose-600">{estimatedHoursError}</div>
                            ) : null}
                        </div>

                        <div>
                            <div className="font-semibold text-sm text-zinc-600">{t("actualHoursLabel")}</div>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={actualHours ?? ""}
                                onChange={(e) => handleActualHoursChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                                        e.preventDefault();
                                    }
                                }}
                                placeholder={t("actualHoursPlaceholder")}
                                className="mt-2 flex h-11 w-full items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none hover:border-zinc-300 focus:border-orange-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {actualHoursError ? (
                                <div className="mt-1 text-xs font-medium text-rose-600">{actualHoursError}</div>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="font-semibold text-sm text-zinc-600">{t("descriptionLabel")}</div>
                        <textarea
                            value={description}
                            maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                            onChange={(e) => setDescription(e.target.value.slice(0, TASK_DESCRIPTION_MAX_LENGTH))}
                            placeholder={t("descriptionPlaceholder")}
                            className="mt-2 min-h-30 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 outline-none"
                        />
                        <div className="mt-2 text-right font-medium text-xs text-zinc-500">
                            {description.length}/{TASK_DESCRIPTION_MAX_LENGTH}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-zinc-200 border-t bg-zinc-50 px-7 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 rounded-xl border border-zinc-300 bg-white px-8 font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                        {t("cancelButton")}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            void handleSubmit();
                        }}
                        disabled={!canSubmit}
                        className="h-11 rounded-xl bg-[#f54a00] px-8 font-semibold text-sm text-white hover:bg-[#f54a00]/80 disabled:opacity-60">
                        {submitting ? t("creatingButton") : t("createButton")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

"use client";

import enLocale from "@fullcalendar/core/locales/en-gb";
import viLocale from "@fullcalendar/core/locales/vi";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/api/api-client";
import type { components } from "@/api/types";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };
type CalendarViewMode = "month" | "week" | "day";
type HomeTaskListResponse = components["schemas"]["HomeTaskListResponse"];
type PersonalTaskBoardResponse = components["schemas"]["PersonalTaskBoardResponse"];
type TaskStatusDto = components["schemas"]["TaskStatusDto"];
type TaskItemResponse = components["schemas"]["TaskItemResponse"];
type TaskPriority = components["schemas"]["TaskPriority"];
type TaskSeverity = components["schemas"]["TaskSeverity"];

type CalEvent = {
    id: string;
    title: string;
    start: string;
    allDay?: boolean;
    color?: string;
    textColor?: string;
    extendedProps?: {
        progress?: number;
        priority?: TaskPriority;
        severity?: TaskSeverity;
        sourceName?: string;
        sourceType?: string;
        status?: string;
    };
};

type TooltipState = {
    visible: boolean;
    x: number;
    y: number;
    title: string;
    status: string;
    progress: number;
    sourceName: string;
    sourceType: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

function formatDate(date: Date) {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function getStartOfWeek(date: Date) {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function getEndOfWeek(date: Date) {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

function getStartOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getRangeLabel(date: Date, mode: CalendarViewMode, locale: string, monthPrefix: string) {
    if (mode === "week") {
        const start = getStartOfWeek(date);
        const end = getEndOfWeek(date);
        return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)} - ${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}/${end.getFullYear()}`;
    }

    if (mode === "month") {
        const start = getStartOfMonth(date);
        const safePrefix = String(monthPrefix ?? "").trim() || (locale === "vi" ? "Tháng" : "Month");
        return `${safePrefix} ${pad2(start.getMonth() + 1)}/${start.getFullYear()}`;
    }

    return formatDate(date);
}

function getTooltipPosition(tooltip: TooltipState) {
    const spacing = 12;
    const viewportPadding = 20;
    const tooltipWidth = 240;
    const estimatedTooltipHeight = 120;

    if (typeof window === "undefined") {
        return {
            left: tooltip.x + spacing,
            top: tooltip.y + spacing
        };
    }

    const preferRight = tooltip.x + spacing + tooltipWidth <= window.innerWidth - viewportPadding;
    const rawLeft = preferRight ? tooltip.x + spacing : tooltip.x - tooltipWidth - spacing;
    const minLeft = viewportPadding;
    const maxLeft = window.innerWidth - tooltipWidth - viewportPadding;

    const rawTop = tooltip.y + spacing;

    return {
        left: Math.max(minLeft, Math.min(rawLeft, maxLeft)),
        top: Math.max(viewportPadding, Math.min(rawTop, window.innerHeight - estimatedTooltipHeight - viewportPadding))
    };
}

function priorityColorOf(priority?: TaskPriority) {
    if (priority === 2) return "#ef4444";
    if (priority === 1) return "#f97316";
    return "#6366f1";
}

function severityColorOf(severity?: TaskSeverity) {
    if (severity === 3) return "#ef4444";
    if (severity === 2) return "#f97316";
    if (severity === 1) return "#f59e0b";
    return "#3b82f6";
}

function toIsoDateOnly(value: string): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
}

async function apiGetHomeTasks() {
    const response = await apiFetch<HomeTaskListResponse>("/Home/TaskList?page=1&pageSize=200&sortBy=asc", {
        method: "GET"
    });
    return response;
}

async function apiGetPersonalTaskBoard() {
    const response = await apiFetch<PersonalTaskBoardResponse>("/Home/personal-task", {
        method: "GET"
    });
    return response;
}

function CalendarToolbar({
    mode,
    onModeChange,
    rangeLabel,
    onPrev,
    onNext,
    onToday,
    t
}: {
    mode: CalendarViewMode;
    onModeChange: (mode: CalendarViewMode) => void;
    rangeLabel: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    t: (key: string) => string;
}) {
    const tabs: Array<{ key: CalendarViewMode; label: string }> = [
        { key: "month", label: t("viewMonth") },
        { key: "week", label: t("viewWeek") },
        { key: "day", label: t("viewDay") }
    ];

    return (
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {tabs.map((tab) => {
                    const active = tab.key === mode;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onModeChange(tab.key)}
                            className={cn(
                                "rounded-xl px-4 py-2 font-medium text-sm transition",
                                active ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-orange-600"
                            )}>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1">
                <button
                    type="button"
                    onClick={onPrev}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={onToday}
                    className="rounded-xl px-3 py-1.5 font-medium text-slate-700 text-sm transition hover:bg-white hover:text-slate-900">
                    {t("today")}
                </button>

                <div className="whitespace-nowrap px-2 font-medium text-slate-700 text-sm">{rangeLabel}</div>

                <button
                    type="button"
                    onClick={onNext}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

interface PersonalCalendarProps {
    open: boolean;
    onClose: () => void;
}

export default function PersonalCalendar({ open, onClose }: PersonalCalendarProps) {
    const locale = useLocale();
    const t = useTranslations("PersonalCalendar");
    const calendarRef = useRef<FullCalendar | null>(null);

    const [events, setEvents] = useState<CalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        x: 0,
        y: 0,
        title: "",
        status: "",
        progress: 0,
        sourceName: "",
        sourceType: ""
    });

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const [groupTaskResponse, personalTaskResponse] = await Promise.all([
                apiGetHomeTasks(),
                apiGetPersonalTaskBoard()
            ]);

            if (groupTaskResponse.status !== "success") {
                setLoadError(groupTaskResponse.message || t("cannotLoad"));
                setEvents([]);
                return;
            }

            if (personalTaskResponse.status !== "success") {
                setLoadError(personalTaskResponse.message || t("cannotLoad"));
                setEvents([]);
                return;
            }

            const groupItems = (groupTaskResponse?.data as HomeTaskListResponse)?.items ?? [];
            const groupTasksWithDueDate = groupItems.filter((task) => task.dueDate);

            const personalStatuses =
                ((personalTaskResponse?.data as PersonalTaskBoardResponse)?.personalTaskStatuses as TaskStatusDto[] | null | undefined) ?? [];

            const personalItems = personalStatuses.flatMap((status) => {
                const tasks = (status.taskList as TaskItemResponse[] | null | undefined) ?? [];
                return tasks.map((task) => ({
                    ...task,
                    statusName: String(status.statusName ?? "").trim()
                }));
            });

            const personalTasksWithDueDate = personalItems.filter((task) => task.dueDate);

            const groupEvents: CalEvent[] = groupTasksWithDueDate.flatMap((task, index) => {
                const baseId = String(task.taskId ?? "").trim() || `group_task_${index}`;
                const title = String(task.taskTitle ?? "").trim() || t("untitledTask");
                const dueDate = String(task.dueDate ?? "").trim();

                if (!dueDate) return [];

                const color = priorityColorOf(task.taskPriority);
                const textColor = "#ffffff";

                return [
                    {
                        id: `group_${baseId}`,
                        title,
                        start: toIsoDateOnly(dueDate) || dueDate,
                        allDay: true,
                        color,
                        textColor,
                        extendedProps: {
                            status: String(task.statusName ?? "").trim(),
                            progress: task.progress ?? 0,
                            priority: task.taskPriority,
                            severity: task.taskSeverity,
                            sourceName: String(task.sourceName ?? "").trim(),
                            sourceType: String(task.sourceType ?? "").trim()
                        }
                    }
                ];
            });

            const personalEvents: CalEvent[] = personalTasksWithDueDate.flatMap((task, index) => {
                const baseId = String(task.taskId ?? "").trim() || `personal_task_${index}`;
                const title = String(task.taskTitle ?? "").trim() || t("untitledTask");
                const dueDate = String(task.dueDate ?? "").trim();

                if (!dueDate) return [];

                const color = priorityColorOf(task.taskPriority);
                const textColor = "#ffffff";

                return [
                    {
                        id: `personal_${baseId}`,
                        title,
                        start: toIsoDateOnly(dueDate) || dueDate,
                        allDay: true,
                        color,
                        textColor,
                        extendedProps: {
                            status: String(task.statusName ?? "").trim(),
                            progress: task.progress ?? 0,
                            priority: task.taskPriority,
                            severity: task.taskSeverity,
                            sourceName: t("personalTask"),
                            sourceType: "Personal"
                        }
                    }
                ];
            });

            setEvents([...groupEvents, ...personalEvents]);
        } catch (e: unknown) {
            setLoadError(e instanceof Error ? e.message : t("cannotLoad"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (open) {
            void fetchTasks();
        }
    }, [open, fetchTasks]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    const calendarViewName = useMemo(() => {
        if (viewMode === "month") return "dayGridMonth";
        if (viewMode === "week") return "dayGridWeek";
        return "dayGridDay";
    }, [viewMode]);

    const rangeLabel = useMemo(() => {
        return getRangeLabel(currentDate, viewMode, locale, t("monthPrefix"));
    }, [currentDate, viewMode, locale, t]);

    const syncCalendarState = useCallback(() => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        setCurrentDate(api.getDate());
    }, []);

    const handleChangeView = (mode: CalendarViewMode) => {
        setViewMode(mode);
        const api = calendarRef.current?.getApi();
        if (!api) return;

        if (mode === "month") api.changeView("dayGridMonth");
        else if (mode === "week") api.changeView("dayGridWeek");
        else api.changeView("dayGridDay");

        setCurrentDate(api.getDate());
    };

    const handlePrev = () => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        api.prev();
        setCurrentDate(api.getDate());
    };

    const handleNext = () => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        api.next();
        setCurrentDate(api.getDate());
    };

    const handleToday = () => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        api.today();
        setCurrentDate(api.getDate());
    };

    const options = useMemo(
        () => ({
            plugins: [dayGridPlugin, interactionPlugin],
            locale: locale === "vi" ? "vi" : "en-gb",
            locales: [viLocale, enLocale],
            initialView: calendarViewName,
            height: "auto",
            showNonCurrentDates: true,
            fixedWeekCount: false,
            headerToolbar: false as const,
            selectable: false,
            editable: false,
            dayMaxEvents: 3,
            moreLinkContent: (arg: { num: number }) => `+${arg.num} ${t("more")}`,
            displayEventTime: false,
            events,
            eventMouseEnter: (info: {
                jsEvent: MouseEvent;
                event: {
                    title: string;
                    extendedProps?: {
                        status?: string;
                        progress?: number;
                        sourceName?: string;
                        sourceType?: string;
                    };
                };
            }) => {
                setTooltip({
                    visible: true,
                    x: info.jsEvent.clientX,
                    y: info.jsEvent.clientY,
                    title: info.event.title || t("untitledTask"),
                    status: info.event.extendedProps?.status || t("noStatus"),
                    progress: info.event.extendedProps?.progress ?? 0,
                    sourceName: info.event.extendedProps?.sourceName || "",
                    sourceType: info.event.extendedProps?.sourceType || ""
                });
            },
            eventMouseLeave: () => {
                setTooltip((prev) => ({ ...prev, visible: false }));
            },
            eventMouseMove: (info: { jsEvent: MouseEvent }) => {
                setTooltip((prev) => ({
                    ...prev,
                    x: info.jsEvent.clientX,
                    y: info.jsEvent.clientY
                }));
            },
            datesSet: () => {
                syncCalendarState();
            }
        }),
        [calendarViewName, events, locale, t, syncCalendarState]
    );

    // Inject FullCalendar styles
    useEffect(() => {
        const styleId = "personal-calendar-styles";
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .fc {
                font-family: Roboto, Arial, sans-serif;
                color: #3c4043;
            }
            .fc .fc-toolbar {
                display: none !important;
            }
            .fc .fc-scrollgrid {
                border: 1px solid #dadce0 !important;
                border-radius: 16px !important;
                overflow: visible !important;
                background: #ffffff;
                width: 100% !important;
            }
            .fc .fc-view-harness,
            .fc .fc-view-harness-active,
            .fc .fc-daygrid-body,
            .fc .fc-daygrid-body table,
            .fc .fc-scrollgrid table {
                width: 100% !important;
            }
            .fc .fc-daygrid-body table,
            .fc .fc-scrollgrid table {
                table-layout: fixed;
            }
            .fc .fc-scrollgrid-section > td,
            .fc .fc-scrollgrid-section > th {
                border-color: #e8eaed !important;
            }
            .fc-theme-standard td,
            .fc-theme-standard th {
                border-color: #e8eaed !important;
            }
            .fc .fc-col-header {
                background: #ffffff;
            }
            .fc .fc-col-header-cell {
                background: #ffffff;
                padding: 0;
                height: 44px;
            }
            .fc .fc-col-header-cell-cushion {
                color: #70757a;
                font-weight: 500;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                text-decoration: none !important;
                padding: 12px 6px !important;
            }
            .fc .fc-daygrid-day {
                background: #ffffff;
                transition: background-color 0.18s ease;
            }
            .fc .fc-daygrid-day:hover {
                background: #f8f9fa;
            }
            .fc .fc-daygrid-day-number {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                margin: 6px 0 0 6px;
                border-radius: 9999px;
                color: #3c4043;
                font-size: 12px;
                font-weight: 500;
                padding: 0 !important;
                text-decoration: none !important;
            }
            .fc .fc-day-other .fc-daygrid-day-number {
                color: #bdc1c6;
            }
            .fc .fc-day-today {
                background: #fff8e1 !important;
            }
            .fc .fc-daygrid-day.fc-day-today {
                background: #fff8e1 !important;
            }
            .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
                background: transparent;
                color: #b45309 !important;
                font-weight: 700;
            }
            .fc .fc-daygrid-day-frame {
                min-height: 112px;
            }
            .fc .fc-daygrid-day-top {
                justify-content: flex-start;
            }
            .fc .fc-daygrid-day-events {
                margin: 2px 4px 0 4px;
            }
            .fc .fc-event {
                border: none !important;
                border-radius: 4px !important;
                padding: 2px 6px !important;
                min-height: 18px !important;
                font-size: 11px !important;
                line-height: 1.25 !important;
                box-shadow: none;
                transition: opacity 0.16s ease, filter 0.16s ease;
                cursor: pointer;
            }
            .fc .fc-event:hover {
                opacity: 0.96;
                filter: brightness(0.98);
            }
            .fc .fc-event-title {
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;
                max-width: 100%;
            }
            .fc .fc-daygrid-event-dot {
                border-color: currentColor !important;
            }
            .fc .fc-more-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-top: 2px;
                border: none;
                border-radius: 4px;
                padding: 2px 6px;
                background: transparent;
                color: #1a73e8 !important;
                font-weight: 500;
                font-size: 11px;
                line-height: 1.2;
                text-decoration: none !important;
                box-shadow: none;
                transition: background 0.16s ease, color 0.16s ease;
            }
            .fc .fc-daygrid-more-link:hover {
                background: #f1f3f4;
                color: #174ea6 !important;
                text-decoration: none !important;
            }
            @media (max-width: 768px) {
                .fc .fc-col-header-cell-cushion {
                    font-size: 10px;
                    padding: 10px 4px !important;
                }
                .fc .fc-daygrid-day-number {
                    width: 24px;
                    height: 24px;
                    font-size: 11px;
                    margin: 4px 0 0 4px;
                }
                .fc .fc-event {
                    font-size: 10px !important;
                    padding: 1px 4px !important;
                    min-height: 16px !important;
                    line-height: 1.1 !important;
                }
                .fc .fc-daygrid-day-frame {
                    min-height: 74px;
                }
            }
        `;
        document.head.appendChild(style);

        return () => {
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    return (
        <>
            <AnimatePresence>
                {open ? (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[3px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 28, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 18, scale: 0.98 }}
                            transition={{ duration: 0.25 }}
                            className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.20)]">
                            {/* Header */}
                            <div className="flex items-center justify-between border-slate-200 border-b bg-white px-6 py-5 md:px-8">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600 shadow-sm">
                                        <Clock3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 text-xl tracking-tight md:text-2xl">
                                            {t("title")}
                                        </h2>
                                        <p className="text-slate-500 text-sm">{t("subtitle")}</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto bg-[#FBFBFD] px-6 py-6 md:px-8">
                                {loading ? (
                                    <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 rounded-[28px] border border-slate-200 border-dashed bg-white/70">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 shadow-sm">
                                            <Clock3 className="h-7 w-7 animate-pulse text-orange-500" />
                                        </div>
                                        <p className="font-medium text-slate-500 text-sm">{t("loading")}</p>
                                    </div>
                                ) : loadError ? (
                                    <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 rounded-[28px] border border-rose-200 bg-rose-50/70 px-6 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                                            <AlertTriangle className="h-7 w-7 text-rose-500" />
                                        </div>
                                        <p className="max-w-lg text-rose-700 text-sm leading-6">{loadError}</p>
                                        <button
                                            type="button"
                                            onClick={() => void fetchTasks()}
                                            className="rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 text-xs transition hover:bg-rose-100">
                                            {t("retry")}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <CalendarToolbar
                                            mode={viewMode}
                                            onModeChange={handleChangeView}
                                            rangeLabel={rangeLabel}
                                            onPrev={handlePrev}
                                            onNext={handleNext}
                                            onToday={handleToday}
                                            t={t}
                                        />

                                        <div className="rounded-2xl border border-[#dadce0] bg-white p-2">
                                            <div className="w-full overflow-visible">
                                                <FullCalendar ref={calendarRef} {...options} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {tooltip.visible && (
                <div
                    className="pointer-events-none fixed z-[9999] w-[min(240px,calc(100vw-40px))] rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.30)]"
                    style={getTooltipPosition(tooltip)}>
                    <div className="font-semibold text-sm text-white leading-5">{tooltip.title}</div>

                    <div className="mt-2 h-px w-full bg-white/10" />

                    <div className="mt-2 space-y-1.5 text-slate-200 text-xs leading-5">
                        {tooltip.sourceType === "Group" && tooltip.sourceName && (
                            <div>
                                <span className="font-medium text-slate-400">Group:</span>{" "}
                                <span>{tooltip.sourceName}</span>
                            </div>
                        )}
                        <div>
                            <span className="font-medium text-slate-400">{t("statusLabel")}:</span>{" "}
                            <span>{tooltip.status}</span>
                        </div>
                        {Math.max(0, Math.min(100, Number(tooltip.progress ?? 0))) > 0 && (
                            <div>
                                <span className="font-medium text-slate-400">{t("progressLabel")}:</span>{" "}
                                <span>{Math.max(0, Math.min(100, Number(tooltip.progress ?? 0)))}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

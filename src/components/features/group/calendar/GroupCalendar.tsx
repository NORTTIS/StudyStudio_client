"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import enLocale from "@fullcalendar/core/locales/en-gb";
import viLocale from "@fullcalendar/core/locales/vi";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { components } from "@/api/types";
import { Container } from "@/components/common";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type GroupTaskListResponse = components["schemas"]["GroupTaskListResponse"];
type TaskSeverity = components["schemas"]["TaskSeverity"];
type TaskPriority = components["schemas"]["TaskPriority"];

type CalendarViewMode = "month" | "week" | "day";

type CalEvent = {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay?: boolean;
    color?: string;
    textColor?: string;
    extendedProps?: {
        severity?: TaskSeverity;
        priority?: TaskPriority;
        status?: string;
        assignees?: Array<{ id: string; firstName?: string; lastName?: string }>;
    };
};

type AssigneeOption = {
    id: string;
    name: string;
};

type TooltipState = {
    visible: boolean;
    x: number;
    y: number;
    title: string;
    assignees: string;
    status: string;
};

const UNASSIGNED_FILTER_VALUE = "__unassigned__";

function getTooltipPosition(tooltip: TooltipState) {
    const spacing = 12;
    const viewportPadding = 20;
    const tooltipWidth = 260;
    const estimatedTooltipHeight = 140;

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

    const minTop = viewportPadding;
    const maxTop = window.innerHeight - estimatedTooltipHeight - viewportPadding;
    const rawTop = tooltip.y + spacing;

    return {
        left: Math.max(minLeft, Math.min(rawLeft, maxLeft)),
        top: Math.max(minTop, Math.min(rawTop, maxTop))
    };
}

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

function getApiBase() {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return String(raw).replace(/\/+$/, "");
}

function apiUrl(path: string) {
    const base = getApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!base) return cleanPath;
    if (base.endsWith("/api")) return `${base}${cleanPath}`;
    return `${base}/api${cleanPath}`;
}

function getAccessTokenOrNull() {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("accessToken");
    return t ? String(t) : null;
}

function isUuidLike(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function asObject(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

const readText = async (res: Response) => {
    try {
        return await res.text();
    } catch {
        return "";
    }
};

function parseMaybeJson(raw: string) {
    const text = (raw ?? "").toString().trim();
    if (!text) return { json: null as unknown, text: "" };
    try {
        const cleaned = text.replace(/^\uFEFF/, "");
        return { json: JSON.parse(cleaned) as unknown, text };
    } catch {
        return { json: null as unknown, text };
    }
}

const okByJsonStatus = (obj: unknown) => {
    const s = String(asObject(obj)?.status ?? "").toLowerCase();
    return s === "" || s === "success" || s === "ok" || s === "true";
};

const extractApiMessage = (text: string, json: unknown, fallback: string) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    return msg || text.trim() || fallback;
};

function severityColorOf(v?: TaskSeverity): string {
    if (v === 3) return "#ef4444";
    if (v === 2) return "#f97316";
    if (v === 1) return "#f59e0b";
    return "#3b82f6";
}

function toIsoDateOnly(value: string): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getUTCFullYear();
    const m = pad2(date.getUTCMonth() + 1);
    const d = pad2(date.getUTCDate());
    return `${y}-${m}-${d}`;
}

function buildDailyDates(start: string, end: string): string[] {
    const startIso = toIsoDateOnly(start);
    const endIso = toIsoDateOnly(end);
    if (!startIso || !endIso) return [];

    const startDate = new Date(`${startIso}T00:00:00Z`);
    const endDate = new Date(`${endIso}T00:00:00Z`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];

    const safeEnd = endDate < startDate ? startDate : endDate;
    const dates: string[] = [];
    const cursor = new Date(startDate);

    while (cursor <= safeEnd) {
        const y = cursor.getUTCFullYear();
        const m = pad2(cursor.getUTCMonth() + 1);
        const d = pad2(cursor.getUTCDate());
        dates.push(`${y}-${m}-${d}`);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
}

async function apiGetGroupTasks(args: { groupId: string; fallbackMessage: string; missingApiBaseMessage: string }) {
    const base = getApiBase();
    const token = getAccessTokenOrNull();
    if (!base) throw new Error(args.missingApiBaseMessage);

    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("pageSize", "1000");

    const suffix = query.toString();
    const url = apiUrl(`/group/${encodeURIComponent(args.groupId)}/tasks${suffix ? `?${suffix}` : ""}`);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
            Accept: "text/plain, application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const raw = await readText(res);
    const { json } = parseMaybeJson(raw);

    if (!res.ok || (json && !okByJsonStatus(json))) {
        throw new Error(extractApiMessage(raw, json, args.fallbackMessage));
    }

    return (json ?? null) as ApiResponse<GroupTaskListResponse> | null;
}

function CalendarToolbar({
    mode,
    onModeChange,
    rangeLabel,
    onPrev,
    onNext,
    assigneeOptions,
    selectedAssigneeId,
    onAssigneeChange,
    t
}: {
    mode: CalendarViewMode;
    onModeChange: (mode: CalendarViewMode) => void;
    rangeLabel: string;
    onPrev: () => void;
    onNext: () => void;
    assigneeOptions: AssigneeOption[];
    selectedAssigneeId: string | null;
    onAssigneeChange: (assigneeId: string | null) => void;
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
                                "rounded-xl px-4 py-2 text-sm font-medium transition",
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

                <div className="px-2 text-center text-sm font-medium text-slate-700 whitespace-nowrap">
                    {rangeLabel}
                </div>

                <button
                    type="button"
                    onClick={onNext}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <select
                value={selectedAssigneeId || ""}
                onChange={(e) => onAssigneeChange(e.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">{t("allTasks")}</option>
                <option value={UNASSIGNED_FILTER_VALUE}>{t("unassignedTasks")}</option>
                {assigneeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function GroupCalendar() {
    const locale = useLocale();
    const t = useTranslations("GroupCalendar");
    const params = useParams<{ groupId: string }>();
    const groupId = params?.groupId ? String(params.groupId) : "";

    const calendarRef = useRef<FullCalendar | null>(null);

    const [events, setEvents] = useState<CalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        x: 0,
        y: 0,
        title: "",
        assignees: "",
        status: ""
    });

    useEffect(() => {
        const fetchTasks = async () => {
            if (!groupId) {
                setLoadError(t("missingGroupId"));
                setLoading(false);
                return;
            }

            if (!isUuidLike(groupId)) {
                setLoadError(t("invalidGroupId"));
                setLoading(false);
                return;
            }

            if (!getApiBase()) {
                setLoadError(t("missingApiBase"));
                setLoading(false);
                return;
            }

            setLoading(true);
            setLoadError(null);

            try {
                const res = await apiGetGroupTasks({
                    groupId,
                    fallbackMessage: t("cannotLoad"),
                    missingApiBaseMessage: t("missingApiBase")
                });
                const data = res?.data;
                const tasks = data?.items ?? [];

                const assigneeMap = new Map<string, AssigneeOption>();
                tasks.forEach((task) => {
                    if (task.assignees && Array.isArray(task.assignees)) {
                        task.assignees.forEach((assignee) => {
                            if (assignee.id && !assigneeMap.has(assignee.id)) {
                                const firstName = assignee.firstName ?? "";
                                const lastName = assignee.lastName ?? "";
                                const name = `${firstName} ${lastName}`.trim() || t("unknown");
                                assigneeMap.set(assignee.id, { id: assignee.id, name });
                            }
                        });
                    }
                });
                setAssigneeOptions(Array.from(assigneeMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

                const filteredTasks = tasks.filter((task) => {
                    if (selectedAssigneeId === UNASSIGNED_FILTER_VALUE) {
                        return !task.assignees || task.assignees.length === 0;
                    }

                    if (selectedAssigneeId) {
                        return task.assignees?.some((assignee) => assignee.id === selectedAssigneeId) ?? false;
                    }

                    // Show all tasks in calendar when no assignee filter is selected.
                    return true;
                });

                const calEvents: CalEvent[] = filteredTasks
                    .filter((task) => task.startDate && task.dueDate)
                    .flatMap((task, index) => {
                        const baseId = String(task.taskId ?? "").trim() || `task_${index}`;
                        const title = String(task.taskTitle ?? "").trim() || t("untitledTask");
                        const start = String(task.startDate ?? "").trim();
                        const end = String(task.dueDate ?? "").trim();
                        const hasAssignees = Boolean(task.assignees && task.assignees.length > 0);
                        const color = hasAssignees ? severityColorOf(task.taskSeverity) : "#e5e7eb";
                        const textColor = hasAssignees ? "#ffffff" : "#374151";
                        const days = buildDailyDates(start, end);

                        return days.map((day, dayIndex) => ({
                            id: `${baseId}_${dayIndex}`,
                            title,
                            start: day,
                            allDay: true,
                            color,
                            textColor,
                            extendedProps: {
                                severity: task.taskSeverity,
                                priority: task.taskPriority,
                                status: String(task.statusName ?? "").trim(),
                                assignees:
                                    task.assignees?.map((a) => ({
                                        id: a.id ?? "",
                                        firstName: a.firstName ?? "",
                                        lastName: a.lastName ?? ""
                                    })) ?? []
                            }
                        }));
                    });

                setEvents(calEvents);
            } catch (e: unknown) {
                setLoadError(e instanceof Error ? e.message : t("cannotLoad"));
            } finally {
                setLoading(false);
            }
        };

        void fetchTasks();
    }, [groupId, selectedAssigneeId, t]);

    const calendarViewName = useMemo(() => {
        if (viewMode === "month") return "dayGridMonth";
        if (viewMode === "week") return "dayGridWeek";
        return "dayGridDay";
    }, [viewMode]);

    const rangeLabel = useMemo(() => {
        return getRangeLabel(currentDate, viewMode, locale, t("monthPrefix"));
    }, [currentDate, viewMode, locale, t]);

    const syncCalendarState = () => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        setCurrentDate(api.getDate());
    };

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

    const options = useMemo(
        () => ({
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
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
                        assignees?: Array<{ id: string; firstName?: string; lastName?: string }>;
                        status?: string;
                    };
                };
            }) => {
                const assignees = info.event.extendedProps?.assignees ?? [];
                const assigneeNames = assignees
                    .map((a) => `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim())
                    .filter(Boolean)
                    .join(", ");

                setTooltip({
                    visible: true,
                    x: info.jsEvent.clientX,
                    y: info.jsEvent.clientY,
                    title: info.event.title || t("untitledTask"),
                    assignees: assigneeNames || t("unassigned"),
                    status: info.event.extendedProps?.status || t("noStatus")
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
        [calendarViewName, events, locale, t]
    );

    return (
        <div className="min-h-screen w-full bg-[#f8f9fa]">
            <Container className="px-4 pb-8 pt-6 md:px-6 lg:px-8">
                <section>
                    <div className="relative rounded-3xl border border-[#dadce0] bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.12),0_1px_3px_1px_rgba(60,64,67,0.08)] sm:p-6 lg:p-7">
                        <div className="relative">
                            {loading ? (
                                <div className="flex min-h-[620px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-slate-200 bg-white/70">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 shadow-sm">
                                        <Clock3 className="h-7 w-7 animate-pulse text-orange-500" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">{t("loading")}</p>
                                </div>
                            ) : loadError ? (
                                <div className="flex min-h-[620px] flex-col items-center justify-center gap-4 rounded-[28px] border border-rose-200 bg-rose-50/70 px-6 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                                        <AlertTriangle className="h-7 w-7 text-rose-500" />
                                    </div>
                                    <p className="max-w-lg text-sm leading-6 text-rose-700">{loadError}</p>
                                    <button
                                        type="button"
                                        onClick={() => window.location.reload()}
                                        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                                        {t("reload")}
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
                                        assigneeOptions={assigneeOptions}
                                        selectedAssigneeId={selectedAssigneeId}
                                        onAssigneeChange={setSelectedAssigneeId}
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
                    </div>
                </section>
            </Container>

            {tooltip.visible && (
                <div
                    className="pointer-events-none fixed z-[9999] w-[min(260px,calc(100vw-40px))] rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.30)]"
                    style={getTooltipPosition(tooltip)}>
                    <div className="text-sm font-semibold leading-5 text-white">{tooltip.title}</div>

                    <div className="mt-2 h-px w-full bg-white/10" />

                    <div className="mt-2 space-y-1.5 text-xs leading-5 text-slate-200">
                        <div>
                            <span className="font-medium text-slate-400">{t("assigneeLabel")}:</span>{" "}
                            <span>{tooltip.assignees}</span>
                        </div>
                        <div>
                            <span className="font-medium text-slate-400">{t("statusLabel")}:</span>{" "}
                            <span>{tooltip.status}</span>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                html,
                body {
                    margin: 0;
                    padding: 0;
                    background: #f8fafc;
                }

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
                    transition:
                        opacity 0.16s ease,
                        filter 0.16s ease;
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

                .fc .fc-timegrid-slot,
                .fc .fc-timegrid-axis,
                .fc .fc-timegrid-col {
                    border-color: #e8eaed !important;
                }

                .fc .fc-timegrid-now-indicator-line {
                    border-color: #ea4335 !important;
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
                    transition:
                        background 0.16s ease,
                        color 0.16s ease;
                }

                .fc .fc-daygrid-more-link:hover {
                    background: #f1f3f4;
                    color: #174ea6 !important;
                    text-decoration: none !important;
                }

                .fc .fc-daygrid-more-link:focus-visible {
                    outline: 2px solid #1a73e8;
                    outline-offset: 2px;
                }

                .fc .fc-popover {
                    border: 1px solid #dadce0 !important;
                    border-radius: 12px !important;
                    overflow: hidden;
                    background: #ffffff !important;
                    box-shadow:
                        0 1px 2px rgba(60, 64, 67, 0.2),
                        0 2px 6px rgba(60, 64, 67, 0.15) !important;
                }

                .fc .fc-popover-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 10px 12px !important;
                    border-bottom: 1px solid #e8eaed;
                    background: #ffffff;
                }

                .fc .fc-popover-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #3c4043;
                }

                .fc .fc-popover-close {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 9999px;
                    color: #5f6368 !important;
                    transition:
                        background-color 0.16s ease,
                        color 0.16s ease;
                }

                .fc .fc-popover-close:hover {
                    color: #202124 !important;
                    background: #f1f3f4;
                }

                .fc .fc-popover-body {
                    padding: 8px;
                    max-height: 240px;
                    overflow: auto;
                }

                .fc .fc-popover-body .fc-daygrid-event-harness {
                    margin-top: 4px;
                }

                @media (max-width: 1024px) {
                    .fc .fc-daygrid-day-frame {
                        min-height: 92px;
                    }
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

                    .fc .fc-more-link {
                        padding: 1px 6px;
                        font-size: 10px;
                    }
                }
            `}</style>
        </div>
    );
}
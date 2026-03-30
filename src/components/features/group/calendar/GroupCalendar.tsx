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
                                active
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-slate-500 hover:text-orange-600"
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1">
                <button
                    type="button"
                    onClick={onPrev}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="px-2 text-center text-sm font-medium text-slate-700 whitespace-nowrap">
                    {rangeLabel}
                </div>

                <button
                    type="button"
                    onClick={onNext}
                    className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <select
                value={selectedAssigneeId || ""}
                onChange={(e) => onAssigneeChange(e.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
                <option value="">{t("allTasks")}</option>
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
                    if (!task.assignees || task.assignees.length === 0) {
                        return false;
                    }

                    if (selectedAssigneeId) {
                        return task.assignees.some((assignee) => assignee.id === selectedAssigneeId);
                    }

                    return true;
                });

                const calEvents: CalEvent[] = filteredTasks
                    .filter((task) => task.startDate && task.dueDate)
                    .map((task, index) => {
                        const id = String(task.taskId ?? "").trim() || `task_${index}`;
                        const title = String(task.taskTitle ?? "").trim() || t("untitledTask");
                        const start = String(task.startDate ?? "").trim();
                        const end = String(task.dueDate ?? "").trim();
                        const color = severityColorOf(task.taskSeverity);

                        return {
                            id,
                            title,
                            start,
                            end,
                            allDay: true,
                            color,
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
                        };
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
            showNonCurrentDates: false,
            fixedWeekCount: false,
            headerToolbar: false as const,
            selectable: false,
            editable: false,
            dayMaxEvents: 2,
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
        <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_24%),linear-gradient(180deg,_#fff7ed_0%,_#ffffff_38%,_#f8fafc_100%)]">
            <Container className="px-4 pb-8 pt-6 md:px-6 lg:px-8">
                <section>
                    <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/75 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7">
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,255,255,0.12))]" />

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
                                        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                    >
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

                                    <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 p-2 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                                        <FullCalendar ref={calendarRef} {...options} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </Container>

            {tooltip.visible && (
                <div
                    className="pointer-events-none fixed z-[9999] w-[260px] rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.30)]"
                    style={{
                        left: tooltip.x + 14,
                        top: tooltip.y + 14
                    }}
                >
                    <div className="text-sm font-semibold leading-5 text-white">
                        {tooltip.title}
                    </div>

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
                    font-family: inherit;
                    color: #0f172a;
                }

                .fc .fc-toolbar {
                    display: none !important;
                }

                .fc .fc-scrollgrid {
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 20px !important;
                    overflow: hidden !important;
                    background: rgba(255, 255, 255, 0.95);
                }

                .fc .fc-scrollgrid-section > td,
                .fc .fc-scrollgrid-section > th {
                    border-color: #e2e8f0 !important;
                }

                .fc-theme-standard td,
                .fc-theme-standard th {
                    border-color: #e2e8f0 !important;
                }

                .fc .fc-col-header-cell {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    padding: 8px 0;
                }

                .fc .fc-col-header-cell-cushion {
                    color: #475569;
                    font-weight: 700;
                    font-size: 13px;
                    letter-spacing: 0.02em;
                    text-decoration: none;
                    padding: 12px 6px !important;
                }

                .fc .fc-daygrid-day {
                    background: #ffffff;
                    transition: background 0.22s ease;
                }

                .fc .fc-daygrid-day-number {
                    color: #64748b;
                    font-size: 13px;
                    font-weight: 700;
                    padding: 10px 12px !important;
                    text-decoration: none !important;
                }

                .fc .fc-day-other .fc-daygrid-day-number {
                    color: #cbd5e1;
                }

                .fc .fc-day-today {
                    background: rgba(249, 115, 22, 0.08) !important;
                }

                .fc .fc-daygrid-day.fc-day-today {
                    background: rgba(249, 115, 22, 0.08) !important;
                }

                .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 32px;
                    height: 32px;
                    margin: 6px 0 0 6px;
                    border-radius: 9999px;
                    background: #f97316;
                    color: white !important;
                    box-shadow: 0 8px 20px rgba(249, 115, 22, 0.35);
                }

                .fc .fc-event {
                    border: none !important;
                    border-radius: 6px !important;
                    padding: 1px 4px !important;
                    min-height: 16px !important;
                    font-size: 10px !important;
                    line-height: 1.1 !important;
                    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease,
                        opacity 0.18s ease;
                    cursor: pointer;
                }

                .fc .fc-event:hover {
                    transform: translateY(-0.5px);
                    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.10);
                    opacity: 0.95;
                }

                .fc .fc-event-title {
                    font-weight: 600;
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
                    border-color: #e2e8f0 !important;
                }

                .fc .fc-timegrid-now-indicator-line {
                    border-color: #f97316 !important;
                }

                .fc .fc-more-link {
                    color: #ea580c !important;
                    font-weight: 700;
                    font-size: 12px;
                }

                .fc .fc-daygrid-more-link:hover {
                    text-decoration: underline;
                }

                .fc .fc-daygrid-day-frame {
                    min-height: 100px;
                }

                @media (max-width: 1024px) {
                    .fc .fc-daygrid-day-frame {
                        min-height: 85px;
                    }
                }

                @media (max-width: 768px) {
                    .fc .fc-col-header-cell-cushion {
                        font-size: 12px;
                        padding: 10px 4px !important;
                    }

                    .fc .fc-daygrid-day-number {
                        font-size: 12px;
                        padding: 8px !important;
                    }

                    .fc .fc-event {
                        font-size: 9px !important;
                        padding: 1px 3px !important;
                        min-height: 15px !important;
                        line-height: 1 !important;
                    }

                    .fc .fc-daygrid-day-frame {
                        min-height: 70px;
                    }
                }
            `}</style>
        </div>
    );
}
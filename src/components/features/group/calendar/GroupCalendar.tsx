"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/types";
import { Container } from "@/components/common";

type ApiResponse<T> = { status?: string; code?: string; message?: string; data?: T };

type GroupTaskListResponse = components["schemas"]["GroupTaskListResponse"];
type TaskSeverity = components["schemas"]["TaskSeverity"];
type TaskPriority = components["schemas"]["TaskPriority"];

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
    };
};

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

const extractApiMessage = (text: string, json: unknown) => {
    const msg = String(asObject(json)?.message ?? "").trim();
    return msg || text.trim() || "An error occurred";
};

function severityColorOf(v?: TaskSeverity): string {
    if (v === 3) return "#dc2626"; // red-600 - Critical
    if (v === 2) return "#ea580c"; // orange-600 - Major
    if (v === 1) return "#f59e0b"; // amber-600 - Moderate
    return "#0284c7"; // sky-600 - Minor
}

async function apiGetGroupTasks(args: { groupId: string }) {
    const base = getApiBase();
    const token = getAccessTokenOrNull();
    if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL.");

    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("pageSize", "1000"); // Get all tasks for calendar view

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
        throw new Error(extractApiMessage(raw, json));
    }

    return (json ?? null) as ApiResponse<GroupTaskListResponse> | null;
}

export default function GroupCalendar() {
    const locale = useLocale();
    const t = useTranslations("GroupTaskListPage");
    const params = useParams<{ groupId: string }>();
    const groupId = params?.groupId ? String(params.groupId) : "";

    const [events, setEvents] = useState<CalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

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
                const res = await apiGetGroupTasks({ groupId });
                const data = res?.data;
                const tasks = data?.items ?? [];

                const calEvents: CalEvent[] = tasks
                    .filter((task) => task.startDate && task.dueDate) // Only tasks with both dates
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
                                status: String(task.statusName ?? "").trim()
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
    }, [groupId, t]);

    const options = useMemo(
        () => ({
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: "dayGridMonth",
            height: "auto",
            showNonCurrentDates: false,
            fixedWeekCount: false,

            headerToolbar: {
                left: "prev,next title",
                right: "today dayGridMonth,timeGridWeek,timeGridDay"
            },

            buttonText: {
                today: locale === "vi" ? "Hôm nay" : "Today",
                month: locale === "vi" ? "Tháng" : "Month",
                week: locale === "vi" ? "Tuần" : "Week",
                day: locale === "vi" ? "Ngày" : "Day"
            },

            selectable: false,
            editable: false,
            dayMaxEvents: true,

            events
        }),
        [events, locale]
    );

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                    {loading ? (
                        <div className="flex min-h-100 items-center justify-center">
                            <p className="text-sm text-zinc-500">{t("loading")}</p>
                        </div>
                    ) : loadError ? (
                        <div className="flex min-h-100 flex-col items-center justify-center gap-3">
                            <p className="text-rose-600 text-sm">{loadError}</p>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-100">
                                {t("reload")}
                            </button>
                        </div>
                    ) : (
                        <FullCalendar {...options} />
                    )}
                </div>
            </Container>

            <style jsx global>{`
                .fc {
                    font-family: inherit;
                }

                .fc .fc-toolbar-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #261e33;
                }

                .fc .fc-button {
                    background: #ffffff !important;
                    border: 1px solid #e5e5e5 !important;
                    color: #261e33 !important;
                    box-shadow: none !important;
                    text-transform: none !important;
                    font-weight: 500 !important;
                    border-radius: 8px !important;
                    padding: 6px 10px !important;
                }

                .fc .fc-button:hover {
                    background: #fafafa !important;
                }

                .fc .fc-button-primary:not(:disabled).fc-button-active,
                .fc .fc-button-primary:not(:disabled):active {
                    background: #f3f4f6 !important;
                }

                .fc .fc-scrollgrid,
                .fc .fc-scrollgrid-section > td,
                .fc .fc-scrollgrid-section > th {
                    border-color: #ededed !important;
                }

                .fc .fc-col-header-cell-cushion {
                    color: #6f6b99;
                    font-weight: 500;
                    text-decoration: none;
                }

                .fc .fc-daygrid-day-number {
                    color: #6f6b99;
                    font-size: 13px;
                }

                .fc .fc-event {
                    border: none !important;
                    border-radius: 6px !important;
                    padding: 2px 6px !important;
                    font-size: 12px !important;
                }

                .fc .fc-event-title {
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}

"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { AlertTriangle, Clock3 } from "lucide-react";
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
    if (v === 3) return "#dc2626";
    if (v === 2) return "#ea580c";
    if (v === 1) return "#f59e0b";
    return "#0284c7";
}

async function apiGetGroupTasks(args: { groupId: string }) {
    const base = getApiBase();
    const token = getAccessTokenOrNull();
    if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL.");

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
            dayMaxEvents: 3,
            events
        }),
        [events, locale]
    );

    return (
        <div className="min-h-screen w-full bg-white">
            <Container className="px-4 pt-0 pb-6 md:px-6">
                <section className="pt-0">
                    <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:p-6">
                        {loading ? (
                            <div className="flex min-h-[620px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/60">
                                <Clock3 className="h-8 w-8 animate-pulse text-zinc-400" />
                                <p className="text-sm text-zinc-500">{t("loading")}</p>
                            </div>
                        ) : loadError ? (
                            <div className="flex min-h-[620px] flex-col items-center justify-center gap-3 rounded-[24px] border border-rose-200 bg-rose-50/60 px-6 text-center">
                                <AlertTriangle className="h-8 w-8 text-rose-500" />
                                <p className="max-w-lg text-sm text-rose-700">{loadError}</p>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                                    {t("reload")}
                                </button>
                            </div>
                        ) : (
                            <FullCalendar {...options} />
                        )}
                    </div>
                </section>
            </Container>

            <style jsx global>{`
                html,
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                }

                .fc {
                    font-family: inherit;
                    color: #261e33;
                }

                .fc .fc-toolbar {
                    gap: 12px;
                    margin-bottom: 20px !important;
                    flex-wrap: wrap;
                }

                .fc .fc-toolbar-title {
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    color: #261e33;
                }

                .fc .fc-button {
                    background: rgba(255, 255, 255, 0.92) !important;
                    border: 1px solid #e7e5e4 !important;
                    color: #261e33 !important;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04) !important;
                    text-transform: none !important;
                    font-weight: 600 !important;
                    border-radius: 14px !important;
                    padding: 8px 14px !important;
                    transition: all 0.2s ease !important;
                }

                .fc .fc-button:hover {
                    background: #fff7f1 !important;
                    border-color: #fed7aa !important;
                    color: #ea580c !important;
                }

                .fc .fc-button-primary:not(:disabled).fc-button-active,
                .fc .fc-button-primary:not(:disabled):active {
                    background: linear-gradient(135deg, #f97316 0%, #ea580c 45%, #dc2626 100%) !important;
                    border-color: transparent !important;
                    color: white !important;
                    box-shadow: 0 12px 24px rgba(249, 115, 22, 0.22) !important;
                }

                .fc .fc-scrollgrid {
                    border: 1px solid #ece7e2 !important;
                    border-radius: 20px !important;
                    overflow: hidden !important;
                    background: rgba(255, 255, 255, 0.78);
                }

                .fc .fc-scrollgrid-section > td,
                .fc .fc-scrollgrid-section > th {
                    border-color: #f0ece7 !important;
                }

                .fc .fc-col-header-cell {
                    background: rgba(250, 250, 250, 0.8);
                    padding: 6px 0;
                }

                .fc .fc-col-header-cell-cushion {
                    color: #7a6c61;
                    font-weight: 600;
                    text-decoration: none;
                    padding: 10px 4px !important;
                }

                .fc .fc-daygrid-day {
                    background: rgba(255, 255, 255, 0.72);
                    transition: background 0.2s ease;
                }

                .fc .fc-daygrid-day:hover {
                    background: rgba(255, 247, 241, 0.55);
                }

                .fc .fc-daygrid-day-number {
                    color: #6f6b99;
                    font-size: 13px;
                    font-weight: 600;
                    padding: 10px !important;
                }

                .fc .fc-day-today {
                    background: rgba(249, 115, 22, 0.06) !important;
                }

                .fc .fc-event {
                    border: none !important;
                    border-radius: 10px !important;
                    padding: 4px 8px !important;
                    font-size: 12px !important;
                    line-height: 1.35 !important;
                    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
                }

                .fc .fc-event-title {
                    font-weight: 600;
                }

                .fc .fc-timegrid-slot,
                .fc .fc-timegrid-axis,
                .fc .fc-timegrid-col {
                    border-color: #f0ece7 !important;
                }

                .fc .fc-timegrid-now-indicator-line {
                    border-color: #f97316 !important;
                }

                .fc .fc-more-link {
                    color: #ea580c !important;
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .fc .fc-toolbar-title {
                        font-size: 20px;
                    }

                    .fc .fc-toolbar {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .fc .fc-toolbar-chunk {
                        width: 100%;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    }
                }
            `}</style>
        </div>
    );
}
"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMemo, useState } from "react";
import { Container } from "@/components/common";

type CalEvent = {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay?: boolean;
    color?: string;
};

function isoDate(y: number, m: number, d: number) {
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

export default function GroupCalendar() {
    const [events, setEvents] = useState<CalEvent[]>([
        { id: "1", title: "Tài liệu yêu cầu", start: isoDate(2026, 1, 18), allDay: true, color: "#22c55e" },
        { id: "2", title: "Thiết lập dự án", start: isoDate(2026, 1, 20), allDay: true, color: "#22c55e" },
        { id: "3", title: "Giao diện trang Landing", start: isoDate(2026, 1, 23), allDay: true, color: "#f59e0b" },
        { id: "4", title: "Thiết kế schema database", start: isoDate(2026, 1, 24), allDay: true, color: "#3b82f6" },
        { id: "5", title: "Thiết lập hệ thống thiết kế", start: isoDate(2026, 1, 25), allDay: true, color: "#ef4444" },
        { id: "6", title: "Tài liệu API", start: isoDate(2026, 1, 26), allDay: true, color: "#f97316" },
        { id: "7", title: "Triển khai đăng nhập", start: isoDate(2026, 1, 27), allDay: true, color: "#ef4444" }
    ]);

    const options = useMemo(
        () => ({
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: "dayGridMonth",
            initialDate: isoDate(2026, 1, 1),
            height: "auto",
            showNonCurrentDates: false,
            fixedWeekCount: false,

            headerToolbar: {
                left: "prev,next title",
                right: "today dayGridMonth,timeGridWeek,timeGridDay"
            },

            buttonText: { today: "Hôm nay", month: "Tháng", week: "Tuần", day: "Ngày" },

            selectable: true,
            editable: true,
            dayMaxEvents: true,

            select: (info: any) => {
                const name = window.prompt("Tên sự kiện?");
                if (!name) return;

                const id = String(Date.now());
                setEvents((prev) => [
                    ...prev,
                    {
                        id,
                        title: name,
                        start: info.startStr,
                        end: info.endStr,
                        allDay: info.allDay,
                        color: "#22c55e"
                    }
                ]);
            },

            eventClick: (info: any) => {
                const ok = window.confirm(`Xóa "${info.event.title}"?`);
                if (!ok) return;
                setEvents((prev) => prev.filter((e) => e.id !== info.event.id));
            },

            events
        }),
        [events]
    );

    return (
        <div className="w-full">
            <Container className="px-6">
                <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                    <FullCalendar {...options} />
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

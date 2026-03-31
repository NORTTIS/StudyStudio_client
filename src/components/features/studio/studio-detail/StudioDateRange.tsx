"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

interface StudioDateRangeProps {
    startDate: string;
    dueDate: string;
    showProgress?: boolean;
}

export function StudioDateRange({ startDate, dueDate, showProgress = true }: StudioDateRangeProps) {
    const locale = useLocale();
    const t = useTranslations("StudioDateRange");

    const dateInfo = useMemo(() => {
        // Guard: if either date is missing, show placeholder
        if (!startDate || !dueDate) {
            return null;
        }

        const start = new Date(startDate);
        const due = new Date(dueDate);
        const now = new Date();

        const totalDays = Math.floor((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let progressPercent = Math.round((elapsedDays / totalDays) * 100);
        progressPercent = Math.max(0, Math.min(100, progressPercent));

        const isOverdue = now > due;
        const overdueDays = isOverdue ? elapsedDays - totalDays : 0;
        const localeTag = locale === "vi" ? "vi-VN" : "en-US";

        return {
            startDate: start.toLocaleDateString(localeTag, { day: "numeric", month: "short", year: "numeric" }),
            dueDate: due.toLocaleDateString(localeTag, { day: "numeric", month: "short", year: "numeric" }),
            totalDays,
            elapsedDays,
            remainingDays: isOverdue ? 0 : remainingDays,
            overdueDays,
            progressPercent,
            isOverdue,
            isFuture: now < start
        };
    }, [startDate, dueDate, locale]);

    if (!dateInfo) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 font-semibold text-[#261E33]">{t("title")}</h3>
                <div className="flex items-center justify-center py-6 text-gray-400 text-sm">{t("notAvailable")}</div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[#261E33]">{t("title")}</h3>
                {dateInfo.isOverdue && (
                    <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-600 text-xs">
                        {t("status.overdue")}
                    </span>
                )}
                {dateInfo.isFuture && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-600 text-xs">
                        {t("status.upcoming")}
                    </span>
                )}
            </div>

            <div className="mb-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                        <CalendarDays className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">{t("labels.start")}</p>
                        <p className="font-medium text-[#261E33]">{dateInfo.startDate}</p>
                    </div>
                </div>

                <div className="h-10 w-px bg-gray-200" />

                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                        <Clock3 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">{t("labels.end")}</p>
                        <p className="font-medium text-[#261E33]">{dateInfo.dueDate}</p>
                    </div>
                </div>

                <div className="h-10 w-px bg-gray-200" />

                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Clock3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">
                            {dateInfo.isOverdue ? t("labels.overdue") : t("labels.remaining")}
                        </p>
                        <p className={`font-medium ${dateInfo.isOverdue ? "text-red-600" : "text-[#261E33]"}`}>
                            {dateInfo.isOverdue
                                ? t("days", { count: dateInfo.overdueDays })
                                : t("days", { count: dateInfo.remainingDays })}
                        </p>
                    </div>
                </div>
            </div>

            {showProgress && (
                <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t("progress.title")}</span>
                        <span className="font-medium text-[#261E33]">{dateInfo.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                            className={`h-full transition-all ${
                                dateInfo.isOverdue
                                    ? "bg-red-500"
                                    : dateInfo.progressPercent > 75
                                      ? "bg-green-500"
                                      : dateInfo.progressPercent > 50
                                        ? "bg-blue-500"
                                        : "bg-orange-500"
                            }`}
                            style={{ width: `${dateInfo.progressPercent}%` }}
                        />
                    </div>
                    <p className="mt-2 text-gray-500 text-xs">
                        {t("progress.elapsed", { elapsed: dateInfo.elapsedDays, total: dateInfo.totalDays })}
                    </p>
                </div>
            )}
        </div>
    );
}

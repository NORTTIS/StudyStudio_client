"use client";

import { AlertCircle, Clock3, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { calculateScheduleStatus, type GroupProgress } from "./types";

interface GroupProgressChartProps {
    groups: GroupProgress[];
    studioStartDate: string;
    studioDueDate: string;
}

export function GroupProgressChart({ groups, studioStartDate, studioDueDate }: GroupProgressChartProps) {
    const t = useTranslations("GroupProgressChart");

    const getStatusColor = (status: "on-track" | "at-risk" | "behind") => {
        switch (status) {
            case "on-track":
                return "bg-green-500";
            case "at-risk":
                return "bg-orange-500";
            case "behind":
                return "bg-red-500";
        }
    };

    const getStatusTextColor = (status: "on-track" | "at-risk" | "behind") => {
        switch (status) {
            case "on-track":
                return "text-green-600";
            case "at-risk":
                return "text-orange-600";
            case "behind":
                return "text-red-600";
        }
    };

    const getStatusLabel = (scheduleStatus: { status: "on-track" | "at-risk" | "behind"; message: string }) => {
        if (scheduleStatus.message === "Chưa bắt đầu") return t("status.notStarted");
        if (scheduleStatus.status === "on-track") return t("status.onTrack");
        if (scheduleStatus.status === "at-risk") return t("status.atRisk");
        return t("status.behind");
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[#261E33]">{t("title")}</h3>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-gray-500">{t("status.onTrack")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span className="text-gray-500">{t("status.atRisk")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-gray-500">{t("status.behind")}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {groups.map((group) => {
                    const scheduleStatus = calculateScheduleStatus(group, studioStartDate, studioDueDate);

                    return (
                        <div key={group.groupId} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium text-[#261E33]">{group.groupName}</span>
                                </div>
                                <span className={`font-medium text-xs ${getStatusTextColor(scheduleStatus.status)}`}>
                                    {getStatusLabel(scheduleStatus)}
                                </span>
                            </div>

                            {/* Progress Bar - Custom striped pattern */}
                            <div className="mb-3 flex items-center gap-3">
                                <div className="h-4 flex-1 overflow-hidden rounded bg-gray-200">
                                    <div
                                        className={`relative h-full ${getStatusColor(scheduleStatus.status)}`}
                                        style={{ width: `${group.progress}%` }}>
                                        {/* Diagonal stripes pattern */}
                                        <svg
                                            className="absolute inset-0 h-full w-full"
                                            xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <pattern
                                                    id={`stripes-${group.groupId}`}
                                                    patternUnits="userSpaceOnUse"
                                                    width="4"
                                                    height="4"
                                                    patternTransform="rotate(45)">
                                                    <line
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="4"
                                                        stroke="rgba(255,255,255,0.2)"
                                                        strokeWidth="1"
                                                    />
                                                </pattern>
                                            </defs>
                                            <rect width="100%" height="100%" fill={`url(#stripes-${group.groupId})`} />
                                        </svg>
                                    </div>
                                </div>
                                <span className="min-w-[45px] text-right font-semibold text-[#261E33]">
                                    {group.progress.toFixed(0)}%
                                </span>
                            </div>

                            {/* Task info */}
                            <div className="flex items-center gap-4 text-gray-500 text-xs">
                                <div className="flex items-center gap-1">
                                    <Layers className="h-3.5 w-3.5" />
                                    <span>
                                        {group.completedTasks} / {group.totalTasks} {t("taskInfo.tasks")}
                                    </span>
                                </div>

                                {group.overdueCount > 0 && (
                                    <div className="flex items-center gap-1 text-red-500">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>{t("taskInfo.overdue", { count: group.overdueCount })}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    <span>{t("taskInfo.lastActivity", { value: group.lastActivity })}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

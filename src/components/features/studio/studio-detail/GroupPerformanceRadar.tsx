"use client";

import { useState } from "react";
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip
} from "recharts";
import { type GroupPerformance } from "./types";

interface GroupPerformanceRadarProps {
    data: GroupPerformance[];
}

export function GroupPerformanceRadar({ data }: GroupPerformanceRadarProps) {
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
        new Set(data.map((d) => d.groupId))
    );

    const colors = ["#FF5F3D", "#4CAF50", "#2196F3", "#9C27B0", "#FF9800", "#00BCD4"];

    // Transform data for radar chart
    const chartData = data[0]
        ? [
              { metric: "Hoàn thành task", ...Object.fromEntries(data.map((d) => [d.groupId, d.completedTasks])) },
              { metric: "Thảo luận", ...Object.fromEntries(data.map((d) => [d.groupId, d.discussionMessages])) },
              { metric: "Hợp tác", ...Object.fromEntries(data.map((d) => [d.groupId, d.collaboration])) }
          ]
        : [];

    const toggleGroup = (groupId: string) => {
        const newSelected = new Set(selectedGroups);
        if (newSelected.has(groupId)) {
            newSelected.delete(groupId);
        } else {
            newSelected.add(groupId);
        }
        setSelectedGroups(newSelected);
    };

    const getGroupColor = (groupId: string, index: number) => {
        const groupIndex = data.findIndex((d) => d.groupId === groupId);
        return colors[groupIndex % colors.length];
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[#261E33]">So sánh hiệu suất nhóm</h3>
            </div>

            {/* Group selector */}
            <div className="mb-4 flex flex-wrap gap-2">
                {data.map((group, index) => (
                    <button
                        key={group.groupId}
                        type="button"
                        onClick={() => toggleGroup(group.groupId)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            selectedGroups.has(group.groupId)
                                ? "text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        style={{
                            backgroundColor: selectedGroups.has(group.groupId)
                                ? colors[index % colors.length]
                                : undefined
                        }}>
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{
                                backgroundColor: selectedGroups.has(group.groupId)
                                    ? "white"
                                    : colors[index % colors.length]
                            }}
                        />
                        {group.groupName}
                    </button>
                ))}
            </div>

            {/* Radar Chart */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fill: "#6F6B99", fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "#9CA3AF", fontSize: 10 }}
                        />
                        {data.map((group, index) => {
                            if (!selectedGroups.has(group.groupId)) return null;
                            return (
                                <Radar
                                    key={group.groupId}
                                    name={group.groupName}
                                    dataKey={group.groupId}
                                    stroke={colors[index % colors.length]}
                                    fill={colors[index % colors.length]}
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                />
                            );
                        })}
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                                            <p className="mb-2 font-medium text-[#261E33]">
                                                {payload[0]?.payload?.metric}
                                            </p>
                                            {payload.map((entry: any, index: number) => (
                                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                                    {entry.name}: {entry.value}%
                                                </p>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend / Summary */}
            <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {data
                        .filter((g) => selectedGroups.has(g.groupId))
                        .map((group, index) => (
                            <div key={group.groupId} className="rounded-lg bg-gray-50 p-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <span className="font-medium text-[#261E33] text-sm">{group.groupName}</span>
                                </div>
                                <div className="space-y-1 text-xs text-gray-500">
                                    <div className="flex justify-between">
                                        <span>Task:</span>
                                        <span className="font-medium text-[#261E33]">{group.completedTasks}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Thảo luận:</span>
                                        <span className="font-medium text-[#261E33]">{group.discussionMessages}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Hợp tác:</span>
                                        <span className="font-medium text-[#261E33]">{group.collaboration}%</span>
                                    </div>
                                    <div className="mt-1 border-t border-gray-200 pt-1">
                                        <div className="flex justify-between font-medium">
                                            <span>TB:</span>
                                            <span style={{ color: colors[index % colors.length] }}>
                                                {group.averageScore.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

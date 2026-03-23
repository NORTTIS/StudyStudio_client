"use client";

import { getGroupAnalytics } from "@/api/analytics";
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Filter, Flame, Layers, TrendingUp, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { twMerge } from "tailwind-merge";
import { Container } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GroupAnalyticsResponse, GroupProgressData, GroupActivityHeatmapData } from "@/api/analytics";

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={twMerge("rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm", className)}>
            {children}
        </div>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
    sub
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <Card>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-medium text-[#6F6B99] text-sm">{label}</p>
                    <p className="mt-2 font-semibold text-3xl text-[#261E33]">{value}</p>
                    {sub ? <p className="mt-2 text-[#9CA3AF] text-xs">{sub}</p> : null}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F7]">
                    <Icon className="h-5 w-5 text-[#261E33]" />
                </div>
            </div>
        </Card>
    );
}

const pieColors = ["#FF5722", "#7C3AED", "#22C55E"];

function dateRangeFor(range: "7d" | "30d" | "90d"): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    if (range === "7d") start.setDate(end.getDate() - 7);
    else if (range === "30d") start.setDate(end.getDate() - 30);
    else start.setDate(end.getDate() - 90);
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10)
    };
}

export default function GroupAnalyticPage() {
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");

    const [range, setRange] = React.useState<"7d" | "30d" | "90d">("7d");
    const [search, setSearch] = React.useState("");
    const [analytics, setAnalytics] = React.useState<GroupAnalyticsResponse | null>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!groupId) return;
        setLoading(true);
        const { startDate, endDate } = dateRangeFor(range);
        getGroupAnalytics(groupId, { startDate, endDate })
            .then((res) => {
                if (res.status === "success" && res.data) setAnalytics(res.data);
            })
            .catch(() => {/* silent fail */})
            .finally(() => setLoading(false));
    }, [groupId, range]);

    // Derive chart data from API response
    const progressTrend = React.useMemo((): { date: string; completed: number; created: number }[] => {
        if (!analytics?.progress) return [];
        return analytics.progress.map((p: GroupProgressData) => ({
            date: p.date ?? "",
            completed: p.completedTasks ?? 0,
            created: p.totalTasks ?? 0
        }));
    }, [analytics]);

    const activity = React.useMemo((): { day: string; tasks: number }[] => {
        if (!analytics?.activityHeatmap) return [];
        return analytics.activityHeatmap.map((a: GroupActivityHeatmapData) => ({
            day: a.date ?? "",
            tasks: a.activityCount ?? 0
        }));
    }, [analytics]);

    const totalTasks = analytics?.progress?.reduce((s, p) => s + (p.totalTasks ?? 0), 0) ?? 0;
    const completedTasks = analytics?.progress?.reduce((s, p) => s + (p.completedTasks ?? 0), 0) ?? 0;
    const completionRate = analytics?.completionRate ?? 0;
    const activeMembers = analytics?.memberContribution?.length ?? 0;
    const pendingTasks = totalTasks - completedTasks;

    return (
        <Container className="px-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3 py-1 font-medium text-[#6F6B99] text-xs">
                        <BarChart3 className="h-4 w-4" />
                        Phân tích nhóm
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <h2 className="font-semibold text-2xl text-[#261E33]">Tổng quan & hiệu suất</h2>

                        {completionRate >= 75 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700 text-xs ring-1 ring-green-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Tốt
                            </span>
                        ) : completionRate >= 50 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 font-semibold text-yellow-700 text-xs ring-1 ring-yellow-200">
                                <Clock3 className="h-3 w-3" />
                                Trung bình
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700 text-xs ring-1 ring-red-200">
                                <TrendingUp className="h-3 w-3" />
                                Cần cải thiện
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[#6F6B99] text-sm">
                        Theo dõi tiến độ, khối lượng công việc và mức độ tương tác trong nhóm.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm hoạt động gần đây..."
                            className="h-10 w-full rounded-xl border-[#EDEDED] bg-white pr-10 sm:w-[260px]"
                        />
                        <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9CA3AF]">
                            <Filter className="h-4 w-4" />
                        </div>
                    </div>

                    <Select value={range} onValueChange={(v) => setRange(v as any)}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-[#EDEDED] bg-white sm:w-[150px]">
                            <SelectValue placeholder="Khoảng thời gian" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">7 ngày gần đây</SelectItem>
                            <SelectItem value="30d">30 ngày gần đây</SelectItem>
                            <SelectItem value="90d">90 ngày gần đây</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button className="h-10 rounded-xl bg-[#FF5722] text-white hover:bg-[#e24d1e]">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Xuất báo cáo
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                    <>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                    </>
                ) : (
                    <>
                        <Stat icon={Layers} label="Tổng số công việc" value={String(totalTasks)} sub="Tạo trong khoảng thời gian này" />
                        <Stat icon={CheckCircle2} label="Đã hoàn thành" value={String(completedTasks)} sub={`Tỷ lệ hoàn thành ${completionRate}%`} />
                        <Stat icon={Clock3} label="Đang thực hiện" value={String(pendingTasks)} sub="Chưa hoàn thành" />
                        <Stat icon={Users} label="Thành viên hoạt động" value={String(activeMembers)} sub="Có đăng bài hoặc cập nhật" />
                    </>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-[#261E33] text-sm">Xu hướng tiến độ công việc</p>
                            <p className="mt-1 text-[#6F6B99] text-sm">
                                Công việc tạo mới vs đã hoàn thành theo thời gian
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-[#F5F5F7] px-3 py-2 font-medium text-[#261E33] text-xs">
                            <CalendarDays className="h-4 w-4" />
                            {range === "7d" ? "Tuần này" : range === "30d" ? "Tháng này" : "Quý này"}
                        </div>
                    </div>

                    <div className="mt-4 h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={progressTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="created"
                                    stroke="#FF5722"
                                    fill="#FF5722"
                                    fillOpacity={0.12}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="completed"
                                    stroke="#22C55E"
                                    fill="#22C55E"
                                    fillOpacity={0.12}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <p className="font-semibold text-[#261E33] text-sm">Phân bổ trạng thái</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">Cần làm / Đang làm / Hoàn thành</p>

                    {loading ? (
                        <div className="mt-4 flex h-[280px] items-center justify-center">
                            <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip />
                                        <Pie
                                            data={[
                                                { name: "Cần làm", value: pendingTasks },
                                                { name: "Đang làm", value: pendingTasks > 0 ? Math.round(pendingTasks * 0.3) : 0 },
                                                { name: "Hoàn thành", value: completedTasks }
                                            ]}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={3}>
                                            {[{ name: "Cần làm", value: pendingTasks }, { name: "Đang làm", value: 0 }, { name: "Hoàn thành", value: completedTasks }].map((_, idx) => (
                                                <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                                            ))}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-3 space-y-2">
                                {[
                                    { name: "Cần làm", value: pendingTasks },
                                    { name: "Đang làm", value: pendingTasks > 0 ? Math.round(pendingTasks * 0.3) : 0 },
                                    { name: "Hoàn thành", value: completedTasks }
                                ].map((s, idx) => (
                                    <div key={s.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                                            />
                                            <span className="text-[#261E33]">{s.name}</span>
                                        </div>
                                        <span className="font-semibold text-[#261E33]">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <p className="font-semibold text-[#261E33] text-sm">Hoạt động theo tuần</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">Số hoạt động theo ngày</p>

                    <div className="mt-4 h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="tasks" fill="#FF5722" radius={[6, 6, 0, 0]} name="Hoạt động" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <p className="font-semibold text-[#261E33] text-sm">Khối lượng theo thành viên</p>
                    <p className="mt-1 text-[#6F6B99] text-sm">Đóng góp của từng thành viên trong nhóm</p>

                    {loading || !analytics?.memberContribution ? (
                        <div className="mt-4 flex h-[280px] items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                        </div>
                    ) : analytics.memberContribution.length === 0 ? (
                        <div className="mt-4 flex h-[280px] items-center justify-center text-sm text-[#6F6B99]">Không có dữ liệu.</div>
                    ) : (
                        <div className="mt-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={analytics.memberContribution.map((m) => ({
                                        name: (m.userName ?? m.userId ?? "").slice(0, 8),
                                        hoanThanh: m.tasksCompleted ?? 0,
                                        daTao: m.tasksCreated ?? 0,
                                        tinNhan: m.messagesSent ?? 0
                                    }))}
                                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="hoanThanh" fill="#22C55E" radius={[6, 6, 0, 0]} name="Hoàn thành" />
                                    <Bar dataKey="daTao" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Đã tạo" />
                                    <Bar dataKey="tinNhan" fill="#FF5722" radius={[6, 6, 0, 0]} name="Tin nhắn" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>
            </div>

            <div className="mt-6">
                <Card>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-[#261E33] text-sm">Hoạt động gần đây</p>
                            <p className="mt-1 text-[#6F6B99] text-sm">
                                Tóm tắt nhanh các cập nhật mới nhất trong nhóm
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-xl bg-[#FFF3ED] px-3 py-2 font-semibold text-[#FF5722] text-xs">
                            <Flame className="h-4 w-4" />
                            Nổi bật
                        </div>
                    </div>

                    <div className="mt-4 divide-y divide-[#F1F1F1]">
                        {!analytics || loading ? (
                            <div className="py-10 text-center text-[#6F6B99] text-sm">Đang tải...</div>
                        ) : analytics.memberContribution && analytics.memberContribution.length > 0 ? (
                            analytics.memberContribution.map((member) => (
                                <div key={member.userId} className="flex items-center justify-between gap-4 py-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-[#261E33] text-sm">
                                            {member.userName ?? member.userId}
                                        </p>
                                        <p className="mt-1 text-[#6F6B99] text-sm">
                                            {member.tasksCompleted ?? 0} hoàn thành · {member.tasksCreated ?? 0} đã tạo · {member.messagesSent ?? 0} tin nhắn
                                        </p>
                                    </div>
                                    <div className="shrink-0 rounded-full border border-[#EDEDED] bg-white px-3 py-1 font-semibold text-[#261E33] text-xs">
                                        {member.contributionPercentage != null ? `${member.contributionPercentage}%` : "—"}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-[#6F6B99] text-sm">Không có dữ liệu thành viên.</div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="h-10" />
        </Container>
    );
}

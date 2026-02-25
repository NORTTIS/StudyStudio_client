"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
    Cell
} from "recharts";
import { twMerge } from "tailwind-merge";
import {
    BarChart3,
    CheckCircle2,
    Clock3,
    Flame,
    Layers,
    TrendingUp,
    Users,
    CalendarDays,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/)/i, "");
const extractGroupIdFromPath = (pathname: string) => {
    const p = stripLocale(pathname || "");
    const m = p.match(/^\/group\/([^/]+)/i);
    return m?.[1] || "";
};

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div
            className={twMerge(
                "rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm",
                className
            )}
        >
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
                    <p className="text-sm font-medium text-[#6F6B99]">{label}</p>
                    <p className="mt-2 text-3xl font-semibold text-[#261E33]">{value}</p>
                    {sub ? <p className="mt-2 text-xs text-[#9CA3AF]">{sub}</p> : null}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F7]">
                    <Icon className="h-5 w-5 text-[#261E33]" />
                </div>
            </div>
        </Card>
    );
}

const activity = [
    { day: "T2", tasks: 8, docs: 2, discussions: 3 },
    { day: "T3", tasks: 6, docs: 4, discussions: 2 },
    { day: "T4", tasks: 10, docs: 1, discussions: 4 },
    { day: "T5", tasks: 7, docs: 3, discussions: 3 },
    { day: "T6", tasks: 12, docs: 2, discussions: 5 },
    { day: "T7", tasks: 4, docs: 1, discussions: 1 },
    { day: "CN", tasks: 5, docs: 2, discussions: 2 }
];

const progressTrend = [
    { date: "T1", completed: 12, created: 20 },
    { date: "T2", completed: 18, created: 25 },
    { date: "T3", completed: 22, created: 28 },
    { date: "T4", completed: 30, created: 35 }
];

const workload = [
    { name: "Đạt", todo: 8, doing: 4, done: 10 },
    { name: "NH", todo: 6, doing: 3, done: 7 },
    { name: "U3", todo: 4, doing: 2, done: 6 },
    { name: "U4", todo: 9, doing: 5, done: 8 },
    { name: "U5", todo: 3, doing: 1, done: 4 }
];

const taskStatus = [
    { name: "Cần làm", value: 30 },
    { name: "Đang làm", value: 18 },
    { name: "Hoàn thành", value: 42 }
];

const pieColors = ["#FF5722", "#7C3AED", "#22C55E"];

const recent = [
    { title: "Đã gộp schema CSDL", meta: "Đạt • 2 giờ trước", tag: "Xong" },
    { title: "Cập nhật tài liệu API", meta: "NH • 5 giờ trước", tag: "Tài liệu" },
    { title: "Review UI trang Landing", meta: "U4 • hôm qua", tag: "Review" },
    { title: "Thảo luận luồng đăng nhập", meta: "Đạt • hôm qua", tag: "Thảo luận" }
];

export default function GroupAnalyticPage() {
    const pathname = usePathname();
    const groupId = extractGroupIdFromPath(pathname || "");

    const [range, setRange] = React.useState<"7d" | "30d" | "90d">("7d");
    const [search, setSearch] = React.useState("");

    const filteredRecent = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return recent;
        return recent.filter((x) => x.title.toLowerCase().includes(q));
    }, [search]);

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-6xl px-6 py-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-xs font-medium text-[#6F6B99]">
                            <BarChart3 className="h-4 w-4" />
                            Phân tích nhóm
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <h2 className="text-2xl font-semibold text-[#261E33]">
                                Tổng quan & hiệu suất
                            </h2>

                            <span className="inline-flex items-center rounded-full bg-[#FFF3ED] px-3 py-1 text-xs font-semibold text-[#FF5722] ring-1 ring-[#FFE3D8]">
                                Sắp ra mắt
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-[#6F6B99]">
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
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
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
                    <Stat icon={Layers} label="Tổng số công việc" value="90" sub="Tạo trong khoảng thời gian này" />
                    <Stat icon={CheckCircle2} label="Đã hoàn thành" value="42" sub="Tỷ lệ hoàn thành 46.7%" />
                    <Stat icon={Clock3} label="Đang thực hiện" value="18" sub="Trên tất cả thành viên" />
                    <Stat icon={Users} label="Thành viên hoạt động" value="5" sub="Có đăng bài hoặc cập nhật" />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[#261E33]">Xu hướng tiến độ công việc</p>
                                <p className="mt-1 text-sm text-[#6F6B99]">
                                    Công việc tạo mới vs đã hoàn thành theo thời gian
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-xl bg-[#F5F5F7] px-3 py-2 text-xs font-medium text-[#261E33]">
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
                                    <Area type="monotone" dataKey="created" stroke="#FF5722" fill="#FF5722" fillOpacity={0.12} />
                                    <Area type="monotone" dataKey="completed" stroke="#22C55E" fill="#22C55E" fillOpacity={0.12} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-[#261E33]">Phân bổ trạng thái</p>
                        <p className="mt-1 text-sm text-[#6F6B99]">Cần làm / Đang làm / Hoàn thành</p>

                        <div className="mt-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip />
                                    <Pie
                                        data={taskStatus}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                    >
                                        {taskStatus.map((_, idx) => (
                                            <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-3 space-y-2">
                            {taskStatus.map((s, idx) => (
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
                    </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <p className="text-sm font-semibold text-[#261E33]">Hoạt động theo tuần</p>
                        <p className="mt-1 text-sm text-[#6F6B99]">Công việc / Tài liệu / Thảo luận</p>

                        <div className="mt-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="tasks" fill="#FF5722" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="docs" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="discussions" fill="#22C55E" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-[#261E33]">Khối lượng theo thành viên</p>
                        <p className="mt-1 text-sm text-[#6F6B99]">Cần làm / Đang làm / Hoàn thành theo từng người</p>

                        <div className="mt-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={workload} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="todo" stroke="#FF5722" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="doing" stroke="#7C3AED" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="done" stroke="#22C55E" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <div className="mt-6">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[#261E33]">Hoạt động gần đây</p>
                                <p className="mt-1 text-sm text-[#6F6B99]">
                                    Tóm tắt nhanh các cập nhật mới nhất trong nhóm
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-xl bg-[#FFF3ED] px-3 py-2 text-xs font-semibold text-[#FF5722]">
                                <Flame className="h-4 w-4" />
                                Nổi bật
                            </div>
                        </div>

                        <div className="mt-4 divide-y divide-[#F1F1F1]">
                            {filteredRecent.length === 0 ? (
                                <div className="py-10 text-center text-sm text-[#6F6B99]">
                                    Không có kết quả.
                                </div>
                            ) : (
                                filteredRecent.map((x, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-4 py-4">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#261E33]">{x.title}</p>
                                            <p className="mt-1 text-sm text-[#6F6B99]">{x.meta}</p>
                                        </div>
                                        <div className="shrink-0 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-xs font-semibold text-[#261E33]">
                                            {x.tag}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                <div className="h-10" />
            </div>
        </div>
    );
}
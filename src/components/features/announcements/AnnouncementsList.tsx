"use client";

import { useEffect, useState } from "react";
import { getUserAnnouncements, getUserAnnouncementTypeColor, type UserAnnouncement } from "@/api/announcements";

export function AnnouncementsList() {
    const [announcements, setAnnouncements] = useState<UserAnnouncement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAnnouncements = async () => {
            setIsLoading(true);
            try {
                const result = await getUserAnnouncements("vi");
                if (result.status === "success" && result.data) {
                    const activeAnnouncements = result.data.filter((a) => a.isActive);
                    setAnnouncements(activeAnnouncements);
                } else {
                    setAnnouncements([]);
                }
            } catch (error) {
                console.error("Error loading announcements:", error);
                setAnnouncements([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnnouncements();
    }, []);

    if (isLoading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="animate-pulse">
                    <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
                    <div className="space-y-3">
                        <div className="h-4 w-full rounded bg-gray-200" />
                        <div className="h-4 w-3/4 rounded bg-gray-200" />
                    </div>
                </div>
            </div>
        );
    }

    if (announcements.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="mb-2 text-gray-400">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z"
                        />
                    </svg>
                </div>
                <h3 className="mb-2 font-semibold text-[#261E33] text-lg">Không có thông báo</h3>
                <p className="text-[#6F6B99] text-sm">Hiện tại chưa có thông báo nào từ hệ thống.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#261E33] text-lg">
                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z"
                    />
                </svg>
                Thông báo ({announcements.length})
            </h3>
            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div
                        key={announcement.announcementId}
                        className="rounded-lg border border-gray-100 p-4 transition-shadow hover:shadow-sm">
                        <div className="mb-2 flex items-start justify-between">
                            <h4 className="font-semibold text-[#261E33] text-base">{announcement.title}</h4>
                            <span
                                className={`rounded px-2 py-1 font-medium text-xs ${getUserAnnouncementTypeColor(announcement.type)}`}>
                                {announcement.type}
                            </span>
                        </div>
                        <p className="mb-3 text-[#6F6B99] text-sm leading-relaxed">{announcement.content}</p>
                        <div className="flex items-center justify-between text-[#9CA3AF] text-xs">
                            <span>Ngày đăng: {new Date(announcement.publishedAt).toLocaleDateString("vi-VN")}</span>
                            <span>Tạo lúc: {new Date(announcement.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

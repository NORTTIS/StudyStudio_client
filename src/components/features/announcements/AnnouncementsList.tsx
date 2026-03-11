"use client";

import { useEffect, useState } from "react";
import { getUserAnnouncements, type UserAnnouncement, getUserAnnouncementTypeColor } from "@/api/announcements";

export function AnnouncementsList() {
    const [announcements, setAnnouncements] = useState<UserAnnouncement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAnnouncements = async () => {
            setIsLoading(true);
            try {
                const result = await getUserAnnouncements("vi");
                if (result.status === "success" && result.data) {
                    const activeAnnouncements = result.data.filter(a => a.isActive);
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
                    <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (announcements.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z" />
                    </svg>
                </div>
                <h3 className="font-semibold text-[#261E33] text-lg mb-2">Không có thông báo</h3>
                <p className="text-[#6F6B99] text-sm">Hiện tại chưa có thông báo nào từ hệ thống.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-[#261E33] text-lg mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z" />
                </svg>
                Thông báo ({announcements.length})
            </h3>
            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div key={announcement.announcementId} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-[#261E33] text-base">{announcement.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getUserAnnouncementTypeColor(announcement.type)}`}>
                                {announcement.type}
                            </span>
                        </div>
                        <p className="text-[#6F6B99] text-sm mb-3 leading-relaxed">{announcement.content}</p>
                        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                            <span>Ngày đăng: {new Date(announcement.publishedAt).toLocaleDateString("vi-VN")}</span>
                            <span>Tạo lúc: {new Date(announcement.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
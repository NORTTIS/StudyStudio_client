"use client";

import { useEffect, useState } from "react";

export function SimpleAnnouncements() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("http://localhost:8080/api/announcements", {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
                        "Accept-Language": "vi"
                    }
                });
                const result = await response.json();

                console.log("🚀 Direct fetch result:", result);

                if (result.status === "success" && result.data) {
                    const active = result.data.filter((item: any) => item.isActive);
                    console.log("🎯 Active announcements:", active);
                    setData(active);
                }
            } catch (error) {
                console.error("❌ Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    console.log("🎨 SimpleAnnouncements render:", { loading, dataLength: data.length });

    if (loading) {
        return <div className="p-4 bg-yellow-100">⏳ Loading...</div>;
    }

    if (data.length === 0) {
        return <div className="p-4 bg-red-100">❌ No announcements</div>;
    }

    return (
        <div className="p-4 bg-green-100">
            <h3 className="font-bold mb-2">✅ Announcements ({data.length})</h3>
            {data.map((item: any) => (
                <div key={item.announcementId} className="mb-2 p-2 bg-white rounded">
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.content}</p>
                </div>
            ))}
        </div>
    );
}
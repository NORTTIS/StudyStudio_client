"use client";

import { ReportDetailPage } from "@/components/features/admin/reports/ReportDetailPage";

export default function AdminReportDetailPage({ params }: { params: { id: string } }) {
    return <ReportDetailPage reportId={params.id} />;
}

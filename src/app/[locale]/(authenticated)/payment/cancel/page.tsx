"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function PaymentCancelPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const idFromQuery = searchParams.get("id");
    const paymentIdFromQuery = searchParams.get("paymentId");
    const rawId = idFromQuery || paymentIdFromQuery;
    const paymentId = rawId && rawId !== "undefined" && rawId !== "null" ? rawId : null;

    useEffect(() => {
        if (paymentId) {
            router.replace(`/${locale}/payment/status/${paymentId}`);
        } else {
            router.replace(`/${locale}/settings/billing`);
        }
    }, [paymentId, router, locale]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8]">
            <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF5F3D]" />
                <p className="text-[#6F6B99] text-sm">Đang xử lý kết quả thanh toán...</p>
            </div>
        </div>
    );
}

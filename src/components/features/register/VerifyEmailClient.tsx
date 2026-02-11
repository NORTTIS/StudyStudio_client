"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailClient() {
    const locale = useLocale();
    const params = useSearchParams();

    const token = params.get("token");

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<
        "success" | "invalid" | "already" | "error"
    >("error");

    const [message, setMessage] = useState("");

    // ================= VERIFY EMAIL =================
    useEffect(() => {
        const verifyEmail = async () => {
            setLoading(true);

            if (!token) {
                setStatus("invalid");
                setMessage("Liên kết xác thực không hợp lệ hoặc đã bị thiếu token.");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(
                    `http://localhost:8080/api/auth/verify-email?token=${encodeURIComponent(
                        token
                    )}`
                );

                const data = await res.json();

                if (!res.ok) {
                    const msg = data.message || "Token không hợp lệ.";

                    // ✅ Case: đã verify rồi
                    if (
                        msg.toLowerCase().includes("đã xác thực") ||
                        msg.toLowerCase().includes("already verified") ||
                        msg.toLowerCase().includes("token used")
                    ) {
                        setStatus("already");
                        setMessage("Tài khoản của bạn đã được xác thực trước đó.");
                    }

                    // ⚠️ Token sai hoặc hết hạn
                    else if (
                        msg.toLowerCase().includes("hết hạn") ||
                        msg.toLowerCase().includes("expired") ||
                        msg.toLowerCase().includes("invalid") ||
                        msg.toLowerCase().includes("không hợp lệ")
                    ) {
                        setStatus("invalid");
                        setMessage("Liên kết xác thực không hợp lệ hoặc đã hết hạn.");
                    }

                    // ❌ lỗi khác
                    else {
                        setStatus("error");
                        setMessage("Có lỗi xảy ra. Vui lòng thử lại sau.");
                    }

                    setLoading(false);
                    return;
                }

                // ✅ Verify thành công
                setStatus("success");
                setMessage("Xác thực email thành công. Bạn có thể đăng nhập ngay.");
            } catch (err) {
                console.error("VERIFY ERROR:", err);
                setStatus("error");
                setMessage("Không thể kết nối tới server. Vui lòng thử lại.");
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [token]);

    // ================= UI =================
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                {/* LOGO */}
                <div className="mb-6 flex items-center justify-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path
                            d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z"
                            fill="#FB923C"
                        />
                    </svg>

                    <span className="font-bold text-3xl text-orange-500 leading-tight">
                        Study <br /> Studio
                    </span>
                </div>

                {/* TITLE */}
                <h1 className="mb-2 text-center font-bold text-2xl">
                    Xác thực Email
                </h1>

                <p className="mb-6 text-center text-muted-foreground text-sm">
                    Kích hoạt tài khoản Study Studio của bạn
                </p>

                {/* LOADING */}
                {loading && (
                    <p className="text-center text-sm text-gray-500">
                        ⏳ Đang xác thực email, vui lòng chờ...
                    </p>
                )}

                {/* ================= SUCCESS / ALREADY VERIFIED ================= */}
                {!loading && (status === "success" || status === "already") && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    stroke="#F97316"
                                    strokeWidth="3"
                                    fill="none"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </div>

                        <h2 className="mb-2 text-center font-semibold text-base">
                            Xác thực thành công
                        </h2>

                        <p className="mb-6 text-center text-sm text-muted-foreground leading-relaxed">
                            {message}
                            <br />
                            Bạn có thể đăng nhập để bắt đầu sử dụng hệ thống.
                        </p>

                        <Link
                            href={`/${locale}/login`}
                            className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white hover:bg-orange-600 transition"
                        >
                            Quay lại đăng nhập
                        </Link>
                    </>
                )}

                {/* ================= INVALID TOKEN / EXPIRED ================= */}
                {!loading && status === "invalid" && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-400">
                                <span className="text-2xl text-yellow-500">⚠️</span>
                            </div>
                        </div>

                        <h2 className="mb-2 text-center font-semibold text-base">
                            Liên kết không hợp lệ
                        </h2>

                        <p className="mb-6 text-center text-sm text-muted-foreground leading-relaxed">
                            {message}
                            <br />
                            Vui lòng đăng ký lại hoặc yêu cầu gửi email xác thực mới.
                        </p>

                        <Link
                            href={`/${locale}/login`}
                            className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white hover:bg-orange-600 transition"
                        >
                            Quay lại đăng nhập
                        </Link>
                    </>
                )}

                {/* ================= SYSTEM ERROR ================= */}
                {!loading && status === "error" && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-400">
                                <span className="text-2xl text-gray-500">❗</span>
                            </div>
                        </div>

                        <h2 className="mb-2 text-center font-semibold text-base">
                            Có lỗi xảy ra
                        </h2>

                        <p className="mb-6 text-center text-sm text-muted-foreground leading-relaxed">
                            {message}
                        </p>

                        <Link
                            href={`/${locale}/login`}
                            className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white hover:bg-orange-600 transition"
                        >
                            Quay lại đăng nhập
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

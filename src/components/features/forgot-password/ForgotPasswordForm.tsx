"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ForgotPasswordForm() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    /* ================= EMAIL VALIDATION ================= */
    const validateEmail = (value: string): string | null => {
        if (!value) {
            return "Vui lòng nhập email.";
        }

        if (value.includes(" ")) {
            return "Email không được chứa khoảng trắng.";
        }

        if (!value.includes("@")) {
            return "Email phải chứa ký tự @.";
        }

        const [localPart, domain] = value.split("@");

        if (!localPart) {
            return "Phần trước ký tự @ không được để trống.";
        }

        if (!domain) {
            return "Email phải có phần sau ký tự @.";
        }

        if (!domain.includes(".")) {
            return "Email phải có tên miền hợp lệ (ví dụ: gmail.com).";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return "Email không đúng định dạng.";
        }

        return null;
    };

    /* ================= MOCK API ================= */
    const mockForgotPasswordApi = (email: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // ✅ email tồn tại trong DB (mock)
                if (email === "user@gmail.com") {
                    resolve();
                } else {
                    reject(new Error("EMAIL_NOT_REGISTERED"));
                }
            }, 800);
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            return;
        }

        setIsLoading(true);

        try {
            // 🔹 MOCK API để test
            await mockForgotPasswordApi(email);

            router.push(
                `/vi/forgot-password/success?email=${encodeURIComponent(email)}`
            );
        } catch (err) {
            if (
                err instanceof Error &&
                err.message === "EMAIL_NOT_REGISTERED"
            ) {
                setError("Email chưa được đăng ký.");
            } else {
                setError("Có lỗi xảy ra, vui lòng thử lại.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path
                            d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z"
                            fill="#FB923C"
                        />
                    </svg>

                    <span className="text-3xl font-bold text-orange-500">
                        Study <br /> Studio
                    </span>
                </div>

                <h1 className="mb-2 text-center text-2xl font-bold">
                    Quên mật khẩu
                </h1>

                <p className="mb-6 text-center text-sm text-muted-foreground">
                    Liên kết tạo mật khẩu mới sẽ được gửi tới email của bạn
                </p>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-4"
                >
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Email
                        </label>
                        <input
                            type="text"
                            placeholder="you@email.com"
                            className="w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
                    >
                        {isLoading ? "Đang gửi..." : "Gửi liên kết"}
                    </button>

                    <div className="mt-4 flex items-center gap-2 text-gray-500 transition hover:text-orange-500">
                        <span className="text-xl">←</span>
                        <Link href="/vi/login" className="text-sm font-medium">
                            Quay lại đăng nhập
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
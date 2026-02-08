"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { env } from "@/utils/env";

export function ForgotPasswordForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email) return;

        setIsLoading(true);
        setError("");

        try {
            // TODO: Uncomment when API is ready
            // const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({ email }),
            // })

            // if (!response.ok) {
            //     const data = await response.json()
            //     throw new Error(data.message || 'Có lỗi xảy ra, vui lòng thử lại')
            // }

            // Success - redirect to success page
            router.push(`/vi/forgot-password/success?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                {/* LOGO */}
                <div className="mb-6 flex items-center justify-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                    </svg>

                    <span className="font-bold text-3xl text-orange-500">
                        Study <br /> Studio
                    </span>
                </div>

                <h1 className="mb-2 text-center font-bold text-2xl">Quên mật khẩu</h1>

                <p className="mb-6 text-center text-muted-foreground text-sm">
                    Liên kết tạo mật khẩu mới sẽ được gửi tới email của bạn
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* EMAIL */}
                    <div>
                        {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
                        <label className="mb-1 block font-medium text-sm">Email</label>
                        <input
                            type="email"
                            placeholder="you@email.com"
                            className="w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* ERROR MESSAGE */}
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>
                    )}

                    {/* BUTTON */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">
                        {isLoading ? "Đang gửi..." : "Gửi liên kết"}
                    </button>

                    {/* BACK TO LOGIN */}
                    <div className="mt-4 flex items-center gap-2 text-gray-500 transition hover:text-orange-500">
                        <span className="text-xl">←</span>
                        <Link href="/vi/login" className="font-medium text-sm">
                            Quay lại đăng nhập
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

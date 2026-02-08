'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ForgotPasswordForm() {
    const router = useRouter()
    const [email, setEmail] = useState('')

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!email) return

        router.push(
            `/vi/forgot-password/success?email=${encodeURIComponent(email)}`
        )
    }

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

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* EMAIL */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Email
                        </label>
                        <input
                            type="email"
                            placeholder="you@email.com"
                            className="w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* BUTTON */}
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600"
                    >
                        Gửi liên kết
                    </button>

                    {/* BACK TO LOGIN */}
                    <div className="mt-4 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition">
                        <span className="text-xl">←</span>
                        <Link href="/vi/login" className="text-sm font-medium">
                            Quay lại đăng nhập
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

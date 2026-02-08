'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type Props = {
    email?: string
}

export function ForgotPasswordSuccess({ email }: Props) {

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md rounded-xl shadow-xl">
                <CardHeader className="flex flex-col items-center gap-4 pt-8">
                    {/* LOGO */}
                    <div className="flex items-center gap-3">
                        <svg width="48" height="48" viewBox="0 0 64 64">
                            <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                            <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                        </svg>

                        <span className="text-3xl font-bold text-orange-500">
                            Study <br /> Studio
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-center">
                        Đặt lại mật khẩu
                    </h1>

                    <p className="text-center text-muted-foreground text-sm">
                        Hãy kiểm tra email của bạn để biết các bước tiếp theo
                    </p>

                    <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" stroke="#F97316" strokeWidth="3" fill="none">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-8 text-center">
                    <h2 className="text-lg font-semibold mb-3">
                        Kiểm tra email của bạn
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Chúng tôi đã gửi liên kết đặt lại mật khẩu đến
                        <br />
                        <span className="font-medium text-foreground">
                            {email || 'email của bạn'}
                        </span>
                        <br />
                        Liên kết sẽ hết hạn sau 24 giờ.
                        <br />
                        Nếu bạn không thấy email, vui lòng kiểm tra thư mục spam.
                    </p>

                    <div className="mt-6 border-t pt-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                        >
                            ← Quay lại đăng nhập
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
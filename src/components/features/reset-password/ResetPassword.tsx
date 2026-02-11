"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { ResetPasswordSuccess } from "./ResetPasswordSuccess";

type Props = {
    token?: string;
};

export function ResetPassword({ token }: Props) {
    // true = còn hạn | false = hết hạn
    const [isValidToken, setIsValidToken] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!token) {
            setIsValidToken(true);
            return;
        }

        // 🔹 TODO: GET /reset-password/verify?token=...
        setIsValidToken(true); // mock
    }, [token]);

    if (isSuccess) {
        return <ResetPasswordSuccess />;
    }

    if (!isValidToken) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                    <Logo />

                    <h1 className="mt-4 text-2xl font-bold">
                        Liên kết đặt lại mật khẩu không hợp lệ
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                    </p>

                    <Link href="/vi/login">
                        <Button className="mt-6 w-full bg-orange-500 hover:bg-orange-600">
                            Quay lại trang đăng nhập
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleResetPassword = () => {
        setError("");

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{10,20}$/;

        if (!passwordRegex.test(password)) {
            setError(
                "Mật khẩu phải từ 10 đến 20 ký tự, bao gồm ít nhất 1 chữ viết hoa và 1 chữ số."
            );
            return;
        }
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        // 🔹 TODO: POST /reset-password
        // body: { token, password }

        // MOCK success
        setIsSuccess(true);
    };

    /* ================= TOKEN CÒN HẠN ================= */
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                <Logo />

                <h1 className="mb-2 text-center text-2xl font-bold">
                    Tạo mật khẩu mới
                </h1>

                <p className="mb-6 text-center text-sm text-muted-foreground">
                    Nhập mật khẩu mới cho tài khoản của bạn
                </p>

                <div className="space-y-4">
                    <div>
                        <Label className="mb-1 block text-sm font-medium">
                            Mật khẩu mới
                        </Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-1 block text-sm font-medium">
                            Xác nhận mật khẩu
                        </Label>
                        <div className="relative">
                            <Input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={handleResetPassword}
                    >
                        Đặt lại mật khẩu
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Logo() {
    return (
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
    );
}
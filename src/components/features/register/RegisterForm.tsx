"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const locale = useLocale();

  // ================= STATE =================
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= VALIDATORS =================
  const nameRegex = /^[A-Za-zÀ-ỹ\s]{1,10}$/;
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,20}$/;

  const validateEmail = (value: string): string | null => {
    if (!value) return "Vui lòng nhập email.";
    if (value.includes(" ")) return "Email không được chứa khoảng trắng.";

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value))
      return "Email không đúng định dạng (ví dụ: abc@gmail.com).";

    return null;
  };

  // ================= SUBMIT REGISTER =================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ✅ Validate required fields
    if (
      !lastName.trim() ||
      !firstName.trim() ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    // ✅ Validate name
    if (!nameRegex.test(lastName)) {
      setError("Họ không được chứa số và tối đa 10 ký tự.");
      return;
    }

    if (!nameRegex.test(firstName)) {
      setError("Tên không được chứa số và tối đa 10 ký tự.");
      return;
    }

    // ✅ Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // ✅ Validate password
    if (!passwordRegex.test(password)) {
      setError("Mật khẩu phải từ 8–20 ký tự, gồm 1 chữ in hoa và 1 số.");
      return;
    }

    // ✅ Confirm password match
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    // ================= CALL API REGISTER =================
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            confirmPassword,
            firstName,
            lastName,
          }),
        }
      );

      const data = await res.json();

      // ❌ Register failed
      if (!res.ok) {
        setError(data.message || "Đăng ký thất bại. Vui lòng thử lại.");
        return;
      }

      // ✅ Register success → BE sends verify email
      setSuccess(data.message);

      // Redirect login after 2s
      setTimeout(() => {
        window.location.href = `/${locale}/login`;
      }, 2000);
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setError("Không thể kết nối tới server. Vui lòng thử lại.");
    }
  };

  // ================= REGISTER WITH GOOGLE =================
  const handleRegisterWithGoogle = () => {
    window.location.href = `/${locale}/register-gg`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
        <p className="text-sm text-muted-foreground">
          Bắt đầu sử dụng Study Studio miễn phí
        </p>
      </div>

      {/* Google button */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 hover:bg-gray-100 flex items-center justify-center"
        onClick={handleRegisterWithGoogle}
      >
        {/* Google Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          width="18"
          height="18"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.2 1.53 7.63 2.8l5.56-5.56C33.64 3.36 29.24 1.5 24 1.5 14.98 1.5 7.21 6.98 3.69 14.91l6.91 5.36C12.4 14.3 17.77 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.14 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.46c-.54 2.88-2.16 5.32-4.6 6.98l7.05 5.49C43.73 36.36 46.14 30.9 46.14 24.5z"
          />
          <path
            fill="#FBBC05"
            d="M10.6 28.27A14.5 14.5 0 0 1 9.5 24c0-1.48.26-2.91.72-4.27l-6.9-5.36A23.9 23.9 0 0 0 1.5 24c0 3.86.93 7.5 2.82 10.73l6.28-6.46z"
          />
          <path
            fill="#34A853"
            d="M24 46.5c6.48 0 11.92-2.13 15.9-5.78l-7.05-5.49c-1.96 1.32-4.47 2.1-8.85 2.1-6.2 0-11.45-4.19-13.3-9.83l-6.3 6.47C7.9 41.94 15.5 46.5 24 46.5z"
          />
        </svg>

        Tiếp tục với Google
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        Hoặc tiếp tục với
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Họ</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Tên</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <Label>Mật khẩu</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <Label>Nhập lại mật khẩu</Label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              className="pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
            <p className="mt-1">
              📩 Email xác thực đã được gửi. Đang chuyển sang trang đăng nhập...
            </p>
          </div>
        )}

        {/* Submit */}
        <Button className="w-full bg-orange-500 hover:bg-orange-600">
          Tạo tài khoản
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link
          href={`/${locale}/login`}
          className="text-orange-600 font-medium hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

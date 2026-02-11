"use client";

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function RegisterGoogleForm() {
  const router = useRouter();
  const locale = useLocale();

  // ✅ Register with Google
  const handleGoogleRegister = async (credential: string | undefined) => {
    if (!credential) {
      alert("Không lấy được Google Token ❌");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },

        // ✅ Backend yêu cầu idToken
        body: JSON.stringify({
          idToken: credential
        })
      });

      if (!res.ok) {
        alert("Đăng ký bằng Google thất bại ❌");
        return;
      }

      alert("Tạo tài khoản Google thành công 🎉");

      // Redirect login
      router.push(`/${locale}/login`);
    } catch (err) {
      console.error("GOOGLE REGISTER ERROR:", err);
      alert("Không thể kết nối server ❌");
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-center font-bold text-2xl">Tạo tài khoản với Google</h1>

          <p className="text-center text-muted-foreground text-sm">Chọn tài khoản Google để đăng ký Study Studio</p>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(res) => handleGoogleRegister(res.credential)}
              onError={() => alert("Google Register bị lỗi hoặc bị hủy ❌")}
            />
          </div>

          <button
            onClick={() => router.push(`/${locale}/register`)}
            className="w-full text-center text-orange-600 text-sm hover:underline">
            ← Quay lại đăng ký thường
          </button>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

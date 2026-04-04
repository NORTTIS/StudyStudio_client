/**
 * API Route: /api/auth/refresh
 * Server Component calls this to refresh tokens.
 * Returns new tokens and sets them as HTTP-only cookies (accessible via cookies() in server components).
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { status: "error", code: "AUTH001", message: "Không tìm thấy refresh token", data: null },
            { status: 401 }
        );
    }

    try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const response = await fetch(`${apiBase}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (data.status !== "success" || !data.data) {
            // Clear cookies on refresh failure
            const cleared = NextResponse.json(
                { status: "error", code: "AUTH001", message: "Refresh token không hợp lệ", data: null },
                { status: 401 }
            );
            cleared.cookies.delete("accessToken");
            cleared.cookies.delete("refreshToken");
            return cleared;
        }

        const { accessToken, refreshToken: newRefreshToken, accessExpireIn, refreshExpireIn } = data.data;

        // Set new tokens as cookies accessible in server components
        const accessExpiryDate = new Date(Date.now() + accessExpireIn);
        const refreshExpiryDate = new Date(Date.now() + refreshExpireIn);

        const success = NextResponse.json({
            status: "success",
            code: "AUTH000",
            message: "Token refreshed thành công",
            data: { accessToken, refreshToken: newRefreshToken }
        });

        success.cookies.set("accessToken", accessToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: accessExpiryDate
        });
        success.cookies.set("refreshToken", newRefreshToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: refreshExpiryDate
        });

        return success;
    } catch {
        return NextResponse.json(
            { status: "error", code: "NETWORK_ERROR", message: "Không thể kết nối tới server", data: null },
            { status: 500 }
        );
    }
}

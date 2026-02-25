"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

type AnyObj = Record<string, any>;
type Status = "idle" | "submitting" | "accepted" | "already" | "need_login" | "error";

function normalizeToken(t: string | string[] | undefined) {
    if (!t) return "";
    const raw = Array.isArray(t) ? t[0] : t;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function normalizeBaseUrl(url?: string) {
    if (!url) return "";
    return url.replace(/\/+$/, "");
}

async function readBody(res: Response): Promise<{ json?: AnyObj; text?: string }> {
    const ct = res.headers.get("content-type") || "";
    try {
        if (ct.includes("application/json")) {
            const json = (await res.json()) as AnyObj;
            return { json };
        }
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            return { json, text };
        } catch {
            return { text };
        }
    } catch {
        return {};
    }
}

function getAccessToken(): string {
    if (typeof window === "undefined") return "";
    const keys = ["accessToken", "access_token", "token", "jwt", "ss_access_token"];
    for (const k of keys) {
        const v = window.localStorage.getItem(k) || window.sessionStorage.getItem(k);
        if (v && v.trim()) return v.trim();
    }
    return "";
}

function isAlreadyMemberMessage(msg: string) {
    const m = (msg || "").toLowerCase();
    return (
        m.includes("already") ||
        m.includes("exists") ||
        m.includes("duplicate") ||
        m.includes("đã là") ||
        m.includes("da la") ||
        m.includes("đã tham gia") ||
        m.includes("da tham gia") ||
        m.includes("already member") ||
        m.includes("already joined")
    );
}

async function requestWithAutoMethod(url: string, payload?: AnyObj) {
    const accessToken = getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: payload ? JSON.stringify(payload) : undefined
    });

    if (res.status === 405) {
        res = await fetch(url, {
            method: "PUT",
            credentials: "include",
            headers,
            body: payload ? JSON.stringify(payload) : undefined
        });
    }

    return res;
}

export function InviteAcceptPage() {
    const params = useParams<{ token?: string | string[] }>();
    const token = normalizeToken(params?.token);

    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState("");
    const [groupId, setGroupId] = useState("");
    const [loginUrl, setLoginUrl] = useState("");

    const [hydrated, setHydrated] = useState(false);
    const [hasAuth, setHasAuth] = useState(false);

    const autoRanRef = useRef(false);
    const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

    const buildLoginUrl = () => {
        const returnUrl = encodeURIComponent(pathname || `/${locale}/invite/${encodeURIComponent(token)}`);
        return `/${locale}/login?returnUrl=${returnUrl}&fromLogin=1`;
    };

    const goLogin = () => router.push(loginUrl || buildLoginUrl());
    const onBackHome = () => router.push(`/${locale}/home`);

    useEffect(() => {
        setHydrated(true);
        setHasAuth(!!getAccessToken());
    }, []);

    useEffect(() => {
        autoRanRef.current = false;
        setStatus("idle");
        setError("");
        setGroupId("");
        setLoginUrl(buildLoginUrl());
    }, [token]);

    useEffect(() => {
        if (!hydrated) return;
        const cameFromLogin = searchParams?.get("fromLogin") === "1";
        if (!cameFromLogin) return;

        const nowAuth = !!getAccessToken();
        setHasAuth(nowAuth);

        if (nowAuth) {
            setStatus("idle");
            setError("");
        }
    }, [hydrated, searchParams]);

    const acceptInvite = async () => {
        try {
            setError("");

            if (!token) {
                setStatus("error");
                setError("Missing invitation token.");
                return;
            }

            if (!base) {
                setStatus("error");
                setError("Missing NEXT_PUBLIC_API_BASE_URL env.");
                return;
            }

            setStatus("submitting");

            const attempts: { url: string; payload?: AnyObj }[] = [
                { url: `${base}/invite/accept`, payload: { token } },
                { url: `${base}/invite/accept`, payload: { invitationToken: token } },
                { url: `${base}/invite/accept`, payload: { inviteToken: token } },

                { url: `${base}/group/invite/accept`, payload: { token } },
                { url: `${base}/group/invite/accept`, payload: { invitationToken: token } },

                { url: `${base}/invite/accept?token=${encodeURIComponent(token)}` },
                { url: `${base}/group/invite/accept?token=${encodeURIComponent(token)}` }
            ];

            let last404 = "";

            for (const a of attempts) {
                const url = a.url;

                const res = await requestWithAutoMethod(url, a.payload);

                if (res.status === 404) {
                    last404 = url;
                    continue;
                }

                if (res.status === 401) {
                    setLoginUrl(buildLoginUrl());
                    setStatus("need_login");
                    return;
                }

                const body = await readBody(res);

                if (!res.ok) {
                    const msg =
                        body.json?.message ||
                        body.json?.error ||
                        body.text?.trim() ||
                        `Accept invitation failed (HTTP ${res.status}).`;

                    if (isAlreadyMemberMessage(msg)) {
                        setStatus("already");
                        return;
                    }

                    if (res.status === 400) continue;

                    setStatus("error");
                    setError(`${msg} (at ${url})`);
                    return;
                }

                const gid = body.json?.data?.groupId || body.json?.groupId || body.json?.data?.id || "";

                setGroupId(gid);
                setStatus("accepted");

                if (gid) {
                    router.replace(`/${locale}/group?id=${gid}`);
                } else {
                    router.replace(`/${locale}/group`);
                }
                return;
            }

            setStatus("error");
            setError(
                `Accept invitation failed. Endpoint not found (last 404: ${last404 || "(none)"}), or request body fields mismatch.`
            );
        } catch (e: any) {
            setStatus("error");
            setError(e?.message || "Accept invitation failed.");
        }
    };

    useEffect(() => {
        if (!hydrated) return;
        if (!token) return;
        autoRanRef.current = false;
    }, [hydrated, token, hasAuth, searchParams]);

    if (!hydrated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl text-center">
                    <Logo />
                    <h1 className="mb-2 text-2xl font-bold">Invitation</h1>
                    <p className="mb-6 text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        );
    }

    const canAccept = status === "idle" && hasAuth;
    const needLogin = status === "need_login" || !hasAuth;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl text-center">
                <Logo />

                {status === "accepted" ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">Bạn đã tham gia nhóm thành công</h1>
                        <p className="mb-6 text-sm text-muted-foreground">Đang chuyển hướng...</p>
                    </>
                ) : status === "already" ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">Thông báo</h1>
                        <p className="mb-6 text-sm text-muted-foreground">Bạn đã là thành viên của nhóm này rồi.</p>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={() => router.push(`/${locale}/group`)}>
                                Đi tới Groups
                            </Button>
                            <Button variant="outline" className="w-full" onClick={onBackHome}>
                                Về trang chủ
                            </Button>
                        </div>
                    </>
                ) : status === "submitting" ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">Invitation</h1>
                        <p className="mb-6 text-sm text-muted-foreground">Đang kiểm tra lời mời...</p>
                    </>
                ) : needLogin ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">Bạn chưa đăng nhập</h1>
                        <p className="mb-6 text-sm text-muted-foreground">
                            Vui lòng đăng nhập để chấp nhận lời mời vào nhóm.
                        </p>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={goLogin}>
                                Đăng nhập để tiếp tục
                            </Button>
                            <Button variant="outline" className="w-full" onClick={onBackHome}>
                                Về trang chủ
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">Invitation</h1>
                        <p className="mb-6 text-sm text-muted-foreground">Nhấn “Chấp nhận gia nhập” để tham gia nhóm.</p>

                        {status === "error" && error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

                        <div className="space-y-3">
                            <Button className="w-full" onClick={acceptInvite} disabled={!canAccept}>
                                Chấp nhận gia nhập
                            </Button>

                            <Button variant="outline" className="w-full" onClick={onBackHome}>
                                Về trang chủ
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Logo() {
    return (
        <div className="mb-6 flex items-center justify-center gap-3">
            <svg width="48" height="48" viewBox="0 0 64 64">
                <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
            </svg>
            <span className="font-bold text-3xl text-orange-500 leading-tight">
                Study <br /> Studio
            </span>
        </div>
    );
}
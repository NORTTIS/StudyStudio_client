"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { acceptStudioInvite } from "@/api/studio-invites";
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

function getAccessToken(): string {
    if (typeof window === "undefined") return "";
    const keys = ["accessToken", "access_token", "token", "jwt", "ss_access_token"];
    for (const k of keys) {
        const v = window.localStorage.getItem(k) || window.sessionStorage.getItem(k);
        if (v?.trim()) return v.trim();
    }
    return "";
}

export function StudioInviteAcceptPage() {
    const params = useParams<{ token?: string | string[] }>();
    const token = normalizeToken(params?.token);

    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const t = useTranslations("StudioInviteAccept");

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState("");
    const [studioId, setStudioId] = useState("");
    const [loginUrl, setLoginUrl] = useState("");

    const [hydrated, setHydrated] = useState(false);
    const [hasAuth, setHasAuth] = useState(false);

    const autoRanRef = useRef(false);
    const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

    const buildLoginUrl = () => {
        const returnUrl = encodeURIComponent(pathname || `/${locale}/studio-invite/${encodeURIComponent(token)}`);
        return `/${locale}/login?redirect=${returnUrl}&fromLogin=1`;
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
        setStudioId("");
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

    const handleAcceptInvite = async () => {
        try {
            setError("");

            if (!token) {
                setStatus("error");
                setError(t("errorMissingToken"));
                return;
            }

            setStatus("submitting");

            const response = await acceptStudioInvite({ token }, locale);

            // Check if API returned error status
            if (response.status === "error") {
                const errorCode = response.code?.toLowerCase() || "";
                const errorMessage = response.message || "";

                // Already member
                if (
                    errorCode === "already_member" ||
                    errorCode === "already_exists" ||
                    errorCode === "already_joined" ||
                    errorMessage.toLowerCase().includes("already") ||
                    errorMessage.toLowerCase().includes("exists") ||
                    errorMessage.toLowerCase().includes("đã là") ||
                    errorMessage.toLowerCase().includes("đã tham gia") ||
                    errorMessage.toLowerCase().includes("da la") ||
                    errorMessage.toLowerCase().includes("da tham gia")
                ) {
                    setStatus("already");
                    return;
                }

                // Invalid/expired token
                if (
                    errorCode === "not_found" ||
                    errorCode === "invalid_token" ||
                    errorCode === "token_expired" ||
                    errorCode === "expired" ||
                    errorCode === "invalid" ||
                    errorMessage.toLowerCase().includes("invalid") ||
                    errorMessage.toLowerCase().includes("expired") ||
                    errorMessage.toLowerCase().includes("hết hạn") ||
                    errorMessage.toLowerCase().includes("không hợp lệ")
                ) {
                    setStatus("error");
                    setError(t("errorInvalidToken"));
                    return;
                }

                // Unauthorized
                if (errorCode === "unauthorized" || errorCode === "auth_required") {
                    setLoginUrl(buildLoginUrl());
                    setStatus("need_login");
                    return;
                }

                // Generic error
                setStatus("error");
                setError(errorMessage || t("errorAcceptFailed"));
                return;
            }

            const sid = response.data?.studioId || "";

            setStudioId(sid);
            setStatus("accepted");

            if (sid) {
                router.replace(`/${locale}/master/${sid}`);
            } else {
                router.replace(`/${locale}/master`);
            }
        } catch (e: any) {
            const errorMessage = e?.message || t("errorAcceptFailed");

            if (
                errorMessage.toLowerCase().includes("already") ||
                errorMessage.toLowerCase().includes("exists") ||
                errorMessage.toLowerCase().includes("đã là") ||
                errorMessage.toLowerCase().includes("đã tham gia") ||
                errorMessage.toLowerCase().includes("da la") ||
                errorMessage.toLowerCase().includes("da tham gia")
            ) {
                setStatus("already");
                return;
            }

            setStatus("error");
            setError(errorMessage);
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
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                    <Logo />
                    <h1 className="mb-2 font-bold text-2xl">{t("title")}</h1>
                    <p className="mb-6 text-muted-foreground text-sm">{t("checking")}</p>
                </div>
            </div>
        );
    }

    const canAccept = status === "idle" && hasAuth;
    const needLogin = status === "need_login" || !hasAuth;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                <Logo />

                {status === "accepted" ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("success")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("redirecting")}</p>
                    </>
                ) : status === "already" ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("alreadyMemberTitle")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("alreadyMember")}</p>

                        <div className="space-y-3">
                            <Button
                                className="w-full"
                                onClick={() => router.push(`/${locale}/master/${studioId || ""}`)}>
                                {t("goToStudio")}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={onBackHome}>
                                {t("backHome")}
                            </Button>
                        </div>
                    </>
                ) : status === "submitting" ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("title")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("checking")}</p>
                    </>
                ) : needLogin ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("notLoggedIn")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("loginRequired")}</p>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={goLogin}>
                                {t("loginButton")}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={onBackHome}>
                                {t("backHome")}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("title")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("acceptPrompt")}</p>

                        {status === "error" && error ? <p className="mb-4 text-red-600 text-sm">{error}</p> : null}

                        <div className="space-y-3">
                            <Button className="w-full" onClick={handleAcceptInvite} disabled={!canAccept}>
                                {t("acceptButton")}
                            </Button>

                            <Button variant="outline" className="w-full" onClick={onBackHome}>
                                {t("backHome")}
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

"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { acceptStudioInvite } from "@/api/studio-invites";
import { getStudios, leaveStudio } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { sanitizeErrorMessage } from "@/utils/error-message";
import { getPendingStudioJoinRequests, removePendingStudioJoinRequest } from "@/utils/studio-pending";

type Status = "idle" | "submitting" | "accepted" | "already" | "pending" | "rejected" | "need_login" | "error";

function normalizeToken(t: string | string[] | undefined) {
    if (!t) return "";
    const raw = Array.isArray(t) ? t[0] : t;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

    if (typeof window !== "undefined" && typeof window.atob === "function") {
        return window.atob(padded);
    }

    return "";
}

function getStudioIdFromToken(token: string) {
    if (!token) return "";

    const parts = token.split(".");
    if (parts.length < 2) return "";

    try {
        const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
        const candidateKeys = ["studioId", "studio_id", "masterId", "master_id"];

        for (const key of candidateKeys) {
            const value = payload[key];
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }
    } catch {
        return "";
    }

    return "";
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

function isAlreadyInStudioMessage(msg: string) {
    const m = (msg || "").toLowerCase();
    return (
        m.includes("studio002") ||
        m.includes("in studio") ||
        m.includes("in this studio") ||
        m.includes("already_in_studio") ||
        m.includes("already_studio_member") ||
        m.includes("already_joined_studio") ||
        m.includes("already in studio") ||
        m.includes("studio member already exists") ||
        m.includes("trong studio") ||
        m.includes("da o trong studio") ||
        m.includes("da tham gia studio") ||
        m.includes("da o studio")
    );
}

function isPendingApprovalAccessDenied(code: string, message: string) {
    const normalizedCode = String(code || "").trim().toLowerCase();
    const normalizedMessage = String(message || "").trim().toLowerCase();

    return (
        normalizedCode === "auth003"
        || normalizedCode === "forbidden"
        || normalizedMessage.includes("không có quyền truy cập")
        || normalizedMessage.includes("khong co quyen truy cap")
        || normalizedMessage.includes("access denied")
        || normalizedMessage.includes("forbidden")
    );
}

function isPendingStudioMessage(code: string, message: string) {
    const normalizedCode = String(code || "").trim().toLowerCase();
    const normalizedMessage = String(message || "").trim().toLowerCase();

    return (
        normalizedCode === "pending"
        || normalizedCode === "already_pending"
        || normalizedCode === "request_pending"
        || normalizedCode === "join_request_pending"
        || normalizedMessage.includes("pending")
        || normalizedMessage.includes("awaiting approval")
        || normalizedMessage.includes("request is pending")
        || normalizedMessage.includes("already pending")
        || normalizedMessage.includes("chờ duyệt")
        || normalizedMessage.includes("cho duyet")
        || normalizedMessage.includes("đang chờ")
        || normalizedMessage.includes("dang cho")
    );
}

function isRejectedMessage(code: string, message: string) {
    const normalizedCode = String(code || "").trim().toLowerCase();
    const normalizedMessage = String(message || "").trim().toLowerCase();

    return (
        normalizedCode === "studio_rejected"
        || normalizedCode === "join_request_rejected"
        || normalizedCode === "request_rejected"
        || normalizedMessage.includes("đã bị từ chối")
        || normalizedMessage.includes("da bi tu choi")
        || normalizedMessage.includes("request rejected")
        || normalizedMessage.includes("join request rejected")
        || normalizedMessage.includes("membership rejected")
    );
}

function normalizeStudioInviteErrorMessage(message: string, locale: string) {
    const cleaned = sanitizeErrorMessage(message, locale === "vi" ? "Đã xảy ra lỗi" : "An error occurred");
    const lowered = cleaned.toLowerCase();

    const isArchivedStudioError =
        lowered.includes("lưu trữ")
        || lowered.includes("luu tru")
        || lowered.includes("archived")
        || lowered.includes("inactive");

    if (isArchivedStudioError) {
        return locale === "vi" ? "Studio này đã được lưu trữ" : "This studio has been archived";
    }

    return cleaned;
}

export function StudioInviteAcceptPage() {
    const params = useParams<{ token?: string | string[] }>();
    const token = normalizeToken(params?.token);
    const studioIdFromToken = getStudioIdFromToken(token);

    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const t = useTranslations("StudioInviteAccept");

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState("");
    const [studioId, setStudioId] = useState("");
    const [loginUrl, setLoginUrl] = useState("");
    const [cancelingRequest, setCancelingRequest] = useState(false);

    const [hydrated, setHydrated] = useState(false);
    const [hasAuth, setHasAuth] = useState(false);

    const buildLoginUrl = () => {
        const returnUrl = encodeURIComponent(pathname || `/${locale}/studio-invite/${encodeURIComponent(token)}`);
        return `/${locale}/login?redirect=${returnUrl}&fromLogin=1`;
    };

    const goLogin = () => router.push(loginUrl || buildLoginUrl());
    const onBackHome = () => router.push(`/${locale}/master`);
    const goToStudio = () =>
        router.push(studioId ? `/${locale}/master/${studioId}` : studioIdFromToken ? `/${locale}/master/${studioIdFromToken}` : `/${locale}/master`);

    useEffect(() => {
        setHydrated(true);
        setHasAuth(!!getAccessToken());
    }, []);

    useEffect(() => {
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

    const syncMembershipStatus = useCallback(async (): Promise<"accepted" | "pending" | "rejected" | "none"> => {
        const targetStudioId = String(studioId || studioIdFromToken || "").trim();
        if (!targetStudioId) return "none";

        const localPendingRequest = getPendingStudioJoinRequests().find(
            (item) => String(item.studioId || "").trim() === targetStudioId
        );
        const hasLocalPendingRequest = !!localPendingRequest;

        try {
            const result = await getStudios(locale);
            if (result.status !== "success" || !result.data) return "none";

            const currentStudio = result.data.studios.find(
                (item: {
                    id: string;
                    studioRole?: 0 | 1;
                    isMember?: boolean | null;
                    isPendingApproval?: boolean | null;
                    isApproved?: boolean | null;
                }) =>
                    String(item.id || "").trim() === targetStudioId
            );
            if (!currentStudio) {
                if (status === "pending" || hasLocalPendingRequest) {
                    setStudioId(targetStudioId);
                    setStatus("pending");
                    return "pending";
                }

                return "none";
            }

            const isApprovedMember = currentStudio.studioRole === 1 && currentStudio.isMember === true;
            if (isApprovedMember) {
                removePendingStudioJoinRequest(targetStudioId);
                setStudioId(targetStudioId);
                setStatus("accepted");
                router.replace(`/${locale}/master/${targetStudioId}`);
                return "accepted";
            }

            const stillPending =
                currentStudio.studioRole === 1
                && currentStudio.isMember !== true
                && (currentStudio.isPendingApproval === true || currentStudio.isApproved === false);

            if (stillPending) {
                setStudioId(targetStudioId);
                setStatus("pending");
                return "pending";
            }

            if (status === "pending" || hasLocalPendingRequest) {
                setStudioId(targetStudioId);
                setStatus("pending");
                return "pending";
            }

            return "none";
        } catch {
            return "none";
        }
    }, [locale, router, status, studioId, studioIdFromToken]);

    const handleAcceptInvite = useCallback(async () => {
        try {
            setError("");

            if (!token) {
                setStatus("error");
                setError(t("errorMissingToken"));
                return;
            }

            const membershipStatus = await syncMembershipStatus();
            if (membershipStatus === "accepted" || membershipStatus === "pending" || membershipStatus === "rejected") {
                return;
            }

            setStatus("submitting");

            const response = await acceptStudioInvite({ token }, locale);
            const sid = String(response.data?.studioId || studioIdFromToken || "").trim();
            const normalizedErrorCode = String(response.code || "").toLowerCase();
            const normalizedMessage = String(response.message || "");
            const alreadyStudioSignal = `${normalizedErrorCode} ${normalizedMessage}`;

            if (response.status === "error") {
                if (isAlreadyInStudioMessage(alreadyStudioSignal)) {
                    setStudioId(sid);
                    setStatus("already");
                    return;
                }

                if (sid && isRejectedMessage(normalizedErrorCode, normalizedMessage)) {
                    removePendingStudioJoinRequest(sid);
                    setStudioId(sid);
                    setStatus("rejected");
                    return;
                }

                if (sid && isPendingApprovalAccessDenied(normalizedErrorCode, normalizedMessage)) {
                    setStudioId(sid);
                    setStatus("pending");
                    return;
                }

                if (sid && isPendingStudioMessage(normalizedErrorCode, normalizedMessage)) {
                    setStudioId(sid);
                    setStatus("pending");
                    return;
                }

                if (
                    normalizedErrorCode === "not_found" ||
                    normalizedErrorCode === "invalid_token" ||
                    normalizedErrorCode === "token_expired" ||
                    normalizedErrorCode === "expired" ||
                    normalizedErrorCode === "invalid" ||
                    normalizedMessage.toLowerCase().includes("invalid") ||
                    normalizedMessage.toLowerCase().includes("expired") ||
                    normalizedMessage.toLowerCase().includes("het han") ||
                    normalizedMessage.toLowerCase().includes("khong hop le")
                ) {
                    setStatus("error");
                    setError(t("errorInvalidToken"));
                    return;
                }

                if (normalizedErrorCode === "unauthorized" || normalizedErrorCode === "auth_required") {
                    setLoginUrl(buildLoginUrl());
                    setStatus("need_login");
                    return;
                }

                setStatus("error");
                setError(normalizeStudioInviteErrorMessage(normalizedMessage || t("errorAcceptFailed"), locale));
                return;
            }

            if (isAlreadyInStudioMessage(alreadyStudioSignal)) {
                setStudioId(sid);
                if (sid) {
                    removePendingStudioJoinRequest(sid);
                }
                setStatus("already");
                return;
            }

            if (response.data?.isApproved === false) {
                setStudioId(sid);
                setStatus("pending");
                return;
            }

            if (sid) {
                removePendingStudioJoinRequest(sid);
            }

            setStudioId(sid);
            setStatus("accepted");

            if (sid) {
                router.replace(`/${locale}/master/${sid}`);
            } else {
                router.replace(`/${locale}/master`);
            }
        } catch (e: any) {
            const errorMessage = String(e?.message || t("errorAcceptFailed"));

            if (isAlreadyInStudioMessage(errorMessage)) {
                setStudioId(studioIdFromToken);
                if (studioIdFromToken) {
                    removePendingStudioJoinRequest(studioIdFromToken);
                }
                setStatus("already");
                return;
            }

            setStatus("error");
            setError(normalizeStudioInviteErrorMessage(errorMessage, locale));
        }
    }, [locale, router, studioIdFromToken, syncMembershipStatus, t, token]);

    const handleCancelRequest = useCallback(async () => {
        const targetStudioId = String(studioId || studioIdFromToken || "").trim();
        if (!targetStudioId) {
            setError(t("errorAcceptFailed"));
            setStatus("error");
            return;
        }

        setCancelingRequest(true);
        setError("");

        try {
            const membershipStatus = await syncMembershipStatus();
            if (membershipStatus === "accepted") {
                const targetStudioId = String(studioId || studioIdFromToken || "").trim();
                const alreadyMemberMessage =
                    locale === "vi"
                        ? "Bạn đã ở trong studio này. Trang sẽ được tải lại."
                        : "You are already in this studio. The page will reload.";

                if (typeof window !== "undefined") {
                    window.alert(alreadyMemberMessage);
                }

                setStatus("already");

                if (targetStudioId) {
                    router.replace(`/${locale}/master/${targetStudioId}`);
                } else {
                    router.replace(`/${locale}/master`);
                }

                router.refresh();
                return;
            }

            if (membershipStatus === "rejected") {
                return;
            }

            const result = await leaveStudio(targetStudioId, locale);

            if (result.status !== "success") {
                setError(result.message || t("cancelRequestFailed"));
                setStatus("pending");
                return;
            }

            removePendingStudioJoinRequest(targetStudioId);
            router.replace(`/${locale}/master`);
        } catch {
            setError(t("cancelRequestFailed"));
            setStatus("pending");
        } finally {
            setCancelingRequest(false);
        }
    }, [locale, router, studioId, studioIdFromToken, syncMembershipStatus, t]);

    useEffect(() => {
        if (status !== "pending") return;

        const checkStatus = () => {
            if (document.visibilityState !== "visible") return;
            void syncMembershipStatus();
        };

        const intervalId = window.setInterval(checkStatus, 15000);
        const handleFocus = () => {
            checkStatus();
        };
        const handleVisibilityChange = () => {
            checkStatus();
        };

        checkStatus();
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [status, syncMembershipStatus]);

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
                        <p className="mb-6 text-muted-foreground text-sm">{t("redirectingToStudio")}</p>
                    </>
                ) : status === "rejected" ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">
                            {locale === "vi" ? "Yêu cầu đã bị từ chối" : "Request rejected"}
                        </h1>
                        <p className="mb-6 text-muted-foreground text-sm">
                            {locale === "vi"
                                ? "Chủ studio đã từ chối yêu cầu tham gia studio này."
                                : "The owner rejected your request to join this studio."}
                        </p>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={onBackHome}>
                                {t("backToStudios")}
                            </Button>
                        </div>
                    </>
                ) : status === "pending" ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("pendingTitle")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("pendingMessage")}</p>

                        {error ? <p className="mb-4 text-red-600 text-sm">{error}</p> : null}

                        <div className="space-y-3">
                            <Button className="w-full" onClick={onBackHome}>
                                {t("backToStudios")}
                            </Button>

                            <Button
                                className="w-full bg-orange-600 text-white hover:bg-orange-700"
                                onClick={handleCancelRequest}
                                disabled={cancelingRequest}>
                                {cancelingRequest ? t("cancelingRequest") : t("cancelRequest")}
                            </Button>
                        </div>
                    </>
                ) : status === "already" ? (
                    <>
                        <h1 className="mb-2 font-bold text-2xl">{t("alreadyMemberTitle")}</h1>
                        <p className="mb-6 text-muted-foreground text-sm">{t("alreadyMember")}</p>

                        <div className="space-y-3">
                            <Button className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={goToStudio}>
                                {t("goToStudio")}
                            </Button>
                            <Button className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={onBackHome}>
                                {t("backToStudios")}
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
                            <Button className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={onBackHome}>
                                {t("backToStudios")}
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

                            <Button className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={onBackHome}>
                                {t("backToStudios")}
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

"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { getStudios } from "@/api/studios";
import { Button } from "@/components/ui/button";
import { markPendingJoinRequestCanceled, removePendingJoinGroup, savePendingJoinGroup } from "@/components/features/group/group.api";
import { cancelPendingJoinRequest } from "@/api/invites";

type AnyObj = Record<string, any>;
type Status = "idle" | "submitting" | "accepted" | "pending" | "already" | "need_login" | "error";

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

function getGroupIdFromToken(token: string) {
    if (!token) return "";

    const parts = token.split(".");
    if (parts.length < 2) return "";

    try {
        const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
        const candidateKeys = ["groupId", "group_id"];

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
        if (v?.trim()) return v.trim();
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

function isPendingApprovalMessage(msg: string) {
    const m = (msg || "").toLowerCase();
    return (
        m.includes("pending") ||
        m.includes("await") ||
        m.includes("approval") ||
        m.includes("chờ") ||
        m.includes("duyệt")
    );
}

function toBooleanLike(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") return true;
        if (normalized === "false" || normalized === "0") return false;
    }
    return null;
}

function isPendingStatusValue(value: unknown) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (!normalized) return false;

    return [
        "pending",
        "awaiting",
        "awaiting_approval",
        "awaiting-approval",
        "waiting",
        "waiting_approval",
        "requested"
    ].includes(normalized);
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

async function getGroupInviteContext(base: string, groupId: string): Promise<{ requiresApproval: boolean | null; studioId: string }> {
    const normalizedGroupId = String(groupId || "").trim();
    if (!normalizedGroupId) return { requiresApproval: null, studioId: "" };

    const accessToken = getAccessToken();
    if (!accessToken) return { requiresApproval: null, studioId: "" };

    const detailUrl = base
        ? `${base}/group/${encodeURIComponent(normalizedGroupId)}/detail`
        : `/group/${encodeURIComponent(normalizedGroupId)}/detail`;

    try {
        const res = await fetch(detailUrl, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            cache: "no-store"
        });

        if (!res.ok) return { requiresApproval: null, studioId: "" };

        const body = await readBody(res);
        const data = (body.json?.data ?? body.json ?? {}) as AnyObj;
        const flag = data.requiresMemberApproval ?? data.memberApprovalRequired;
        const studioId = String(data.studioId ?? "").trim();
        return {
            requiresApproval: typeof flag === "boolean" ? flag : null,
            studioId
        };
    } catch {
        return { requiresApproval: null, studioId: "" };
    }
}

async function isCurrentUserStudioMember(studioId: string, locale: string): Promise<boolean> {
    const normalizedStudioId = String(studioId || "").trim();
    if (!normalizedStudioId) return false;

    try {
        const result = await getStudios(locale);
        if (result.status !== "success" || !result.data) return false;

        const studio = result.data.studios.find(
            (item: { id: string; studioRole?: 0 | 1; isMember?: boolean | null }) =>
                String(item.id || "").trim() === normalizedStudioId
        );
        if (!studio) return false;

        return studio.studioRole === 0 || studio.isMember === true;
    } catch {
        return false;
    }
}

export function InviteAcceptPage() {
    const t = useTranslations("GroupStudioHeader.inviteAcceptPage");
    const params = useParams<{ token?: string | string[] }>();
    const token = normalizeToken(params?.token);
    const groupIdFromToken = getGroupIdFromToken(token);

    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const pendingApprovalHintFromLink = searchParams?.get("pa") === "1" || searchParams?.get("pendingApproval") === "1";

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState("");
    const [groupId, setGroupId] = useState("");
    const [loginUrl, setLoginUrl] = useState("");

    const [hydrated, setHydrated] = useState(false);
    const [hasAuth, setHasAuth] = useState(false);

    const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

    const buildLoginUrl = () => {
        const returnUrl = encodeURIComponent(pathname || `/${locale}/invite/${encodeURIComponent(token)}`);
        return `/${locale}/login?redirect=${returnUrl}&fromLogin=1`;
    };

    const goLogin = () => router.push(loginUrl || buildLoginUrl());
    const onBackHome = () => router.push(`/${locale}/group`);
    const goToGroup = () =>
        router.push(groupId ? `/${locale}/group/${groupId}` : groupIdFromToken ? `/${locale}/group/${groupIdFromToken}` : `/${locale}/group`);

    const handleCancelRequest = useCallback(async () => {
        const targetGroupId = groupId || groupIdFromToken;
        if (!targetGroupId) {
            router.replace(`/${locale}/group`);
            return;
        }

        try {
            await cancelPendingJoinRequest(targetGroupId, locale);
            markPendingJoinRequestCanceled(targetGroupId);
            removePendingJoinGroup(targetGroupId);
        } catch (error) {
            console.error("[InviteAcceptPage] Failed to cancel pending request:", error);
        } finally {
            router.replace(`/${locale}/group`);
        }
    }, [groupId, groupIdFromToken, locale, router]);

    useEffect(() => {
        setHydrated(true);
        setHasAuth(!!getAccessToken());
    }, []);

    useEffect(() => {
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

    const acceptInvite = useCallback(async () => {
        try {
            setError("");

            if (!token) {
                setStatus("error");
                setError(t("missingToken"));
                return;
            }

            setStatus("submitting");

            const attempts: { url: string; payload?: AnyObj }[] = [
                { url: `${base}/group/invite/accept`, payload: { token } },
                { url: `${base}/group/invite/accept`, payload: { invitationToken: token } },
                { url: `${base}/group/invite/accept`, payload: { inviteToken: token } },

                { url: `${base}/invite/accept`, payload: { token } },
                { url: `${base}/invite/accept`, payload: { invitationToken: token } },
                { url: `${base}/invite/accept`, payload: { inviteToken: token } },

                { url: `${base}/group/invite/accept?token=${encodeURIComponent(token)}` },
                { url: `${base}/invite/accept?token=${encodeURIComponent(token)}` }
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
                        const existingGroupId = String(body.json?.data?.groupId || body.json?.groupId || groupIdFromToken || "").trim();
                        if (existingGroupId) setGroupId(existingGroupId);
                        setStatus("already");
                        return;
                    }

                    if (res.status === 400) {
                        if (isPendingApprovalMessage(msg)) {
                            const pendingGroupId = String(body.json?.data?.groupId || body.json?.groupId || groupIdFromToken || "").trim();
                            if (pendingGroupId) setGroupId(pendingGroupId);
                            setStatus("pending");
                            return;
                        }

                        setStatus("error");
                        setError(msg);
                        return;
                    }

                    setStatus("error");
                    setError(`${msg} (at ${url})`);
                    return;
                }

                const responseData = (body.json?.data ?? body.json ?? {}) as AnyObj;
                const gid = String(responseData.groupId || responseData.id || "").trim();

                const inviteContext = gid ? await getGroupInviteContext(base, gid) : { requiresApproval: null, studioId: "" };
                const serverRequiresApproval = inviteContext.requiresApproval;
                const responseRequiresApproval = toBooleanLike(
                    responseData.requiresMemberApproval ?? responseData.memberApprovalRequired
                );
                const isApprovedRaw = toBooleanLike(
                    responseData.isApproved ?? responseData.approved ?? responseData.is_approved ?? responseData.is_approve
                );
                const isPendingRaw = toBooleanLike(responseData.isPending ?? responseData.pendingApproval ?? responseData.pending);
                const pendingStatusRaw = isPendingStatusValue(
                    responseData.membershipStatus ?? responseData.status ?? responseData.joinStatus
                );

                const effectiveRequiresApproval =
                    serverRequiresApproval !== null
                        ? serverRequiresApproval
                        : responseRequiresApproval;
                const bypassApprovalForStudioMember =
                    effectiveRequiresApproval === true
                    && !!inviteContext.studioId
                    && await isCurrentUserStudioMember(inviteContext.studioId, locale);

                const isPendingByApprovalFlag = isApprovedRaw === false;
                const isPendingByResponse = isPendingRaw === true || pendingStatusRaw;
                const isPendingByInviteHint =
                    !bypassApprovalForStudioMember
                    && pendingApprovalHintFromLink
                    && effectiveRequiresApproval === true
                    && isApprovedRaw !== true;

                const isApproved = bypassApprovalForStudioMember || effectiveRequiresApproval === false
                    ? true
                    : !(isPendingByApprovalFlag || isPendingByResponse || isPendingByInviteHint);

                setGroupId(gid);
                setStatus(isApproved ? "accepted" : "pending");

                if (!isApproved) {
                    savePendingJoinGroup({
                        ...responseData,
                        id: gid,
                        groupId: gid,
                        isApproved: false,
                        membershipStatus: "pending",
                        status: "pending"
                    });

                    // Keep the user on this page so the pending state is explicit.
                    return;
                }

                if (gid) {
                    removePendingJoinGroup(gid);
                }

                if (gid) {
                    router.replace(`/${locale}/group/${gid}`);
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
            if (isAlreadyMemberMessage(String(e?.message || ""))) {
                if (groupIdFromToken) setGroupId(groupIdFromToken);
                setStatus("already");
                return;
            }
            setStatus("error");
            setError(e?.message || t("serverError"));
        }
    }, [base, groupIdFromToken, locale, pathname, pendingApprovalHintFromLink, router, t, token]);

    if (!hydrated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
                    <Logo />
                    <h1 className="mb-2 text-2xl font-bold">{t("invitation")}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t("loading")}</p>
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
                        <h1 className="mb-2 text-2xl font-bold">{t("successTitle")}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t("redirecting")}</p>
                    </>
                ) : status === "pending" ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t("pendingTitle")}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t("pendingMessage")}</p>

                        <div className="space-y-3">
                            <Button className={GROUP_PRIMARY_BUTTON_CLASS} onClick={onBackHome}>
                                {t("backHome")}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={handleCancelRequest}
                            >
                                {t("cancelRequest")}
                            </Button>
                        </div>
                    </>
                ) : status === "already" ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t("notice")}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t("alreadyMember")}</p>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={goToGroup}>
                                {t("goToGroups")}
                            </Button>
                            <Button className={GROUP_PRIMARY_BUTTON_CLASS} onClick={onBackHome}>
                                {t("backHome")}
                            </Button>
                        </div>
                    </>
                ) : status === "submitting" ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t("submittingTitle")}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t("checking")}</p>
                    </>
                ) : needLogin ? (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t("notLoggedIn")}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t("loginPrompt")}</p>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={goLogin}>
                                {t("loginToContinue")}
                            </Button>
                            <Button className={GROUP_PRIMARY_BUTTON_CLASS} onClick={onBackHome}>
                                {t("backHome")}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t("invitation")}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t("acceptPrompt")}</p>

                        {status === "error" && error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

                        <div className="space-y-3">
                            <Button className="w-full" onClick={acceptInvite} disabled={!canAccept}>
                                {t("accept")}
                            </Button>

                            <Button className={GROUP_PRIMARY_BUTTON_CLASS} onClick={onBackHome}>
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
            <span className="text-3xl font-bold leading-tight text-orange-500">
                Study <br /> Studio
            </span>
        </div>
    );
}

const GROUP_PRIMARY_BUTTON_CLASS = "w-full bg-orange-600 text-white hover:bg-orange-700";

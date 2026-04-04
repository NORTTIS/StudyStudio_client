// src/app/[locale]/(user)/settings/layout.tsx
"use client";

import {
    ArrowLeftOutlined,
    CreditCardOutlined,
    LockOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
    UserOutlined
} from "@ant-design/icons";
import { ConfigProvider, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Logo } from "@/components/common";

const { Text } = Typography;

const PRIMARY = "#FF5F3D";
const DARK = "#261E33";
const MUTED = "#6F6B99";
const BORDER = "#E5E5E5";
const APP_FONT_FAMILY = "var(--font-app-sans), sans-serif";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("SettingsPage");
    const pathname = usePathname();
    const locale = useLocale();

    const menuItems = [
        {
            key: `/${locale}/settings`,
            icon: <UserOutlined />,
            label: t("menu.profile"),
            description: t("menu.profile")
        },
        {
            key: `/${locale}/settings/security`,
            icon: <LockOutlined />,
            label: t("menu.security"),
            description: t("menu.security")
        },
        {
            key: `/${locale}/settings/billing`,
            icon: <CreditCardOutlined />,
            label: t("menu.billing"),
            description: t("menu.billing")
        },
        {
            key: `/${locale}/settings/help`,
            icon: <QuestionCircleOutlined />,
            label: t("menu.help"),
            description: t("menu.help")
        }
    ];

    // Determine selected key
    const selectedKey = (() => {
        const current = pathname || "";
        if (current === `/${locale}/settings`) return `/${locale}/settings`;
        const match = menuItems.find((m) => m.key !== `/${locale}/settings` && current.startsWith(m.key));
        return match?.key ?? `/${locale}/settings`;
    })();

    const activeItem = menuItems.find((m) => m.key === selectedKey);

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: PRIMARY, fontFamily: APP_FONT_FAMILY, borderRadius: 10 },
                components: {}
            }}>
            <div style={{ display: "flex", minHeight: "100vh", background: "#F5F5F5", fontFamily: APP_FONT_FAMILY }}>
                {/* ─────────── SIDEBAR ─────────── */}
                <aside
                    style={{
                        width: 272,
                        background: "#F8F8F8",
                        borderRight: `1px solid ${BORDER}`,
                        display: "flex",
                        flexDirection: "column",
                        flexShrink: 0,
                        position: "sticky",
                        top: 0,
                        height: "100vh"
                    }}>
                    <div
                        style={{
                            display: "flex",
                            height: "100%",
                            flexDirection: "column",
                            borderRight: "1px solid rgba(255,165,96,0.35)",
                            background: "#FFFFFF",
                            boxShadow: "0 10px 40px rgba(15,23,42,0.04)"
                        }}>
                        {/* Logo */}
                        <div
                            style={{
                                height: 80,
                                display: "flex",
                                alignItems: "center",
                                paddingInline: 20,
                                borderBottom: `1px solid ${BORDER}`,
                                flexShrink: 0
                            }}>
                            <Link href={`/${locale}/home`} style={{ display: "flex", alignItems: "center" }}>
                                <Logo className="m-0" />
                            </Link>
                        </div>

                        {/* Section label */}
                        <div style={{ padding: "20px 20px 8px" }}>
                            <Text
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: "0.09em",
                                    textTransform: "uppercase",
                                    color: "#B0AAC5"
                                }}>
                                {t("sectionLabel")}
                            </Text>
                        </div>

                        {/* Nav */}
                        <div style={{ flex: 1, padding: "0 12px 12px", overflowY: "auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {menuItems.map((item) => {
                                    const isActive = item.key === selectedKey;

                                    return (
                                        <Link
                                            key={item.key}
                                            href={item.key}
                                            className={!isActive ? "hover:bg-orange-50 hover:text-orange-600 hover:shadow-sm" : undefined}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 14,
                                                borderRadius: 16,
                                                padding: "14px 16px",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                textDecoration: "none",
                                                color: isActive ? "#FFFFFF" : undefined,
                                                background: isActive
                                                    ? "linear-gradient(to right, #f97316, #dc2626)"
                                                    : undefined,
                                                boxShadow: isActive
                                                    ? "0 10px 24px rgba(249,115,22,0.28)"
                                                    : undefined,
                                                transition: "all 0.2s ease"
                                            }}>
                                            <span
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 10,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: isActive ? "#FFFFFF" : "#F97316",
                                                    background: isActive ? "rgba(255,255,255,0.16)" : "#FFF7ED",
                                                    fontSize: 16,
                                                    flexShrink: 0
                                                }}>
                                                {item.icon}
                                            </span>
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ─────────── MAIN ─────────── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    {/* Top header bar */}
                    <div
                        style={{
                            height: 64,
                            background: "#fff",
                            borderBottom: `1px solid ${BORDER}`,
                            display: "flex",
                            alignItems: "center",
                            paddingInline: 36,
                            gap: 14,
                            flexShrink: 0,
                            position: "sticky",
                            top: 0,
                            zIndex: 10
                        }}>
                        <Link
                            href={`/${locale}/home`}
                            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-[#6F6B99] shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600"
                            style={{ textDecoration: "none" }}
                            aria-label="Back to dashboard"
                            title="Back to dashboard">
                            <ArrowLeftOutlined style={{ fontSize: 16 }} />
                        </Link>
                        {/* Icon badge */}
                        <div
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: `linear-gradient(135deg, ${PRIMARY} 0%, #FF8C6B 100%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: "0 3px 10px rgba(255,95,61,0.30)"
                            }}>
                            <SettingOutlined style={{ color: "#fff", fontSize: 15 }} />
                        </div>

                        {/* Title + breadcrumb */}
                        <div>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 17,
                                    color: DARK,
                                    lineHeight: 1.2,
                                    letterSpacing: "-0.01em"
                                }}>
                                {t("title")}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                                <Text style={{ color: "#B0AAC5", fontSize: 12 }}>{t("title")}</Text>
                                <Text style={{ color: "#B0AAC5", fontSize: 12 }}>/</Text>
                                <Text style={{ color: MUTED, fontSize: 12, fontWeight: 600 }}>
                                    {activeItem?.description}
                                </Text>
                            </div>
                        </div>

                        {/* Active pill */}
                        <div style={{ marginLeft: "auto" }}>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    background: "#FFF0ED",
                                    color: PRIMARY,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: "5px 14px",
                                    borderRadius: 20,
                                    border: "1.5px solid rgba(255,95,61,0.25)",
                                    letterSpacing: "0.01em"
                                }}>
                                <span
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: PRIMARY,
                                        display: "inline-block",
                                        boxShadow: "0 0 0 2px rgba(255,95,61,0.2)"
                                    }}
                                />
                                {activeItem?.description ?? t("menu.profile")}
                            </span>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>{children}</div>
                </div>
            </div>
        </ConfigProvider>
    );
}

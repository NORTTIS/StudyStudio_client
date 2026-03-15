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
import { ConfigProvider, Menu, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Logo } from "@/components/common";

const { Text } = Typography;

const PRIMARY = "#FF5F3D";
const DARK = "#261E33";
const MUTED = "#6F6B99";
const BORDER = "#E5E5E5";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("SettingsPage");
    const pathname = usePathname();
    const locale = useLocale();

    const menuItems = [
        {
            key: `/${locale}/settings`,
            icon: <UserOutlined />,
            label: <Link href={`/${locale}/settings`}>{t("menu.profile")}</Link>,
            description: t("menu.profile")
        },
        {
            key: `/${locale}/settings/security`,
            icon: <LockOutlined />,
            label: <Link href={`/${locale}/settings/security`}>{t("menu.security")}</Link>,
            description: t("menu.security")
        },
        {
            key: `/${locale}/settings/billing`,
            icon: <CreditCardOutlined />,
            label: <Link href={`/${locale}/settings/billing`}>{t("menu.billing")}</Link>,
            description: t("menu.billing")
        },
        {
            key: `/${locale}/settings/help`,
            icon: <QuestionCircleOutlined />,
            label: <Link href={`/${locale}/settings/help`}>{t("menu.help")}</Link>,
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
                token: { colorPrimary: PRIMARY, fontFamily: "inherit", borderRadius: 10 },
                components: {
                    Menu: {
                        itemSelectedBg: "#FFF0ED",
                        itemSelectedColor: PRIMARY,
                        itemHoverBg: "#F5F5F5",
                        itemHoverColor: DARK,
                        itemColor: MUTED,
                        itemBorderRadius: 10,
                        itemPaddingInline: 14,
                        iconSize: 16,
                        iconMarginInlineEnd: 10
                    }
                }
            }}>
            <div style={{ display: "flex", minHeight: "100vh", background: "#F5F5F5" }}>
                {/* ─────────── SIDEBAR ─────────── */}
                <aside
                    style={{
                        width: 240,
                        background: "#fff",
                        borderRight: `1px solid ${BORDER}`,
                        display: "flex",
                        flexDirection: "column",
                        flexShrink: 0,
                        position: "sticky",
                        top: 0,
                        height: "100vh"
                    }}>
                    {/* Logo */}
                    <div
                        style={{
                            height: 64,
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
                    <div style={{ padding: "20px 20px 6px" }}>
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
                    <div style={{ flex: 1, padding: "4px 12px", overflowY: "auto" }}>
                        <Menu
                            mode="inline"
                            selectedKeys={[selectedKey]}
                            items={menuItems.map(({ key, icon, label }) => ({ key, icon, label }))}
                            inlineIndent={0}
                            style={{ border: "none", background: "transparent", fontSize: 14 }}
                        />
                    </div>

                    {/* Back to Dashboard — prominent button */}
                    <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${BORDER}` }}>
                        <Link
                            href={`/${locale}/home`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "11px 14px",
                                borderRadius: 10,
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: "none",
                                background: `linear-gradient(135deg, ${DARK} 0%, #3a2a5e 100%)`,
                                transition: "opacity 0.15s"
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                            }}>
                            <ArrowLeftOutlined style={{ fontSize: 12 }} />
                            {t("backToDashboard")}
                        </Link>
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
                                <Text style={{ color: "#B0AAC5", fontSize: 12 }}>Cài đặt</Text>
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

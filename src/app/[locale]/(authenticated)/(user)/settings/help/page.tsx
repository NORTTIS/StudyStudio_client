"use client";

import { Button, ConfigProvider, Input, message, Typography } from "antd";
import { usePathname } from "next/navigation";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { components } from "@/api/types";
import { sendReport } from "@/app/[locale]/(authenticated)/(user)/settings/user";

const { TextArea } = Input;
const { Text, Title } = Typography;

// ── Brand tokens ───────────────────────────────────────
const PRIMARY = "#FF5F3D";
const DARK = "#261E33";
const MUTED = "#6F6B99";
const BORDER = "#E5E5E5";
const _BG = "#F8F8F8";

type FeedbackType = "bug" | "feedback" | "support" | "other";
type ReportType = components["schemas"]["ReportType"];

const TYPE_MAP: Record<FeedbackType, ReportType> = {
    bug: 0,
    feedback: 1,
    support: 2,
    other: 3
};

// Accent strip colors per feedback type
const TYPE_COLOR: Record<FeedbackType, string> = {
    bug: "#ff4d4f",
    feedback: "#1677ff",
    support: PRIMARY,
    other: "#722ed1"
};

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export default function HelpPage() {
    const t = useTranslations("HelpPage");
    const locale = useLocale();
    const messages = useMessages() as {
        HelpPage?: {
            faq?: {
                contactCard?: {
                    title?: string;
                    description?: string;
                };
            };
        };
    };
    const pathname = usePathname();
    const [messageApi, contextHolder] = message.useMessage();

    const [expandedFAQ, setExpandedFAQ] = useState<string | null>("1");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [form, setForm] = useState({
        feedbackType: "bug" as FeedbackType,
        email: "",
        title: "",
        content: ""
    });

    useEffect(() => {
        const saved = typeof window !== "undefined" && localStorage.getItem("helpEmail");
        if (saved) setForm((p) => ({ ...p, email: saved }));
    }, []);

    const faqItems: FAQItem[] = [
        { id: "1", question: t("faq.item1.question"), answer: t("faq.item1.answer") },
        { id: "2", question: t("faq.item2.question"), answer: t("faq.item2.answer") },
        { id: "3", question: t("faq.item3.question"), answer: t("faq.item3.answer") },
        { id: "4", question: t("faq.item4.question"), answer: t("faq.item4.answer") }
    ];

    const contactCardTitle =
        messages.HelpPage?.faq?.contactCard?.title ??
        t("faq.contactCard.title");

    const contactCardDescription =
        messages.HelpPage?.faq?.contactCard?.description ??
        t("faq.contactCard.description");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(form.email && form.title && form.content)) {
            messageApi.warning(t("form.validationError"));
            return;
        }
        setIsSubmitting(true);
        try {
            const locale = pathname.split("/")[1] || "vi";
            const response = await sendReport(
                { email: form.email, title: form.title, content: form.content, type: TYPE_MAP[form.feedbackType] },
                locale
            );
            if (response.status === "success") {
                localStorage.setItem("helpEmail", form.email);
                setForm((p) => ({ ...p, title: "", content: "" }));
                setSubmitted(true);
                messageApi.success(response.message || t("form.submitSuccess"));
            } else {
                messageApi.error(response.message);
            }
        } catch {
            messageApi.error(t("form.submitError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const accentColor = TYPE_COLOR[form.feedbackType];

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: PRIMARY, borderRadius: 10, fontFamily: "inherit", colorBorder: BORDER },
                components: {
                    Input: { activeBorderColor: PRIMARY, hoverBorderColor: PRIMARY, paddingBlock: 9 },
                    Select: { optionActiveBg: "#FFF0ED" },
                    Button: { fontWeight: 600 }
                }
            }}>
            {contextHolder}

            <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 60 }}>
                {/* ══════════════════════════════════════════════════════
                    ROW 1 — two-column: Form (left) + FAQ (right)
                ══════════════════════════════════════════════════════ */}
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                    {/* ── LEFT: Contact form ─────────────────── */}
                    <div style={{ flex: "1 1 0", minWidth: 0 }}>
                        {/* Coloured top bar that changes with type */}
                        <div
                            style={{
                                height: 5,
                                borderRadius: "16px 16px 0 0",
                                background: accentColor,
                                transition: "background 0.3s"
                            }}
                        />

                        <div
                            style={{
                                background: "#fff",
                                border: `1px solid ${BORDER}`,
                                borderTop: "none",
                                borderRadius: "0 0 16px 16px",
                                overflow: "hidden"
                            }}>
                            {/* Header */}
                            <div style={{ padding: "24px 28px 0" }}>
                                <Title level={5} style={{ margin: "0 0 4px", color: DARK }}>
                                    {t("form.formTitle")}
                                </Title>
                                <Text style={{ color: MUTED, fontSize: 13 }}>{t("form.subtitle")}</Text>
                            </div>

                            {submitted ? (
                                /* ── Success state ── */
                                <div style={{ padding: "40px 28px", textAlign: "center" }}>
                                    <div
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 14,
                                            background: `linear-gradient(135deg, ${PRIMARY} 0%, #FF8C6B 100%)`,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginBottom: 16
                                        }}>
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M5 13l4 4L19 7"
                                                stroke="#fff"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <Title level={5} style={{ color: DARK, margin: "0 0 8px" }}>
                                        {t("success.title")}
                                    </Title>
                                    <Text style={{ color: MUTED, fontSize: 13 }}>
                                        {t("success.description")}
                                    </Text>
                                    <br />
                                    <Button
                                        type="primary"
                                        style={{
                                            marginTop: 20,
                                            background: PRIMARY,
                                            borderColor: PRIMARY,
                                            borderRadius: 10
                                        }}
                                        onClick={() => setSubmitted(false)}>
                                        {t("success.sendAnother")}
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div
                                        style={{
                                            padding: "20px 28px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 18
                                        }}>
                                        {/* Type selector — pill buttons */}
                                        <div>
                                            <label
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: DARK,
                                                    display: "block",
                                                    marginBottom: 10
                                                }}>
                                                {t("form.feedbackType")}
                                            </label>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {(["bug", "feedback", "support", "other"] as FeedbackType[]).map(
                                                    (type) => {
                                                        const active = form.feedbackType === type;
                                                        const labels: Record<FeedbackType, string> = {
                                                            bug: t("form.feedbackOptions.bug"),
                                                            feedback: t("form.feedbackOptions.feedback"),
                                                            support: t("form.feedbackOptions.support"),
                                                            other: t("form.feedbackOptions.other")
                                                        };
                                                        return (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() =>
                                                                    setForm((p) => ({ ...p, feedbackType: type }))
                                                                }
                                                                style={{
                                                                    padding: "6px 16px",
                                                                    borderRadius: 20,
                                                                    border: `1.5px solid ${active ? TYPE_COLOR[type] : BORDER}`,
                                                                    background: active ? TYPE_COLOR[type] : "#fff",
                                                                    color: active ? "#fff" : MUTED,
                                                                    fontSize: 13,
                                                                    fontWeight: active ? 700 : 500,
                                                                    cursor: "pointer",
                                                                    transition: "all 0.2s"
                                                                }}>
                                                                {labels[type]}
                                                            </button>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: DARK,
                                                    display: "block",
                                                    marginBottom: 6
                                                }}>
                                                {t("form.email")}
                                            </label>
                                            <Input
                                                type="email"
                                                name="email"
                                                value={form.email}
                                                onChange={handleChange}
                                                placeholder={t("form.emailPlaceholder")}
                                                style={{ borderRadius: 10 }}
                                            />
                                        </div>

                                        {/* Title */}
                                        <div>
                                            <label
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: DARK,
                                                    display: "block",
                                                    marginBottom: 6
                                                }}>
                                                {t("form.title")}
                                            </label>
                                            <Input
                                                name="title"
                                                value={form.title}
                                                onChange={handleChange}
                                                placeholder={t("form.titlePlaceholder")}
                                                style={{ borderRadius: 10 }}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    marginBottom: 6
                                                }}>
                                                <label style={{ fontSize: 13, fontWeight: 600, color: DARK }}>
                                                    {t("form.content")}
                                                </label>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: form.content.length > 450 ? "#ff4d4f" : MUTED
                                                    }}>
                                                    {form.content.length}/500
                                                </Text>
                                            </div>
                                            <TextArea
                                                name="content"
                                                value={form.content}
                                                onChange={handleChange}
                                                placeholder={t("form.contentPlaceholder")}
                                                rows={5}
                                                maxLength={500}
                                                style={{ borderRadius: 10, resize: "vertical" }}
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "flex-end",
                                            gap: 10,
                                            borderTop: `1px solid ${BORDER}`,
                                            padding: "16px 28px"
                                        }}>
                                        <Button
                                            style={{ borderRadius: 10, paddingInline: 20 }}
                                            onClick={() => setForm((p) => ({ ...p, title: "", content: "" }))}>
                                            {t("form.cancelButton")}
                                        </Button>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={isSubmitting}
                                            style={{
                                                background: accentColor,
                                                borderColor: accentColor,
                                                borderRadius: 10,
                                                paddingInline: 24,
                                                transition: "background 0.3s"
                                            }}>
                                            {isSubmitting ? t("form.submitting") : t("form.submitButton")}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: FAQ accordion ────────────────── */}
                    <div
                        style={{
                            width: 340,
                            flexShrink: 0,
                            position: "sticky",
                            top: 24,
                            alignSelf: "flex-start"
                        }}>
                        {/* FAQ header — clean, no card wrapper */}
                        <div style={{ marginBottom: 16 }}>
                            <Title level={5} style={{ margin: "0 0 4px", color: DARK }}>
                                {t("faq.title")}
                            </Title>
                            <Text style={{ color: MUTED, fontSize: 13 }}>{t("faq.subtitle")}</Text>
                        </div>

                        {/* Accordion items */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {faqItems.map((item, idx) => {
                                const open = expandedFAQ === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            borderRadius: 14,
                                            border: `1.5px solid ${open ? PRIMARY : BORDER}`,
                                            background: open ? "#FFF7F4" : "#fff",
                                            overflow: "hidden",
                                            transition: "border-color 0.2s, background 0.2s"
                                        }}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedFAQ(open ? null : item.id)}
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 12,
                                                padding: "14px 18px",
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                textAlign: "left"
                                            }}>
                                            {/* Number badge */}
                                            <div
                                                style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: "50%",
                                                        background: open ? PRIMARY : BORDER,
                                                        color: open ? "#fff" : MUTED,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                        transition: "background 0.2s"
                                                    }}>
                                                    {idx + 1}
                                                </span>
                                                <Text
                                                    strong
                                                    style={{
                                                        color: open ? PRIMARY : DARK,
                                                        fontSize: 13,
                                                        lineHeight: "1.4",
                                                        transition: "color 0.2s"
                                                    }}>
                                                    {item.question}
                                                </Text>
                                            </div>

                                            {/* Chevron — CSS only, no icon component */}
                                            <span
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    flexShrink: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    opacity: 0.5,
                                                    transform: open ? "rotate(180deg)" : "rotate(0deg)",
                                                    transition: "transform 0.25s"
                                                }}>
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path
                                                        d="M2 5l5 5 5-5"
                                                        stroke={open ? PRIMARY : MUTED}
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </span>
                                        </button>

                                        {/* Answer */}
                                        {open && (
                                            <div
                                                style={{
                                                    padding: "0 18px 16px 52px",
                                                    borderTop: "1px solid #FFDFD8"
                                                }}>
                                                <Text
                                                    style={{
                                                        color: MUTED,
                                                        fontSize: 13,
                                                        lineHeight: "1.7",
                                                        display: "block",
                                                        paddingTop: 12
                                                    }}>
                                                    {item.answer}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bottom: Contact hint */}
                        <div
                            style={{
                                marginTop: 20,
                                padding: "16px 18px",
                                borderRadius: 14,
                                background: `linear-gradient(135deg, ${DARK} 0%, #3a2a5e 100%)`,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8
                            }}>
                            <Text strong style={{ color: "#fff", fontSize: 13 }}>
                                {contactCardTitle}
                            </Text>
                            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: "1.5" }}>
                                {contactCardDescription}
                            </Text>
                            <div
                                style={{
                                    marginTop: 4,
                                    height: 2,
                                    borderRadius: 2,
                                    background: `linear-gradient(90deg, ${PRIMARY}, #FF8C6B)`,
                                    width: "40%"
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}

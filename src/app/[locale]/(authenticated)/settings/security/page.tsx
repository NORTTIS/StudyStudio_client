"use client";

import {
    CheckCircleFilled,
    CloseCircleFilled,
    ExclamationCircleFilled,
    EyeInvisibleOutlined,
    EyeOutlined,
    LockOutlined,
    SafetyCertificateOutlined
} from "@ant-design/icons";
import { Button, ConfigProvider, Input, message, Progress, Typography } from "antd";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { changePassword } from "@/app/[locale]/(authenticated)/settings/user";

const { Text, Title } = Typography;

const PRIMARY = "#FF5F3D";
const DARK = "#261E33";
const MUTED = "#6F6B99";
const BORDER = "#E5E5E5";

/* ── Password strength ──────────────────────────── */
const REQUIREMENTS = [
    { key: "length", label: "10–20 ký tự", test: (v: string) => v.length >= 10 && v.length <= 20 },
    { key: "upper", label: "Chữ hoa (A–Z)", test: (v: string) => /[A-Z]/.test(v) },
    { key: "lower", label: "Chữ thường (a–z)", test: (v: string) => /[a-z]/.test(v) },
    { key: "number", label: "Chữ số (0–9)", test: (v: string) => /\d/.test(v) },
    { key: "special", label: "Ký tự đặc biệt (@$!…)", test: (v: string) => /[@$!%*?&]/.test(v) }
];

function getStrength(pw: string) {
    if (!pw) return { percent: 0, color: "#E5E5E5", label: "", score: 0 };
    const score = REQUIREMENTS.filter((r) => r.test(pw)).length;
    if (score <= 1) return { percent: 20, color: "#ff4d4f", label: "Yếu", score };
    if (score === 2) return { percent: 45, color: "#fa8c16", label: "Trung bình", score };
    if (score === 3) return { percent: 70, color: "#fadb14", label: "Khá", score };
    return { percent: 100, color: "#52c41a", label: "Mạnh", score };
}

/* ── Security tips ─────────────────────────────── */
const TIPS = [
    "Đừng dùng mật khẩu giống nhau cho nhiều tài khoản",
    "Tránh thông tin cá nhân như ngày sinh, tên",
    "Đổi mật khẩu định kỳ 3–6 tháng/lần",
    "Dùng trình quản lý mật khẩu (1Password, Bitwarden...)"
];

export default function SecuritySettingsPage() {
    const t = useTranslations("SecurityPage");
    const pathname = usePathname();
    const [messageApi, contextHolder] = message.useMessage();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<"form" | "success">("form");
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const strength = useMemo(() => getStrength(passwordData.newPassword), [passwordData.newPassword]);
    const isMatch =
        passwordData.newPassword &&
        passwordData.confirmPassword &&
        passwordData.newPassword === passwordData.confirmPassword;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!passwordData.currentPassword) errs.currentPassword = t("currentPasswordRequired");
        if (!passwordData.newPassword) errs.newPassword = t("newPasswordRequired");
        else if (strength.percent < 45) errs.newPassword = t("passwordInvalid");
        if (!passwordData.confirmPassword) errs.confirmPassword = t("confirmPasswordRequired");
        else if (!isMatch) errs.confirmPassword = t("passwordMismatch");
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const locale = pathname.split("/")[1] || "vi";
            const res = await changePassword(
                {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                    confirmPassword: passwordData.confirmPassword
                },
                locale
            );
            if (res.status === "success") {
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setErrors({});
                setStep("success");
            } else {
                messageApi.error(res.message || t("changePasswordError"));
            }
        } catch {
            messageApi.error(t("changePasswordError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setErrors({});
    };

    /* ── Field component ──────────────────────── */
    const PwField = ({
        id,
        name,
        label,
        hint,
        value,
        error
    }: {
        id: string;
        name: string;
        label: string;
        hint?: string;
        value: string;
        error?: string;
    }) => (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: DARK }}>
                    {label}
                </label>
                {hint && <Text style={{ fontSize: 11, color: MUTED }}>{hint}</Text>}
            </div>
            <Input.Password
                id={id}
                name={name}
                value={value}
                onChange={handleChange}
                prefix={<LockOutlined style={{ color: MUTED }} />}
                iconRender={(v) =>
                    v ? <EyeOutlined style={{ color: MUTED }} /> : <EyeInvisibleOutlined style={{ color: MUTED }} />
                }
                status={error ? "error" : ""}
                style={{ borderRadius: 10, fontSize: 14 }}
            />
            {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <ExclamationCircleFilled style={{ color: "#ff4d4f", fontSize: 12 }} />
                    <Text style={{ color: "#ff4d4f", fontSize: 12 }}>{error}</Text>
                </div>
            )}
        </div>
    );

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: PRIMARY, borderRadius: 10, fontFamily: "inherit", colorBorder: BORDER },
                components: {
                    Input: { activeBorderColor: PRIMARY, hoverBorderColor: PRIMARY, paddingBlock: 9 },
                    Button: { fontWeight: 600 }
                }
            }}>
            {contextHolder}

            {/* ── Outer: 2 rows stacked ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* ╔══════════════════════════════════════════════════╗
                    ║  ROW 1 — Header banner (full width)             ║
                    ╚══════════════════════════════════════════════════╝ */}
                <div
                    style={{
                        borderRadius: 20,
                        background: `linear-gradient(135deg, ${DARK} 0%, #3a2a5e 60%, #FF5F3D22 100%)`,
                        padding: "28px 36px",
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            background: `linear-gradient(135deg, ${PRIMARY} 0%, #FF8C6B 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 16px rgba(255,95,61,0.40)",
                            flexShrink: 0
                        }}>
                        <SafetyCertificateOutlined style={{ color: "#fff", fontSize: 26 }} />
                    </div>
                    <div>
                        <Title level={4} style={{ color: "#fff", margin: "0 0 4px" }}>
                            {t("changePasswordTitle")}
                        </Title>
                        <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                            {t("changePasswordSubtitle")}
                        </Text>
                    </div>
                    {/* Mini tips chips */}
                    <div
                        style={{
                            marginLeft: "auto",
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            justifyContent: "flex-end"
                        }}>
                        {["🔒 Mã hóa an toàn", "🔄 Cập nhật ngay lập tức", "📱 Đăng xuất thiết bị khác"].map((c) => (
                            <span
                                key={c}
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: "rgba(255,255,255,0.7)",
                                    fontSize: 11,
                                    padding: "4px 12px",
                                    borderRadius: 20,
                                    fontWeight: 500
                                }}>
                                {c}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ╔══════════════════════════════════════════════════╗
                    ║  ROW 2 — Form (left 60%) + Strength (right 40%) ║
                    ╚══════════════════════════════════════════════════╝ */}
                {step === "success" ? (
                    /* Success state */
                    <div
                        style={{
                            borderRadius: 20,
                            border: "1px solid #b7eb8f",
                            background: "#F6FFED",
                            padding: "48px 32px",
                            textAlign: "center"
                        }}>
                        <CheckCircleFilled
                            style={{ fontSize: 52, color: "#52c41a", display: "block", marginBottom: 16 }}
                        />
                        <Title level={4} style={{ color: "#237804", margin: "0 0 8px" }}>
                            Đổi mật khẩu thành công!
                        </Title>
                        <Text style={{ color: "#52c41a", fontSize: 14 }}>
                            Mật khẩu của bạn đã được cập nhật an toàn.
                        </Text>
                        <br />
                        <Button
                            type="primary"
                            style={{ marginTop: 24, background: "#52c41a", borderColor: "#52c41a", borderRadius: 10 }}
                            onClick={() => setStep("form")}>
                            Đổi mật khẩu khác
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                        {/* LEFT: 3-step form */}
                        <form
                            onSubmit={handleSubmit}
                            style={{
                                flex: "3 1 0",
                                minWidth: 0,
                                background: "#fff",
                                borderRadius: 20,
                                border: `1px solid ${BORDER}`,
                                overflow: "hidden",
                                boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
                            }}>
                            {/* Step indicators */}
                            <div
                                style={{
                                    display: "flex",
                                    borderBottom: `1px solid ${BORDER}`,
                                    background: "#FAFAFA"
                                }}>
                                {[
                                    { num: 1, label: "Mật khẩu hiện tại" },
                                    { num: 2, label: "Mật khẩu mới" },
                                    { num: 3, label: "Xác nhận" }
                                ].map(({ num, label }) => {
                                    const done =
                                        (num === 1 && !!passwordData.currentPassword && !errors.currentPassword) ||
                                        (num === 2 &&
                                            !!passwordData.newPassword &&
                                            !errors.newPassword &&
                                            strength.percent >= 45) ||
                                        (num === 3 && !!isMatch);
                                    return (
                                        <div
                                            key={num}
                                            style={{
                                                flex: 1,
                                                padding: "14px 16px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                borderRight: num < 3 ? `1px solid ${BORDER}` : "none"
                                            }}>
                                            <div
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: "50%",
                                                    background: done ? "#52c41a" : num === 1 ? PRIMARY : "#E5E5E5",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0
                                                }}>
                                                {done ? (
                                                    <CheckCircleFilled style={{ color: "#fff", fontSize: 13 }} />
                                                ) : (
                                                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                                                        {num}
                                                    </Text>
                                                )}
                                            </div>
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: done ? "#237804" : DARK
                                                }}>
                                                {label}
                                            </Text>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Fields */}
                            <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 22 }}>
                                <PwField
                                    id="currentPassword"
                                    name="currentPassword"
                                    label={t("currentPassword")}
                                    value={passwordData.currentPassword}
                                    error={errors.currentPassword}
                                />
                                <PwField
                                    id="newPassword"
                                    name="newPassword"
                                    label={t("newPassword")}
                                    hint="Tối thiểu trung bình"
                                    value={passwordData.newPassword}
                                    error={errors.newPassword}
                                />
                                <PwField
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    label={t("confirmPassword")}
                                    value={passwordData.confirmPassword}
                                    error={errors.confirmPassword}
                                />
                                {/* Confirm match hint */}
                                {passwordData.confirmPassword && passwordData.newPassword && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -10 }}>
                                        {isMatch ? (
                                            <>
                                                <CheckCircleFilled style={{ color: "#52c41a", fontSize: 12 }} />
                                                <Text style={{ color: "#52c41a", fontSize: 12 }}>
                                                    Mật khẩu khớp nhau ✓
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <CloseCircleFilled style={{ color: "#ff4d4f", fontSize: 12 }} />
                                                <Text style={{ color: "#ff4d4f", fontSize: 12 }}>
                                                    Mật khẩu chưa khớp
                                                </Text>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 10,
                                        borderTop: `1px solid ${BORDER}`,
                                        paddingTop: 20
                                    }}>
                                    <Button style={{ borderRadius: 10, paddingInline: 20 }} onClick={handleCancel}>
                                        {t("cancelButton")}
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={isSubmitting}
                                        icon={<SafetyCertificateOutlined />}
                                        style={{
                                            background: PRIMARY,
                                            borderColor: PRIMARY,
                                            borderRadius: 10,
                                            paddingInline: 24
                                        }}>
                                        {isSubmitting ? t("updatingButton") : t("updateButton")}
                                    </Button>
                                </div>
                            </div>
                        </form>

                        {/* RIGHT: Strength meter panel */}
                        <div
                            style={{
                                flex: "2 1 0",
                                minWidth: 220,
                                maxWidth: 300,
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                                position: "sticky",
                                top: 24,
                                alignSelf: "flex-start"
                            }}>
                            {/* Strength card */}
                            <div
                                style={{
                                    background: "#fff",
                                    borderRadius: 16,
                                    border: `1px solid ${BORDER}`,
                                    padding: "18px 20px",
                                    boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
                                }}>
                                <Text strong style={{ color: DARK, display: "block", fontSize: 13, marginBottom: 12 }}>
                                    Độ mạnh mật khẩu
                                </Text>

                                {passwordData.newPassword ? (
                                    <>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginBottom: 6
                                            }}>
                                            <Text style={{ fontSize: 12, color: MUTED }}>Mức độ</Text>
                                            <Text style={{ fontSize: 12, fontWeight: 700, color: strength.color }}>
                                                {strength.label}
                                            </Text>
                                        </div>
                                        <Progress
                                            percent={strength.percent}
                                            showInfo={false}
                                            strokeColor={strength.color}
                                            trailColor={BORDER}
                                            size={["100%", 8]}
                                            style={{ marginBottom: 16 }}
                                        />
                                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                            {REQUIREMENTS.map((req) => {
                                                const ok = req.test(passwordData.newPassword);
                                                return (
                                                    <div
                                                        key={req.key}
                                                        style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                                        {ok ? (
                                                            <CheckCircleFilled
                                                                style={{
                                                                    color: "#52c41a",
                                                                    fontSize: 12,
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                        ) : (
                                                            <CloseCircleFilled
                                                                style={{
                                                                    color: "#d9d9d9",
                                                                    fontSize: 12,
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                        )}
                                                        <Text style={{ fontSize: 12, color: ok ? "#237804" : MUTED }}>
                                                            {req.label}
                                                        </Text>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <Text style={{ color: MUTED, fontSize: 12 }}>Nhập mật khẩu mới để xem độ mạnh</Text>
                                )}
                            </div>

                            {/* Tips card */}
                            <div
                                style={{
                                    background: "#FFF7F4",
                                    borderRadius: 16,
                                    border: "1.5px solid #FFDFD8",
                                    padding: "18px 20px"
                                }}>
                                <Text
                                    strong
                                    style={{ color: PRIMARY, display: "block", fontSize: 13, marginBottom: 12 }}>
                                    💡 Mẹo bảo mật
                                </Text>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {TIPS.map((tip, i) => (
                                        <div key={i} style={{ display: "flex", gap: 7 }}>
                                            <span
                                                style={{
                                                    color: PRIMARY,
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                    fontSize: 13
                                                }}>
                                                •
                                            </span>
                                            <Text style={{ fontSize: 12, color: DARK, lineHeight: "1.5" }}>{tip}</Text>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ConfigProvider>
    );
}

"use client";

import {
    BellFilled,
    CameraOutlined,
    CheckCircleFilled,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    ExclamationCircleFilled,
    GlobalOutlined,
    InfoCircleOutlined,
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    SaveOutlined,
    UserOutlined,
    WarningOutlined
} from "@ant-design/icons";
import {
    Alert,
    Avatar,
    Button,
    Card,
    ConfigProvider,
    Input,
    Modal,
    message,
    Select,
    Switch,
    Tooltip,
    Typography
} from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { components } from "@/api/types";
import type { UpdateProfileRequest } from "@/app/[locale]/(authenticated)/settings/user";
import { deleteUserProfile, updateUserProfile } from "@/app/[locale]/(authenticated)/settings/user";
import { useToast } from "@/components/ui/use-toast";

const { Title, Text } = Typography;
const { TextArea } = Input;

const PRIMARY = "#FF5F3D";
const DARK = "#261E33";
const MUTED = "#6F6B99";
const BORDER = "#E5E5E5";
const BG = "#F8F8F8";

const languages = [
    { value: "en", label: "English", flag: "https://flagcdn.com/w20/gb.png" },
    { value: "vi", label: "Tiếng Việt", flag: "https://flagcdn.com/w20/vn.png" }
];

const FlagOption = ({ flag, label }: { flag: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
            src={flag}
            alt={label}
            style={{ width: 20, height: 14, objectFit: "cover", borderRadius: 2, flexShrink: 0 }}
        />
        <span>{label}</span>
    </div>
);

const nameRegex = /^[A-Za-zÀ-ỹ0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{1,20}$/;
const phoneRegex = /^\d{10,11}$/;
const maxBioLength = 500;

const profileSchema = z.object({
    firstName: z.string().min(1, { message: "firstNameRequired" }).regex(nameRegex, { message: "firstNameInvalid" }),
    lastName: z.string().min(1, { message: "lastNameRequired" }).regex(nameRegex, { message: "lastNameInvalid" }),
    phoneNumber: z.string().refine((v) => v.length === 0 || phoneRegex.test(v), { message: "phoneNumberInvalid" }),
    bio: z.string().max(maxBioLength, { message: "bioMaxLength" })
});

type UserProfile = components["schemas"]["UserProfileResponse"];

const normalize = (p: UserProfile, locale: string): UserProfile => ({
    ...p,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    email: p.email ?? "",
    phoneNumber: p.phoneNumber ?? "",
    bio: p.bio ?? "",
    language: p.language ?? locale,
    emailNotificationEnabled: Boolean(p.emailNotificationEnabled)
});

interface SettingsClientProps {
    initialData: UserProfile;
}

function FieldWrapper({
    label,
    hint,
    error,
    children
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{label}</label>
            {hint && <Text style={{ fontSize: 12, color: MUTED }}>{hint}</Text>}
            {children}
            {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <ExclamationCircleFilled style={{ color: "#ff4d4f", fontSize: 12 }} />
                    <Text style={{ color: "#ff4d4f", fontSize: 12 }}>{error}</Text>
                </div>
            )}
        </div>
    );
}

export default function SettingsClient({ initialData }: SettingsClientProps) {
    const t = useTranslations("SettingsPage");
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [messageApi, contextHolder] = message.useMessage();

    // ── Profile states ─────────────────────────────────
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; phoneNumber?: string; bio?: string }>(
        {}
    );
    const [avatarPreview, setAvatarPreview] = useState(initialData.avatarUrl || "/images/image-removebg-preview.png");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Settings states ────────────────────────────────
    const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
    const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    const initialLocale = typeof window !== "undefined" ? pathname.split("/")[1] || "vi" : "vi";
    const [formData, setFormData] = useState<UserProfile>(() => normalize(initialData, initialLocale));
    const initials = `${formData.firstName?.[0] ?? ""}${formData.lastName?.[0] ?? ""}`.toUpperCase() || "U";

    useEffect(() => {
        const savedAvatar = localStorage.getItem("userAvatar");
        const savedLocale = localStorage.getItem("preferredLocale");
        const currentLocale = pathname.split("/")[1] || "vi";
        const lang = savedLocale || initialData.language || currentLocale;

        if (savedAvatar) setAvatarPreview(savedAvatar);
        setFormData((p) => (p.language === lang ? p : { ...p, language: lang }));
        localStorage.setItem("preferredLocale", lang);

        if (lang !== currentLocale) {
            const noLocale = pathname.replace(/^\/(en|vi)/, "");
            router.replace(`/${lang}${noLocale || "/"}`);
        }
    }, [initialData.language, pathname, router]);

    // ── Profile handlers ───────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!isEditing) return;
        const { name, value } = e.target;
        const next = name === "phoneNumber" ? value.replace(/\D/g, "") : value;
        setFormData((p) => ({ ...p, [name]: next }));
        setErrors((p) => ({ ...p, [name]: "" }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isEditing) return;
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setAvatarPreview(result);
                localStorage.setItem("userAvatar", result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(normalize(initialData, pathname.split("/")[1] || "vi"));
        setAvatarPreview(initialData.avatarUrl || "/images/image-removebg-preview.png");
        setAvatarFile(null);
        setErrors({});
    };

    const validate = () => {
        const result = profileSchema.safeParse({
            firstName: formData.firstName ?? "",
            lastName: formData.lastName ?? "",
            phoneNumber: formData.phoneNumber?.trim() || "",
            bio: formData.bio ?? ""
        });
        if (result.success) {
            setErrors({});
            return true;
        }
        const errs: typeof errors = {};
        for (const issue of result.error.issues) {
            const f = issue.path[0];
            if (f === "firstName")
                errs.firstName =
                    issue.message === "firstNameRequired"
                        ? t("profile.firstNameRequired")
                        : t("profile.firstNameInvalid");
            if (f === "lastName")
                errs.lastName =
                    issue.message === "lastNameRequired" ? t("profile.lastNameRequired") : t("profile.lastNameInvalid");
            if (f === "phoneNumber") errs.phoneNumber = t("profile.phoneNumberInvalid");
            if (f === "bio") errs.bio = t("profile.bioMaxLength");
        }
        setErrors(errs);
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const loc = pathname.split("/")[1] || "vi";
            const payload: UpdateProfileRequest = {
                firstName: formData.firstName?.trim() || "",
                lastName: formData.lastName?.trim() || "",
                phoneNumber: formData.phoneNumber?.trim() || "",
                bio: formData.bio || ""
            };
            if (avatarFile) payload.avatar = avatarFile;
            const res = await updateUserProfile(payload, loc);
            if (res.status === "success") {
                messageApi.success({
                    content: t("profile.saveSuccess"),
                    icon: <CheckCircleFilled style={{ color: "#52c41a" }} />
                });
                setTimeout(() => window.location.reload(), 900);
            } else {
                messageApi.error(res.message || t("profile.saveError"));
            }
        } catch {
            messageApi.error(t("profile.saveError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Language handler ───────────────────────────────
    const handleLanguageChange = async (next: string) => {
        const prev = formData.language;
        if (next === prev || isUpdatingLanguage) return;
        setFormData((p) => ({ ...p, language: next }));
        setIsUpdatingLanguage(true);
        try {
            const loc = pathname.split("/")[1] || "vi";
            const res = await updateUserProfile({ language: next }, loc);
            if (res.status !== "success") {
                setFormData((p) => ({ ...p, language: prev }));
                messageApi.error(res.message || t("profile.saveError"));
                return;
            }
            localStorage.setItem("preferredLocale", next);
            messageApi.success(res.message || t("profile.saveSuccess"));
            router.push(`/${next}${pathname.replace(/^\/(en|vi)/, "") || "/"}`);
        } catch {
            setFormData((p) => ({ ...p, language: prev }));
            messageApi.error(t("profile.saveError"));
        } finally {
            setIsUpdatingLanguage(false);
        }
    };

    // ── Notification handler ───────────────────────────
    const handleNotificationChange = async (checked: boolean) => {
        const prev = formData.emailNotificationEnabled;
        if (checked === prev || isUpdatingNotification) return;
        setFormData((p) => ({ ...p, emailNotificationEnabled: checked }));
        setIsUpdatingNotification(true);
        try {
            const loc = pathname.split("/")[1] || "vi";
            const res = await updateUserProfile({ emailNotificationEnabled: checked }, loc);
            if (res.status !== "success") {
                setFormData((p) => ({ ...p, emailNotificationEnabled: prev }));
                messageApi.error(res.message || t("profile.saveError"));
                return;
            }
            messageApi.success(res.message || t("profile.saveSuccess"));
        } catch {
            setFormData((p) => ({ ...p, emailNotificationEnabled: prev }));
            messageApi.error(t("profile.saveError"));
        } finally {
            setIsUpdatingNotification(false);
        }
    };

    // ── Delete handler ─────────────────────────────────
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            messageApi.error(t("profile.deleteAccount.confirmTextError"));
            return;
        }
        setIsDeleting(true);
        try {
            const loc = pathname.split("/")[1] || "vi";
            const res = await deleteUserProfile(loc);
            if (res.status !== "success") {
                messageApi.error(res.message || t("profile.deleteAccount.error"));
                return;
            }
            messageApi.success(res.message || t("profile.deleteAccount.success"));
            localStorage.clear();
            window.location.href = `/${loc}/login`;
        } catch {
            messageApi.error(t("profile.deleteAccount.error"));
        } finally {
            setIsDeleting(false);
        }
    };

    const cardStyle: React.CSSProperties = {
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
    };

    const sectionIconStyle: React.CSSProperties = {
        width: 34,
        height: 34,
        borderRadius: 8,
        background: "#FFF0ED",
        border: "1px solid rgba(255,95,61,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
    };

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: PRIMARY, borderRadius: 10, fontFamily: "inherit", colorBorder: BORDER },
                components: {
                    Input: { activeBorderColor: PRIMARY, hoverBorderColor: PRIMARY, paddingBlock: 9, fontSize: 14 },
                    Select: { optionActiveBg: "#FFF5F3", optionSelectedBg: "#FFF5F3", optionSelectedColor: PRIMARY },
                    Switch: { colorPrimary: PRIMARY },
                    Button: { defaultBorderColor: BORDER, fontWeight: 600 }
                }
            }}>
            {contextHolder}

            {/* ── 2-column grid ── */}
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", paddingBottom: 80 }}>
                {/* ════════════════════════════════
                    LEFT — Profile form
                ════════════════════════════════ */}
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                    <Card style={cardStyle} styles={{ body: { padding: 0 } }}>
                        {/* Gradient banner */}
                        <div
                            style={{
                                height: 88,
                                borderRadius: "16px 16px 0 0",
                                background: "linear-gradient(135deg,#261E33 0%,#3d2f54 50%,#FF5F3D22 100%)"
                            }}
                        />

                        <div style={{ padding: "0 32px 28px", position: "relative" }}>
                            {/* Avatar row */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "space-between",
                                    marginBottom: 20
                                }}>
                                <div style={{ position: "relative", marginTop: -44 }}>
                                    <Avatar
                                        size={88}
                                        src={avatarPreview}
                                        style={{
                                            border: "4px solid #fff",
                                            background: PRIMARY,
                                            fontSize: 32,
                                            fontWeight: 700,
                                            boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
                                        }}>
                                        {initials}
                                    </Avatar>
                                    <span
                                        style={{
                                            position: "absolute",
                                            bottom: 6,
                                            right: 4,
                                            width: 14,
                                            height: 14,
                                            borderRadius: "50%",
                                            background: "#52c41a",
                                            border: "2.5px solid #fff"
                                        }}
                                    />
                                    {isEditing && (
                                        <Tooltip title={t("profile.changeAvatar")}>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    borderRadius: "50%",
                                                    border: "none",
                                                    background: "rgba(0,0,0,0.45)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    cursor: "pointer",
                                                    color: "#fff",
                                                    fontSize: 22
                                                }}>
                                                <CameraOutlined />
                                            </button>
                                        </Tooltip>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        style={{ display: "none" }}
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
                                    {isEditing ? (
                                        <>
                                            <Button
                                                icon={<CloseOutlined />}
                                                onClick={handleCancel}
                                                style={{ borderColor: BORDER, color: MUTED }}>
                                                {t("profile.cancelButton")}
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                loading={isSubmitting}
                                                style={{ background: PRIMARY, borderColor: PRIMARY }}
                                                onClick={() =>
                                                    (
                                                        document.getElementById("profile-form") as HTMLFormElement
                                                    )?.requestSubmit()
                                                }>
                                                {isSubmitting ? t("profile.savingButton") : t("profile.saveButton")}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="primary"
                                            icon={<EditOutlined />}
                                            onClick={() => setIsEditing(true)}
                                            style={{ background: PRIMARY, borderColor: PRIMARY }}>
                                            {t("profile.editButton")}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Name + email display */}
                            <div style={{ marginBottom: 24 }}>
                                <Title level={4} style={{ margin: 0, color: DARK }}>
                                    {formData.firstName} {formData.lastName}
                                </Title>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                    <MailOutlined style={{ color: MUTED, fontSize: 13 }} />
                                    <Text style={{ color: MUTED, fontSize: 13 }}>{formData.email}</Text>
                                </div>
                                {isEditing && (
                                    <Text style={{ fontSize: 12, color: MUTED, display: "block", marginTop: 6 }}>
                                        💡 {t("profile.avatarSupport")}
                                    </Text>
                                )}
                            </div>

                            {/* Form */}
                            <form id="profile-form" onSubmit={handleSubmit}>
                                {/* Basic Info */}
                                <div style={{ marginBottom: 28 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                        <UserOutlined style={{ color: PRIMARY, fontSize: 15 }} />
                                        <Text strong style={{ color: DARK, fontSize: 14 }}>
                                            {t("profile.sectionBasicInfo")}
                                        </Text>
                                        <div style={{ flex: 1, height: 1, background: BORDER, marginLeft: 8 }} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                        <FieldWrapper
                                            label={t("profile.firstName")}
                                            hint={t("profile.hintFirstName")}
                                            error={errors.firstName}>
                                            <Input
                                                name="firstName"
                                                value={formData.firstName ?? ""}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                status={errors.firstName ? "error" : ""}
                                                placeholder={t("profile.placeholderFirstName")}
                                                prefix={<UserOutlined style={{ color: MUTED }} />}
                                            />
                                        </FieldWrapper>
                                        <FieldWrapper
                                            label={t("profile.lastName")}
                                            hint={t("profile.hintLastName")}
                                            error={errors.lastName}>
                                            <Input
                                                name="lastName"
                                                value={formData.lastName ?? ""}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                status={errors.lastName ? "error" : ""}
                                                placeholder={t("profile.placeholderLastName")}
                                                prefix={<UserOutlined style={{ color: MUTED }} />}
                                            />
                                        </FieldWrapper>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div style={{ marginBottom: 28 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                        <MailOutlined style={{ color: PRIMARY, fontSize: 15 }} />
                                        <Text strong style={{ color: DARK, fontSize: 14 }}>
                                            {t("profile.sectionContact")}
                                        </Text>
                                        <div style={{ flex: 1, height: 1, background: BORDER, marginLeft: 8 }} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                        <FieldWrapper label={t("profile.email")} hint={t("profile.hintEmail")}>
                                            <Input
                                                value={formData.email ?? ""}
                                                disabled
                                                prefix={<MailOutlined style={{ color: MUTED }} />}
                                                suffix={<LockOutlined style={{ color: MUTED, fontSize: 12 }} />}
                                                style={{ background: BG, color: MUTED }}
                                            />
                                        </FieldWrapper>
                                        <FieldWrapper
                                            label={t("profile.phoneNumber")}
                                            hint={t("profile.hintPhone")}
                                            error={errors.phoneNumber}>
                                            <Input
                                                name="phoneNumber"
                                                value={formData.phoneNumber ?? ""}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                status={errors.phoneNumber ? "error" : ""}
                                                placeholder="0901234567"
                                                prefix={<PhoneOutlined style={{ color: MUTED }} />}
                                                inputMode="numeric"
                                                maxLength={11}
                                            />
                                        </FieldWrapper>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                        <InfoCircleOutlined style={{ color: PRIMARY, fontSize: 15 }} />
                                        <Text strong style={{ color: DARK, fontSize: 14 }}>
                                            Giới thiệu bản thân
                                        </Text>
                                        <div style={{ flex: 1, height: 1, background: BORDER, marginLeft: 8 }} />
                                    </div>
                                    <FieldWrapper label={t("profile.bio")} error={errors.bio}>
                                        <TextArea
                                            name="bio"
                                            value={formData.bio ?? ""}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            rows={4}
                                            placeholder={t("profile.bioPlaceholder")}
                                            style={{ resize: "none" }}
                                            status={errors.bio ? "error" : ""}
                                            showCount
                                            maxLength={maxBioLength}
                                        />
                                    </FieldWrapper>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
                {/* /LEFT */}

                {/* ════════════════════════════════
                    RIGHT — sticky sidebar
                ════════════════════════════════ */}
                <div
                    style={{
                        width: 320,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        position: "sticky",
                        top: 24,
                        alignSelf: "flex-start"
                    }}>
                    {/* ── Language ── */}
                    <Card style={cardStyle} styles={{ body: { padding: "20px" } }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                            <div style={sectionIconStyle}>
                                <GlobalOutlined style={{ color: PRIMARY, fontSize: 13 }} />
                            </div>
                            <div>
                                <Text strong style={{ color: DARK, display: "block", fontSize: 14, lineHeight: "1.3" }}>
                                    {t("profile.preferencesTitle")}
                                </Text>
                                <Text style={{ color: MUTED, fontSize: 11 }}>{t("profile.preferencesSubtitle")}</Text>
                            </div>
                        </div>
                        <div
                            style={{
                                background: BG,
                                borderRadius: 10,
                                border: `1px solid ${BORDER}`,
                                padding: "12px 14px"
                            }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 8
                                }}>
                                <Text strong style={{ color: DARK, fontSize: 13 }}>
                                    {t("profile.language")}
                                </Text>
                                <Text style={{ color: MUTED, fontSize: 11 }}>{t("profile.languageHint")}</Text>
                            </div>
                            <Select
                                value={formData.language ?? "vi"}
                                onChange={handleLanguageChange}
                                disabled={isUpdatingLanguage}
                                loading={isUpdatingLanguage}
                                style={{ width: "100%" }}
                                options={languages.map((l) => ({ label: l.label, value: l.value }))}
                                labelRender={({ value }) => {
                                    const l = languages.find((x) => x.value === value);
                                    return l ? <FlagOption flag={l.flag} label={l.label} /> : <span>{value}</span>;
                                }}
                                optionRender={(opt) => {
                                    const l = languages.find((x) => x.value === opt.value);
                                    return l ? <FlagOption flag={l.flag} label={l.label} /> : <span>{opt.label}</span>;
                                }}
                            />
                        </div>
                    </Card>

                    {/* ── Notifications ── */}
                    <Card style={cardStyle} styles={{ body: { padding: "20px" } }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                            <div style={sectionIconStyle}>
                                <BellFilled style={{ color: PRIMARY, fontSize: 13 }} />
                            </div>
                            <div>
                                <Text strong style={{ color: DARK, display: "block", fontSize: 14, lineHeight: "1.3" }}>
                                    {t("profile.notificationsTitle")}
                                </Text>
                                <Text style={{ color: MUTED, fontSize: 11 }}>{t("profile.notificationsSubtitle")}</Text>
                            </div>
                        </div>
                        <div
                            style={{
                                background: BG,
                                borderRadius: 10,
                                border: `1px solid ${BORDER}`,
                                padding: "12px 14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10
                            }}>
                            <div style={{ minWidth: 0 }}>
                                <Text strong style={{ color: DARK, fontSize: 13, display: "block" }}>
                                    {t("profile.studioNotifications")}
                                </Text>
                                <Text style={{ color: MUTED, fontSize: 11 }}>
                                    {t("profile.studioNotificationsDesc")}
                                </Text>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 2,
                                    flexShrink: 0
                                }}>
                                <Switch
                                    checked={Boolean(formData.emailNotificationEnabled)}
                                    onChange={handleNotificationChange}
                                    loading={isUpdatingNotification}
                                    checkedChildren={t("profile.switchOn")}
                                    unCheckedChildren={t("profile.switchOff")}
                                    style={formData.emailNotificationEnabled ? { background: PRIMARY } : {}}
                                />
                                <Text
                                    style={{
                                        fontSize: 10,
                                        color: formData.emailNotificationEnabled ? PRIMARY : MUTED,
                                        fontWeight: 700
                                    }}>
                                    {formData.emailNotificationEnabled ? t("profile.statusOn") : t("profile.statusOff")}
                                </Text>
                            </div>
                        </div>
                    </Card>

                    {/* ── Danger Zone ── */}
                    <Card
                        style={{
                            borderRadius: 16,
                            border: "2px solid #FFCCC7",
                            background: "#FFF2F0",
                            boxShadow: "0 1px 6px rgba(255,77,79,0.08)"
                        }}
                        styles={{ body: { padding: "20px" } }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                            <div style={{ ...sectionIconStyle, background: "#FFCCC7", border: "1px solid #FFAAA5" }}>
                                <WarningOutlined style={{ color: "#ff4d4f", fontSize: 13 }} />
                            </div>
                            <div>
                                <Text
                                    strong
                                    style={{ color: "#cf1322", display: "block", fontSize: 14, lineHeight: "1.3" }}>
                                    {t("profile.deleteAccount.title")}
                                </Text>
                                <Text style={{ color: "#ff4d4f", fontSize: 11 }}>
                                    {t("profile.deleteAccount.subtitle")}
                                </Text>
                            </div>
                        </div>
                        <div
                            style={{
                                background: "#fff",
                                borderRadius: 10,
                                border: "1px solid #FFCCC7",
                                padding: "12px 14px",
                                marginBottom: 14
                            }}>
                            <Text strong style={{ color: "#cf1322", fontSize: 12, display: "block", marginBottom: 8 }}>
                                ⚠️ {t("profile.deleteAccount.warning")}
                            </Text>
                            {[
                                t("profile.deleteAccount.consequence1"),
                                t("profile.deleteAccount.consequence2"),
                                t("profile.deleteAccount.consequence3")
                            ].map((c, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                                    <span style={{ color: "#ff4d4f", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                                        •
                                    </span>
                                    <Text style={{ color: "#cf1322", fontSize: 12, lineHeight: "1.5" }}>{c}</Text>
                                </div>
                            ))}
                        </div>
                        <Button
                            danger
                            block
                            icon={<DeleteOutlined />}
                            style={{ borderRadius: 10, fontWeight: 700 }}
                            onClick={() => setShowDeleteModal(true)}>
                            {t("profile.deleteAccount.button")}
                        </Button>
                    </Card>
                </div>
                {/* /RIGHT */}
            </div>

            {/* ── Delete Modal ── */}
            <Modal
                open={showDeleteModal}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                }}
                footer={null}
                centered
                width={480}
                closable={false}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div
                        style={{
                            width: 68,
                            height: 68,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,#FFF2F0,#FFE4E0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 16px",
                            border: "2px solid #FFCCC7"
                        }}>
                        <ExclamationCircleFilled style={{ fontSize: 32, color: "#ff4d4f" }} />
                    </div>
                    <Title level={4} style={{ color: DARK, margin: "0 0 6px" }}>
                        {t("profile.deleteAccount.modalTitle")}
                    </Title>
                    <Text style={{ color: MUTED, fontSize: 13 }}>{t("profile.deleteAccount.modalSubtitle")}</Text>
                </div>
                <Alert
                    type="error"
                    message={t("profile.deleteIrreversible")}
                    style={{ marginBottom: 20, borderRadius: 8 }}
                    showIcon={false}
                    banner
                />
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>
                        {t("profile.deleteAccount.confirmLabel")}
                    </label>
                    <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={t("profile.deleteConfirmPlaceholder")}
                        status={deleteConfirmText && deleteConfirmText !== "DELETE" ? "error" : ""}
                        style={{ letterSpacing: 2, fontWeight: 600, fontSize: 15 }}
                        size="large"
                    />
                    <Text style={{ color: MUTED, fontSize: 12, display: "block", marginTop: 6 }}>
                        {t("profile.deleteAccount.confirmHint")}
                    </Text>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    <Button
                        block
                        size="large"
                        style={{ borderRadius: 10, fontWeight: 600 }}
                        onClick={() => {
                            setShowDeleteModal(false);
                            setDeleteConfirmText("");
                        }}
                        disabled={isDeleting}>
                        {t("profile.deleteAccount.cancelButton")}
                    </Button>
                    <Button
                        block
                        danger
                        type="primary"
                        size="large"
                        loading={isDeleting}
                        disabled={deleteConfirmText !== "DELETE"}
                        icon={<DeleteOutlined />}
                        onClick={handleDeleteAccount}
                        style={{ borderRadius: 10, fontWeight: 700 }}>
                        {isDeleting ? t("profile.deleteAccount.deleting") : t("profile.deleteAccount.confirmButton")}
                    </Button>
                </div>
            </Modal>
        </ConfigProvider>
    );
}

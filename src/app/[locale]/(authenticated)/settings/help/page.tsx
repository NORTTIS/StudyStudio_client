"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { sendReport } from "@/app/[locale]/(authenticated)/settings/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export default function HelpPage() {
    const t = useTranslations("HelpPage");
    const pathname = usePathname();
    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
    const [_mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [helpFormData, setHelpFormData] = useState({
        localPhoneId: "",
        email: "",
        title: "",
        content: "",
    });

    // Load from localStorage on mount
    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            const savedLocalPhoneId = localStorage.getItem("helpLocalPhoneId");
            const savedEmail = localStorage.getItem("helpEmail");

            if (savedLocalPhoneId || savedEmail) {
                setHelpFormData((prev) => ({
                    ...prev,
                    localPhoneId: savedLocalPhoneId || "",
                    email: savedEmail || ""
                }));
            }
        }
    }, []);

    const faqItems: FAQItem[] = [
        {
            id: "1",
            question: t("faq.item1.question"),
            answer: t("faq.item1.answer")
        },
        {
            id: "2",
            question: t("faq.item2.question"),
            answer: t("faq.item2.answer")
        },
        {
            id: "3",
            question: t("faq.item3.question"),
            answer: t("faq.item3.answer")
        },
        {
            id: "4",
            question: t("faq.item4.question"),
            answer: t("faq.item4.answer")
        }
    ];

    const handleHelpFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setHelpFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleHelpFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(helpFormData.localPhoneId && helpFormData.email && helpFormData.title && helpFormData.content)) {
            alert(t("form.validationError"));
            return;
        }

        setIsSubmitting(true);

        try {
            // Get current locale from pathname
            const locale = pathname.split("/")[1] || "vi";

            // Call send report API
            const response = await sendReport(
                {
                    email: helpFormData.email,
                    title: helpFormData.title,
                    content: helpFormData.content,
                    type: "help", // Type of report (help, bug, feedback, etc.)
                },
                locale,
            );

            if (response.status === "success") {
                // Save to localStorage
                if (typeof window !== "undefined") {
                    // Save user info for next time
                    localStorage.setItem("helpLocalPhoneId", helpFormData.localPhoneId);
                    localStorage.setItem("helpEmail", helpFormData.email);

                    // Save submission history
                    const helpHistory = JSON.parse(localStorage.getItem("helpHistory") || "[]");
                    helpHistory.push({
                        ...helpFormData,
                        timestamp: new Date().toISOString(),
                    });
                    localStorage.setItem("helpHistory", JSON.stringify(helpHistory));
                }

                console.log("[Help] Form submitted:", helpFormData);
                alert(t("form.submitSuccess"));
                setHelpFormData({
                    localPhoneId: helpFormData.localPhoneId,
                    email: helpFormData.email,
                    title: "",
                    content: "",
                });
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Submit help form failed:", error);
            alert(t("form.submitError") || "Failed to submit");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleFAQ = (id: string) => {
        setExpandedFAQ(expandedFAQ === id ? null : id);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            {/* Contact Support Form */}
            <div>
                <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{t("form.formTitle")}</h2>
                <p className="mb-8 text-[#6F6B99] text-sm">{t("form.subtitle")}</p>
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                    <form onSubmit={handleHelpFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.localPhoneId")}</label>
                                <Input
                                    type="text"
                                    name="localPhoneId"
                                    value={helpFormData.localPhoneId}
                                    onChange={handleHelpFormChange}
                                    placeholder={t("form.localPhoneIdPlaceholder")}
                                    className="rounded-lg border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.email")}</label>
                                <Input
                                    type="email"
                                    name="email"
                                    value={helpFormData.email}
                                    onChange={handleHelpFormChange}
                                    placeholder={t("form.emailPlaceholder")}
                                    className="rounded-lg border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.title")}</label>
                            <Input
                                type="text"
                                name="title"
                                value={helpFormData.title}
                                onChange={handleHelpFormChange}
                                placeholder={t("form.titlePlaceholder")}
                                className="rounded-lg border-[#E5E5E5] bg-white py-2.5 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.content")}</label>
                            <textarea
                                name="content"
                                value={helpFormData.content}
                                onChange={handleHelpFormChange}
                                placeholder={t("form.contentPlaceholder")}
                                rows={5}
                                className="w-full rounded-lg border border-[#E5E5E5] bg-white p-3 text-[#261E33] placeholder:text-[#9CA3AF] focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]"
                            />
                        </div>
                        <div className="flex justify-end gap-3 border-[#E5E5E5] border-t pt-4">
                            <Button
                                type="button"
                                onClick={() =>
                                    setHelpFormData({
                                        localPhoneId: "",
                                        email: "",
                                        title: "",
                                        content: ""
                                    })
                                }
                                className="rounded-lg border border-[#E5E5E5] bg-white px-6 py-2.5 font-semibold text-[#261E33] text-sm hover:bg-[#F5F5F5]">
                                {t("form.cancelButton")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-lg bg-[#FF5F3D] px-6 py-2.5 font-semibold text-sm text-white hover:bg-[#ff4620] disabled:opacity-50">
                                {isSubmitting ? t("form.submittingButton") : t("form.submitButton")}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <hr className="border-[#E5E5E5]" />

            {/* FAQ Section */}
            <div>
                <h2 className="mb-2 font-bold text-2xl text-[#261E33]">{t("faq.title")}</h2>
                <p className="mb-8 text-[#6F6B99] text-sm">{t("faq.subtitle")}</p>
                <div className="space-y-3">
                    {faqItems.map((item) => (
                        <div key={item.id} className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
                            <button
                                type="button"
                                onClick={() => toggleFAQ(item.id)}
                                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#F9F9F9]">
                                <span className="font-semibold text-[#261E33]">{item.question}</span>
                                <svg
                                    className={`h-5 w-5 text-[#6F6B99] transition-transform ${expandedFAQ === item.id ? "rotate-180" : ""
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {expandedFAQ === item.id && (
                                <div className="border-[#E5E5E5] border-t bg-[#FAFAFA] px-6 py-4">
                                    <p className="text-[#6F6B99] text-sm leading-relaxed">{item.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

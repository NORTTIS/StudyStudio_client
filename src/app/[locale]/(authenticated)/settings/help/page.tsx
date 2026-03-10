"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { components } from "@/api/types";
import { sendReport } from "@/app/[locale]/(authenticated)/settings/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

type FeedbackType = "bug" | "feedback" | "support" | "other";
type ReportType = components["schemas"]["ReportType"];

const FEEDBACK_TYPE_TO_REPORT_TYPE: Record<FeedbackType, ReportType> = {
    bug: 0,
    feedback: 1,
    support: 2,
    other: 3
};

export default function HelpPage() {
    const t = useTranslations("HelpPage");
    const pathname = usePathname();
    const { toast } = useToast();

    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [helpFormData, setHelpFormData] = useState({
        feedbackType: "bug" as FeedbackType,
        email: "",
        title: "",
        content: ""
    });

    /* ======================= */
    /* LOAD LOCAL STORAGE */
    /* ======================= */
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedEmail = localStorage.getItem("helpEmail");

            if (savedEmail) {
                setHelpFormData((prev) => ({
                    ...prev,
                    email: savedEmail
                }));
            }
        }
    }, []);

    /* ======================= */
    /* FAQ ITEMS */
    /* ======================= */
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

    /* ======================= */
    /* HANDLERS */
    /* ======================= */
    const handleHelpFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setHelpFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleHelpFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!(helpFormData.email && helpFormData.title && helpFormData.content)) {
            toast({
                description: t("form.validationError"),
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const locale = pathname.split("/")[1] || "vi";

            const response = await sendReport(
                {
                    email: helpFormData.email,
                    title: helpFormData.title,
                    content: helpFormData.content,
                    type: FEEDBACK_TYPE_TO_REPORT_TYPE[helpFormData.feedbackType]
                },
                locale
            );

            if (response.status === "success") {
                localStorage.setItem("helpEmail", helpFormData.email);

                toast({
                    description: response.message || "Your report has been submitted successfully",
                    variant: "success"
                });

                setHelpFormData({
                    feedbackType: helpFormData.feedbackType,
                    email: helpFormData.email,
                    title: "",
                    content: ""
                });
            } else {
                toast({
                    description: response.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Submit help form failed:", error);
            toast({
                description: t("form.submitError"),
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleFAQ = (id: string) => {
        setExpandedFAQ(expandedFAQ === id ? null : id);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-16">
            {/* ================================================= */}
            {/* SECTION 1: CONTACT SUPPORT */}
            {/* ================================================= */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                <h2 className="mb-1 font-bold text-2xl text-[#261E33]">{t("form.formTitle")}</h2>

                <p className="mb-8 text-[#6F6B99] text-sm">{t("form.subtitle")}</p>

                <form onSubmit={handleHelpFormSubmit} className="space-y-6">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Feedback Type Dropdown */}
                        <div>
                            <label className="mb-2 block font-semibold text-[#261E33] text-sm">
                                {t("form.feedbackType")}
                            </label>

                            <select
                                name="feedbackType"
                                value={helpFormData.feedbackType}
                                onChange={(e) =>
                                    setHelpFormData((prev) => ({
                                        ...prev,
                                        feedbackType: e.target.value as FeedbackType
                                    }))
                                }
                                className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-[#261E33] text-sm focus:border-[#FF5F3D] focus:ring-1 focus:ring-[#FF5F3D]">
                                <option value="bug">{t("form.feedbackOptions.bug")}</option>
                                <option value="feedback">{t("form.feedbackOptions.feedback")}</option>
                                <option value="support">{t("form.feedbackOptions.support")}</option>
                                <option value="other">{t("form.feedbackOptions.other")}</option>
                            </select>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.email")}</label>

                            <Input
                                type="email"
                                name="email"
                                value={helpFormData.email}
                                onChange={handleHelpFormChange}
                                placeholder={t("form.emailPlaceholder")}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.title")}</label>

                        <Input
                            type="text"
                            name="title"
                            value={helpFormData.title}
                            onChange={handleHelpFormChange}
                            placeholder={t("form.titlePlaceholder")}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="mb-2 block font-semibold text-[#261E33] text-sm">{t("form.content")}</label>

                        <textarea
                            name="content"
                            value={helpFormData.content}
                            onChange={handleHelpFormChange}
                            placeholder={t("form.contentPlaceholder")}
                            rows={5}
                            className="w-full rounded-lg border border-[#E5E5E5] p-3"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 border-[#E5E5E5] border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setHelpFormData({
                                    feedbackType: helpFormData.feedbackType,
                                    email: helpFormData.email,
                                    title: "",
                                    content: ""
                                })
                            }>
                            {t("form.cancelButton")}
                        </Button>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#FF5F3D] text-white hover:bg-[#ff4620]">
                            {isSubmitting ? "..." : t("form.submitButton")}
                        </Button>
                    </div>
                </form>
            </div>

            {/* ================================================= */}
            {/* SECTION 2: FAQ */}
            {/* ================================================= */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8">
                <h2 className="mb-1 font-bold text-2xl text-[#261E33]">{t("faq.title")}</h2>

                <p className="mb-8 text-[#6F6B99] text-sm">{t("faq.subtitle")}</p>

                <div className="space-y-3">
                    {faqItems.map((item) => (
                        <div key={item.id} className="overflow-hidden rounded-xl border border-[#E5E5E5]">
                            <button
                                type="button"
                                onClick={() => toggleFAQ(item.id)}
                                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#FAFAFA]">
                                <span className="font-semibold text-[#261E33]">{item.question}</span>

                                <svg
                                    className={`h-5 w-5 text-[#6F6B99] transition-transform ${expandedFAQ === item.id ? "rotate-180" : ""
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {expandedFAQ === item.id && (
                                <div className="border-[#E5E5E5] border-t bg-[#FAFAFA] px-6 py-4">
                                    <p className="text-[#6F6B99] text-sm">{item.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

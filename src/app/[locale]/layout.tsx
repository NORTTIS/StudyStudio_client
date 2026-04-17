import "../globals.css";

import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import RateLimitGuardProvider from "@/components/providers/RateLimitGuardProvider";
import { locales } from "@/i18n/request";

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!locales.includes(locale)) {
        notFound();
    }

    const messages = await getMessages({ locale });

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <RateLimitGuardProvider>{children}</RateLimitGuardProvider>
        </NextIntlClientProvider>
    );
}

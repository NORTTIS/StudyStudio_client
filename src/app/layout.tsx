import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const appSans = Inter({
    variable: "--font-app-sans",
    subsets: ["latin", "vietnamese"],
    display: "swap"
});

const appInter = Inter({
    variable: "--font-app-inter",
    subsets: ["latin", "vietnamese"],
    display: "swap"
});

export const metadata: Metadata = {
    title: "Study studio app",
    description: "Collaborate and manage easily with study studio"
};

export default async function RootLayout({
    children,
    params
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale?: string }>;
}>) {
    const { locale } = await params;

    return (
        <html lang={locale || "en"} suppressHydrationWarning>
            <body className={`${appSans.variable} ${appInter.variable} font-sans antialiased`} suppressHydrationWarning>
                {children}
                <Toaster />
            </body>
        </html>
    );
}

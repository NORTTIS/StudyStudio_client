import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const interSans = Inter({
    variable: "--font-sans",
    subsets: ["latin", "latin-ext"]
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
            <body className={`${interSans.variable} antialiased`} suppressHydrationWarning>
                {children}
                <Toaster />
            </body>
        </html>
    );
}

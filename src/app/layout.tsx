import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const interSans = Inter({
  variable: "--font-sans"
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
    <html lang={locale || "en"}>
      <body className={`${interSans.variable} antialiased`}>{children}</body>
    </html>
  );
}

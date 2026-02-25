"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FaBars, FaXmark } from "react-icons/fa6";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";

export interface GuestNavbarProps {
  className?: string;
}

export function GuestNavbar({ className = "" }: GuestNavbarProps) {
  const t = useTranslations("GuestNavbar");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      href: `/${locale}/landing/personal`,
      label: t("personal"),
      key: "personal"
    },
    {
      href: `/${locale}/landing/group`,
      label: t("group"),
      key: "group"
    },
    {
      href: `/${locale}/landing/management`,
      label: t("management"),
      key: "management"
    },
    {
      href: `/${locale}/landing/plan`,
      label: t("plan"),
      key: "plan"
    }
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className={`sticky top-0 z-50 bg-white shadow-md ${className}`}>
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex cursor-pointer items-center">
          <Logo size="md" showText />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center divide-x divide-gray-300 text-base md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`cursor-pointer px-6 font-medium transition hover:text-orange-500 ${
                isActive(link.href) ? "font-semibold text-orange-500" : "text-gray-800"
              }`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons - Desktop */}
        <div className="hidden gap-2 md:flex">
          <Link href={`/${locale}/login`} className="cursor-pointer">
            <Button variant="ghost">{t("login")}</Button>
          </Link>

          <Link href={`/${locale}/register`} className="cursor-pointer">
            <Button className="bg-orange-500 hover:bg-orange-600">{t("register")}</Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="cursor-pointer text-2xl md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}>
          {mobileMenuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="border-gray-200 border-t bg-white md:hidden">
          <div className="flex flex-col space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`cursor-pointer rounded-lg px-4 py-3 font-medium text-base transition hover:bg-orange-50 ${
                  isActive(link.href) ? "bg-orange-50 text-orange-500" : "text-gray-800"
                }`}
                onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}

            <div className="flex flex-col gap-2 border-gray-200 border-t pt-4">
              <Link href={`/${locale}/login`} className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full">
                  {t("login")}
                </Button>
              </Link>

              <Link href={`/${locale}/register`} className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">{t("register")}</Button>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

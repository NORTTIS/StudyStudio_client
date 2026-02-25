"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";

export interface GuestFooterProps {
  className?: string;
}

export function GuestFooter({ className = "" }: GuestFooterProps) {
  const t = useTranslations("GuestFooter");
  const locale = useLocale();

  const productLinks = [
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

  const socialLinks = [
    {
      icon: <FaXTwitter size={18} />,
      bgColor: "bg-black",
      href: "#",
      label: "Twitter"
    },
    {
      icon: <FaYoutube size={18} />,
      bgColor: "bg-red-600",
      href: "#",
      label: "YouTube"
    },
    {
      icon: <FaInstagram size={18} />,
      bgColor: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
      href: "#",
      label: "Instagram"
    },
    {
      icon: <FaFacebook size={18} />,
      bgColor: "bg-blue-600",
      href: "#",
      label: "Facebook"
    },
    {
      icon: <FaLinkedin size={18} />,
      bgColor: "bg-[#0A66C2]",
      href: "#",
      label: "LinkedIn"
    }
  ];

  return (
    <footer className={`bg-orange-200 py-10 ${className}`}>
      <div className="mx-auto flex w-[90%] max-w-7xl flex-col items-center justify-between gap-8 md:flex-row md:items-start">
        {/* Logo & Language Selector */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <svg width="36" height="36" viewBox="0 0 64 64">
              <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
              <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
            </svg>
            <div className="font-bold text-orange-600 text-xl leading-tight">
              Study
              <br />
              Studio
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3CFA8] text-gray-700">🌐</div>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2 rounded-full bg-[#F3CFA8] px-5 py-2 font-medium text-gray-800 text-sm transition hover:bg-[#EBC190]">
              {t("language")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path
                  d="M6 9L12 15L18 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-700 text-sm">{t("contactUs")}</p>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-white transition hover:opacity-80 ${social.bgColor}`}>
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Product Links */}
        <div className="text-center text-gray-700 text-sm md:text-left">
          <p className="mb-3 font-semibold text-black">{t("products")}</p>
          <ul className="space-y-2">
            {productLinks.map((link) => (
              <li key={link.key}>
                <Link href={link.href} className="cursor-pointer transition hover:text-orange-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

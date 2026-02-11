"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LoadingPage } from "@/components/common";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const _router = useRouter();
  const _pathname = usePathname();
  const _locale = useLocale();
  const _t = useTranslations("Common");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // TEMPORARY: Disable authentication check for development
    // TODO: Re-enable authentication before production
    setIsChecking(false);

    // Check authentication on mount
    // const checkAuth = () => {
    //   if (!isAuthenticated()) {
    //     // Store intended destination for redirect after login
    //     const redirectUrl = encodeURIComponent(pathname);
    //     router.replace(`/${locale}/login?redirect=${redirectUrl}`);
    //   } else {
    //     setIsChecking(false);
    //   }
    // };

    // checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (isChecking) {
    return <LoadingPage />;
  }

  return <>{children}</>;
}

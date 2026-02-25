"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/api/auth";
import { LoadingPage } from "@/components/common";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        // Try to refresh token if we have a refresh token
        const { getRefreshToken, refreshAccessToken } = await import("@/api/auth");

        if (getRefreshToken()) {
          // Attempt to refresh the access token
          const newTokens = await refreshAccessToken(locale);

          if (newTokens) {
            // Token refreshed successfully, user is authenticated
            setIsChecking(false);
            return;
          }
        }

        // No valid tokens, redirect to login
        const redirectUrl = encodeURIComponent(pathname);
        router.replace(`/${locale}/login?redirect=${redirectUrl}`);
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, pathname, locale]);

  // Show loading state while checking authentication
  if (isChecking) {
    return <LoadingPage />;
  }

  return <>{children}</>;
}

import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n/request";

export default createMiddleware({
  locales,
  defaultLocale: "vi"
});

export const config = {
  matcher: ["/", "/(vi|en)/:path*"]
};

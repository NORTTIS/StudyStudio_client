import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n/request";

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale: "vi",
    localePrefix: "always",
    localeDetection: false
});

export default function middleware(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const adminPath = requestUrl.pathname.match(/^\/(en|vi)(\/admin(?:\/.*)?)$/);

    if (adminPath && adminPath[1] !== "vi") {
        requestUrl.pathname = `/vi${adminPath[2]}`;
        return NextResponse.redirect(requestUrl);
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|_next|.*\\..*).*)"]
};

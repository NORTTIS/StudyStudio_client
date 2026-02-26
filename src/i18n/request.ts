import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "vi"];

export default getRequestConfig(async ({ requestLocale }) => {
    // Validate that the incoming `locale` parameter is valid
    const locale = await requestLocale;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    if (!(locale && locales.includes(locale as any))) {
        notFound();
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});

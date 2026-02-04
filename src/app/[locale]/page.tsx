import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  return {
    title: t("meta.title"),
    description: t("meta.description")
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="font-bold text-4xl tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mt-4 text-gray-600 text-lg dark:text-gray-400">{t("subtitle")}</p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-2xl">{t("features.title")}</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("features.item1")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("features.item2")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t("features.item3")}
            </li>
          </ul>
        </section>

        <footer className="text-center text-gray-500 text-sm">{t("footer", { locale: locale.toUpperCase() })}</footer>
      </div>
    </div>
  );
}

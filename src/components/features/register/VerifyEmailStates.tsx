import Link from "next/link";
import { useTranslations } from "next-intl";

export function VerifyEmailLoading() {
  const t = useTranslations("VerifyEmailPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />
        <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>
        <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>
        <p className="text-center text-gray-500 text-sm">{t("loading")}</p>
      </div>
    </div>
  );
}

export function VerifyEmailSuccess({ message, locale }: { message?: string; locale: string }) {
  const t = useTranslations("VerifyEmailPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />
        <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>
        <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="#F97316" strokeWidth="3" fill="none">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-center font-semibold text-base">{t("successTitle")}</h2>

        <p className="mb-6 text-center text-muted-foreground text-sm leading-relaxed">
          {message || t("successMessage")}
          <br />
          {t("successDescription")}
        </p>

        <Link
          href={`/${locale}/login`}
          className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white transition hover:bg-orange-600">
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}

export function VerifyEmailAlreadyVerified({ message, locale }: { message?: string; locale: string }) {
  const t = useTranslations("VerifyEmailPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />
        <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>
        <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="#F97316" strokeWidth="3" fill="none">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-center font-semibold text-base">{t("successTitle")}</h2>

        <p className="mb-6 text-center text-muted-foreground text-sm leading-relaxed">
          {message || t("alreadyVerifiedMessage")}
          <br />
          {t("successDescription")}
        </p>

        <Link
          href={`/${locale}/login`}
          className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white transition hover:bg-orange-600">
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}

export function VerifyEmailInvalidToken({ message, locale }: { message?: string; locale: string }) {
  const t = useTranslations("VerifyEmailPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />
        <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>
        <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-400">
            <span className="text-2xl text-yellow-500">⚠️</span>
          </div>
        </div>

        <h2 className="mb-2 text-center font-semibold text-base">{t("invalidTokenTitle")}</h2>

        <p className="mb-6 text-center text-muted-foreground text-sm leading-relaxed">
          {message || t("invalidTokenMessage")}
          <br />
          {t("invalidTokenDescription")}
        </p>

        <Link
          href={`/${locale}/login`}
          className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white transition hover:bg-orange-600">
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}

export function VerifyEmailError({ message, locale }: { message?: string; locale: string }) {
  const t = useTranslations("VerifyEmailPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />
        <h1 className="mb-2 text-center font-bold text-2xl">{t("title")}</h1>
        <p className="mb-6 text-center text-muted-foreground text-sm">{t("subtitle")}</p>

        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-400">
            <span className="text-2xl text-gray-500">❗</span>
          </div>
        </div>

        <h2 className="mb-2 text-center font-semibold text-base">{t("errorTitle")}</h2>

        <p className="mb-6 text-center text-muted-foreground text-sm leading-relaxed">
          {message || t("connectionError")}
        </p>

        <Link
          href={`/${locale}/login`}
          className="block w-full rounded-lg bg-orange-500 py-3 text-center font-semibold text-white transition hover:bg-orange-600">
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <svg width="48" height="48" viewBox="0 0 64 64">
        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
      </svg>

      <span className="font-bold text-3xl text-orange-500 leading-tight">
        Study <br /> Studio
      </span>
    </div>
  );
}

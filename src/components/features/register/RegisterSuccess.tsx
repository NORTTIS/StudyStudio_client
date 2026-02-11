import Link from "next/link";
import { useTranslations } from "next-intl";

type Props = {
  email: string;
  locale: string;
};

export function RegisterSuccess({ email, locale }: Props) {
  const t = useTranslations("RegisterPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <Logo />

        <h1 className="mb-2 text-center font-bold text-2xl">{t("verifyEmailTitle")}</h1>

        <p className="mb-6 text-center text-muted-foreground text-sm">{t("verifyEmailSubtitle")}</p>

        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500">
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="#F97316" strokeWidth="3" fill="none">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-center font-semibold text-base">{t("checkYourEmail")}</h2>

        <div className="mb-6 space-y-2 text-center text-muted-foreground text-sm leading-relaxed">
          <p>
            {t("verificationLinkSentTo")}
            <br />
            <span className="font-medium text-gray-900">{email}</span>
          </p>
          <p>{t("linkExpiresIn5Minutes")}</p>
          <p>{t("checkSpamFolder")}</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-500 transition hover:text-orange-500">
          <span className="text-xl">←</span>
          <Link href={`/${locale}/login`} className="font-medium text-sm">
            {t("backToLogin")}
          </Link>
        </div>
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

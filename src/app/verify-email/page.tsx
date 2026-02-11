import { redirect } from "next/navigation";

type Props = {
  searchParams: {
    token?: string;
  };
};

export default function VerifyEmailRedirectPage({ searchParams }: Props) {
  const token = searchParams.token;

  if (token) {
    redirect(`/vi/verify-email?token=${encodeURIComponent(token)}`);
  }

  redirect("/vi/verify-email");
}

import { redirect } from "next/navigation";

type Props = {
    searchParams: {
        token?: string;
    };
};

export default function VerifyResetTokenRedirectPage({ searchParams }: Props) {
    const token = searchParams.token;

    if (token) {
        redirect(`/vi/verify-reset-token?token=${encodeURIComponent(token)}`);
    }

    redirect("/vi/verify-reset-token");
}

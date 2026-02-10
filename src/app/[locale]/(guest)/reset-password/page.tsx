import { ResetPassword } from "@/components/features/reset-password/ResetPassword";

export default function Page({
    searchParams,
}: {
    searchParams: {
        token?: string;
    };
}) {
    return <ResetPassword token={searchParams?.token} />;
}
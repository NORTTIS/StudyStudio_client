import { ForgotPasswordSuccess } from "@/components/features/forgot-password/ForgotPasswordSuccess";

type Props = {
    searchParams: Promise<{
        email?: string;
    }>;
};

export default async function ForgotPasswordSuccessPage({ searchParams }: Props) {
    const { email } = await searchParams;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <ForgotPasswordSuccess email={email} />
        </div>
    );
}

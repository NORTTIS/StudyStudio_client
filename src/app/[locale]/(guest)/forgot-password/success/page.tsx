import { ForgotPasswordSuccess } from '@/components/features/forgot-password/ForgotPasswordSuccess'

type Props = {
    searchParams: {
        email?: string
    }
}

export default function ForgotPasswordSuccessPage({ searchParams }: Props) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <ForgotPasswordSuccess email={searchParams.email} />
        </div>
    )
}
import { PaymentStatusPage } from "@/components/features/payment/PaymentStatusPage";

export default function PaymentStatus({ params }: { params: { paymentId: string } }) {
    return <PaymentStatusPage paymentId={params.paymentId} />;
}

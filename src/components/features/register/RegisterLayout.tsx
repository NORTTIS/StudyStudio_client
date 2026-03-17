import Link from "next/dist/client/link";
import Image from "next/image";
import { Logo } from "@/components/common/Logo";
import { RegisterForm } from "./RegisterForm";

export function RegisterLayout() {
    return (
        <div className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
            <div className="relative hidden items-center justify-center bg-[#FFE6D8] lg:flex">
                <Image
                    src="/images/register-illustration1.png"
                    alt=""
                    width={1200}
                    height={1200}
                    priority
                    className="object-cover"
                />

                <div className="absolute top-10 left-10 flex items-center gap-3">
                    <Link href={"/"} className="mb-6 flex items-center justify-center">
                        <Logo className="mb-6" />
                    </Link>
                </div>

                <div className="absolute bottom-50 space-y-3 px-10 text-center">
                    <h2 className="font-semibold text-black text-xl">Quản lý học tập. Kết nối đội nhóm</h2>

                    <p className="mx-auto max-w-md text-gray-600 text-sm leading-relaxed">
                        Một nơi để học tập, chia sẻ và cùng nhau hoàn thành mục tiêu.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center px-6">
                <div className="w-full max-w-md">
                    <RegisterForm />
                </div>
            </div>
        </div>
    );
}

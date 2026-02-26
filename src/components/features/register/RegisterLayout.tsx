import Image from "next/image";
import { RegisterForm } from "./RegisterForm";

export function RegisterLayout() {
    return (
        <div className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
            <div className="relative hidden items-center justify-center bg-[#FFE6D8] lg:flex">
                <Image
                    src="/images/register-illustration1.png"
                    alt="Study Studio Illustration"
                    width={1200}
                    height={1200}
                    priority
                    className="h-full w-full object-cover"
                />

                <div className="absolute top-10 left-10 flex items-center gap-3">
                    <svg width="42" height="42" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
                        <path d="M52 20V38" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="52" cy="40" r="3" fill="#F97316" />
                    </svg>

                    <span className="font-bold text-2xl text-orange-600 leading-tight">
                        Study <br /> Studio
                    </span>
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

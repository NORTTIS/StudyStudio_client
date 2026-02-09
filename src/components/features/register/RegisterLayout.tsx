import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export function RegisterLayout() {
  return (
    <div className="flex min-h-screen w-full bg-[#F4F5FA]">
      <div className="flex w-full overflow-hidden bg-white shadow-2xl">
        {/* LEFT SIDE - Illustration */}
        <div className="relative hidden w-1/2 flex-col bg-gradient-to-br from-[#FFE5D9] to-[#FFDCCE] md:flex">
          {/* Logo */}
          <Link
            href="/"
            className="absolute top-8 left-8 z-10 flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="text-[#FF5F3D]">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20 5L3.75 12.5L20 20L36.25 12.5L20 5Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 25V31.25C10 32.2446 10.3951 33.1984 11.0983 33.9017C11.8016 34.6049 12.7554 35 13.75 35H26.25C27.2446 35 28.1984 34.6049 28.9017 33.9017C29.6049 33.1984 30 32.2446 30 31.25V25"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M36.25 27.5V12.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[#FF5F3D] text-xl">Study</span>
              <span className="font-bold text-[#FF5F3D] text-xl">Studio</span>
            </div>
          </Link>

          {/* Illustration - Full Height */}
          <div className="absolute inset-0 flex flex-col justify-between p-12 pt-24">
            <div className="flex flex-1 items-center justify-center">
              <div className="relative h-full w-full max-w-[500px]">
                <Image
                  src="/images/image-removebg-preview.png"
                  alt="Students Collaborating"
                  fill
                  className="object-contain mix-blend-multiply"
                  priority
                />
              </div>
            </div>

            {/* Bottom Text */}
            <div className="pb-8 text-center">
              <h2 className="mb-3 font-bold text-2xl text-[#261E33]">Quản lý học tập. Kết nối đội nhóm</h2>
              <p className="mx-auto max-w-sm text-[#6F6B99] text-sm leading-relaxed">
                Một nơi để học tập, chia sẻ và cùng nhau hoàn thành mục tiêu.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Form */}
        <div className="flex w-full flex-col justify-center bg-white px-8 py-12 md:w-1/2 md:px-16">
          <div className="mx-auto w-full max-w-md">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}

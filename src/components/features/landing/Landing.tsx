"use client";

import Image from "next/image";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF7ED] text-gray-800">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-8 py-4 shadow-md">
        <Link href="/landing" className="flex items-center gap-4">
          <svg width="52" height="52" viewBox="0 0 64 64">
            <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
            <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
          </svg>

          <span className="font-extrabold text-2xl text-orange-500 leading-tight md:text-3xl">
            Study <br /> Studio
          </span>
        </Link>

        <nav className="hidden items-center divide-x divide-gray-300 text-base md:flex">
          <Link href="/landing/personal" className="px-6 font-medium transition hover:text-orange-500">
            Không gian cá nhân
          </Link>

          <Link href="/landing/group" className="px-6 font-medium transition hover:text-orange-500">
            Không gian nhóm
          </Link>

          <Link href="/landing/management" className="px-6 font-medium transition hover:text-orange-500">
            Không gian quản lý
          </Link>

          <Link href="/landing/plan" className="px-6 font-medium transition hover:text-orange-500">
            Gói đăng ký
          </Link>
        </nav>

        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost">Đăng nhập</Button>
          </Link>

          <Link href="/register">
            <Button className="bg-orange-500 hover:bg-orange-600">Đăng ký</Button>
          </Link>
        </div>
      </header>

      <section className="relative min-h-[80vh] overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <Image src="/images/2.png" alt="Hero background" fill priority className="object-cover" />
        </div>

        <div className="relative z-10 mx-auto -mt-8 max-w-4xl pt-16 text-center">
          <h1 className="font-extrabold text-5xl text-gray-900 leading-tight md:text-6xl">
            Không gian cộng tác <br />
            Quản lý công việc của bạn
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-gray-600 text-lg md:text-xl">
            Study Studio giúp sinh viên và giảng viên đại học quản lý các dự án cá nhân và nhóm với việc theo dõi, đánh
            giá mức độ đóng góp một cách minh bạch, công bằng đi cùng với đó là sự hỗ trợ tới từ AI.
          </p>

          <Link href="/register">
            <Button className="mt-7 rounded-full bg-orange-500 px-8 py-6 font-semibold text-lg hover:bg-orange-600">
              Đăng ký – hoàn toàn miễn phí
            </Button>
          </Link>
        </div>
      </section>

      <section className="bg-[#FFF7ED] py-20 text-center">
        <h2 className="font-extrabold text-3xl text-gray-800 md:text-4xl">Kiến trúc không gian làm việc 3 tầng</h2>
        <p className="mt-2 text-gray-600 text-lg md:text-xl">Chúng tôi cung cấp các không gian làm việc riêng biệt</p>

        <div className="mt-14">
          <h3 className="font-bold text-2xl text-gray-800 md:text-3xl">Không gian quản lý</h3>
          <p className="mt-2 text-base text-gray-600 md:text-lg">Quản lý các không gian và nhóm của riêng bạn</p>

          <div className="mx-auto mt-8 flex h-[340px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent" />

          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold hover:bg-orange-600">
                Tạo không gian quản lý miễn phí
              </Button>
            </Link>

            <Button className="rounded-full bg-gray-200 px-7 py-5 font-semibold text-gray-700 hover:bg-gray-300">
              Tìm hiểu thêm
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-center">
        <h3 className="font-bold text-2xl text-gray-800 md:text-3xl">Không gian nhóm</h3>
        <p className="mt-2 text-base text-gray-600 md:text-lg">Quản lý, giám sát việc cá nhân và việc nhóm</p>

        <div className="mx-auto mt-8 flex h-[340px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-[#FFF7ED]" />

        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register">
            <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold hover:bg-orange-600">
              Tạo không gian nhóm miễn phí
            </Button>
          </Link>

          <Button className="rounded-full bg-[#EDEDED] px-7 py-5 font-semibold text-gray-700 hover:bg-[#E2E2E2]">
            Tìm hiểu thêm
          </Button>
        </div>
      </section>

      <section className="bg-[#FFF7ED] py-20 text-center">
        <h3 className="font-bold text-2xl text-gray-800 md:text-3xl">Không gian cá nhân</h3>
        <p className="mt-2 text-base text-gray-600 md:text-lg">Quản lý các công việc của riêng bạn</p>

        <div className="mx-auto mt-8 flex h-[340px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent" />

        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register">
            <Button className="rounded-full bg-orange-500 px-7 py-5 font-semibold hover:bg-orange-600">
              Tạo không gian cá nhân miễn phí
            </Button>
          </Link>

          <Button className="rounded-full bg-[#EDEDED] px-7 py-5 font-semibold text-gray-700 hover:bg-[#E2E2E2]">
            Tìm hiểu thêm
          </Button>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto w-[90%] max-w-6xl">
          <h3 className="text-center font-bold text-2xl text-gray-800 md:text-3xl">
            Quản lý công việc hiệu quả hơn <br />
            với sự giúp sức của AI
          </h3>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-800">📊 Cung cấp báo cáo về tình trạng công việc của các nhóm</h4>
              <div className="mt-6 h-[240px] rounded-lg border-2 border-gray-300 border-dashed bg-gray-50" />
            </div>

            <div className="rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-800">
                ✨ Giải đáp thắc mắc về những thông tin được cung cấp trong nhóm
              </h4>
              <div className="mt-6 h-[240px] rounded-lg border-2 border-gray-300 border-dashed bg-gray-50" />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-orange-200 py-10">
        <div className="mx-auto flex w-[90%] max-w-7xl items-center justify-between">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <svg width="36" height="36" viewBox="0 0 64 64">
                <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
              </svg>
              <div className="font-bold text-orange-600 text-xl leading-tight">
                Study
                <br />
                Studio
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3CFA8] text-gray-700">🌐</div>
              <button className="flex items-center gap-2 rounded-full bg-[#F3CFA8] px-5 py-2 font-medium text-gray-800 text-sm transition hover:bg-[#EBC190]">
                Tiếng Việt
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-700 text-sm">Liên hệ với chúng tôi</p>

            <div className="flex items-center gap-4">
              <a className="flex h-9 w-9 items-center justify-center rounded-md bg-black text-white">
                <FaXTwitter size={18} />
              </a>

              <a className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white">
                <FaYoutube size={18} />
              </a>

              <a className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white">
                <FaInstagram size={18} />
              </a>

              <a className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
                <FaFacebook size={18} />
              </a>

              <a className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0A66C2] text-white">
                <FaLinkedin size={18} />
              </a>
            </div>
          </div>

          <div className="text-gray-700 text-sm">
            <p className="mb-3 font-semibold text-black">Sản phẩm</p>
            <ul className="space-y-2">
              <li>Không gian cá nhân</li>
              <li>Không gian nhóm</li>
              <li>Không gian quản lý</li>
              <li>Gói đăng ký</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

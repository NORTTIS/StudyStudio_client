"use client";

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
          <Link href="/landing/personal" className="px-6 font-semibold text-orange-500">
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
          <img src="/images/personal.png" alt="Landing illustration" className="h-full w-full object-cover" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl pt-16 text-center">
          <h1 className="font-extrabold text-5xl text-gray-900 leading-tight md:text-6xl">
            Không gian làm việc <br />
            dành riêng cho bạn
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-gray-600 text-lg md:text-xl">
            Tổ chức ghi chú, tài liệu và kế hoạch học tập. <br />
            Tất cả trong một không gian cá nhân trực quan, dễ sử dụng.
          </p>

          <Link href="/register">
            <Button className="mt-7 rounded-full bg-orange-500 px-8 py-6 font-semibold text-lg hover:bg-orange-600">
              Tạo không gian của bạn →
            </Button>
          </Link>
        </div>
      </section>

      <section className="bg-[#FFF3E6] py-24">
        <h2 className="text-center font-extrabold text-5xl text-gray-700">Cách sử dụng</h2>
        <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-40 gap-y-20 px-6 md:grid-cols-2">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
              1
            </div>

            <h3 className="mt-6 font-extrabold text-3xl text-black">Tạo không gian cá nhân</h3>

            <p className="mt-3 text-gray-500 text-xl leading-relaxed">
              Bắt đầu với một không gian trống <br />
              Tự do sắp xếp theo cách của bạn
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
              2
            </div>

            <h3 className="mt-6 font-extrabold text-3xl text-black">Thêm ghi chú, tài liệu</h3>

            <p className="mt-3 text-gray-500 text-xl leading-relaxed">
              Thêm văn bản, hình ảnh, link và file <br />
              Tất cả gọn gàng trên một bảng
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
              3
            </div>

            <h3 className="mt-6 font-extrabold text-3xl text-black">Lập kế hoạch học tập</h3>

            <p className="mt-3 text-gray-500 text-xl leading-relaxed">
              Tạo danh sách công việc đặt mục tiêu <br />
              và theo dõi tiến độ mỗi ngày
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-2xl text-white">
              4
            </div>

            <h3 className="mt-6 font-extrabold text-3xl text-black">Học tập hiệu quả hơn</h3>

            <p className="mt-3 text-gray-500 text-xl leading-relaxed">
              AI giúp bạn tóm tắt, ôn tập và gợi ý <br />
              phương pháp học tối ưu hơn
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <h2 className="text-center font-extrabold text-5xl text-gray-600">Bạn có thể làm gì?</h2>

        <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-20 gap-y-16 px-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
            <h3 className="font-extrabold text-2xl text-black">Ghi chú thông minh</h3>

            <div className="my-5 h-px bg-black/15" />

            <p className="text-base text-black leading-relaxed">
              Tạo và ghi chú với văn bản, <br />
              hình ảnh, link
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
            <h3 className="font-extrabold text-2xl text-black">Công việc, mục tiêu</h3>

            <div className="my-5 h-px bg-black/15" />

            <p className="text-base text-black leading-relaxed">
              Lập danh sách việc cần làm <br />
              đặt deadline và theo dõi tiến độ <br />
              mỗi ngày
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
            <h3 className="font-extrabold text-2xl text-black">Tổ chức tài liệu</h3>

            <div className="my-5 h-px bg-black/15" />

            <p className="text-base text-black leading-relaxed">
              Lưu trữ và sắp xếp tài liệu học <br />
              tập theo chủ đề, môn học hoặc <br />
              dự án
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
            <h3 className="font-extrabold text-2xl text-black">AI hỗ trợ học tập</h3>

            <div className="my-5 h-px bg-black/15" />

            <p className="text-base text-black leading-relaxed">
              AI tóm tắt tài liệu, gợi ý ôn tập <br />
              và trả lời câu hỏi của bạn
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
            <h3 className="font-extrabold text-2xl text-black">Lịch học tập</h3>

            <div className="my-5 h-px bg-black/15" />

            <p className="text-base text-black leading-relaxed">
              Lên lịch học và quản lý <br />
              thời gian hiệu quả
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
            <h3 className="font-extrabold text-2xl text-black">Theo dõi tiến độ</h3>

            <div className="my-5 h-px bg-black/15" />

            <p className="text-base text-black leading-relaxed">
              Xem tổng quan tiến độ học tập <br />
              và thống kê
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#FFF3E6] py-24">
        <h2 className="text-center font-extrabold text-4xl text-gray-700">Ai đang sử dụng Study Studio</h2>

        <p className="mt-3 text-center text-gray-500 text-lg">Hơn xxx người sử dụng bảng mỗi tháng.</p>

        <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10">
            <h3 className="text-center font-extrabold text-2xl text-black">Học sinh, sinh viên</h3>

            <div className="my-6 h-px bg-black/15" />

            <p className="text-center text-black text-lg leading-relaxed">
              Sinh viên, người tự học, nhóm <br />
              bạn, đội dự án và cộng đồng nhỏ <br />
              cùng nhau học tập và làm việc <br />
              hiệu quả.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10">
            <h3 className="text-center font-extrabold text-2xl text-black">Người tự học</h3>

            <div className="my-6 h-px bg-black/15" />

            <p className="text-center text-black text-lg leading-relaxed">
              Tự tổ chức lộ trình học, <br />
              lưu trữ tài liệu tham khảo <br />
              và đặt mục tiêu phát triển <br />
              của bản thân
            </p>
          </div>
        </div>
      </section>

      <section className="bg-orange-400 py-20 text-center text-white">
        <h2 className="font-extrabold text-3xl md:text-4xl">Bắt đầu hành trình học tập của bạn</h2>
        <p className="mt-4 text-lg">Khám phá cá nhân và học tập một cách hiệu quả hơn</p>

        <Link href="/register">
          <Button className="mt-8 rounded-full bg-white px-8 py-6 font-semibold text-lg text-orange-500 hover:bg-gray-100">
            Đăng ký miễn phí →
          </Button>
        </Link>
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

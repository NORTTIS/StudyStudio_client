"use client";

import Image from "next/image";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export default function LandingManagement() {
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

          <Link href="/landing/management" className="px-6 font-semibold text-orange-500">
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

      <section className="bg-white py-20">
        {/* Title */}
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="font-extrabold text-5xl text-gray-700 leading-tight md:text-6xl">
            Quản lý toàn bộ nhóm <br />
            từ một nơi
          </h1>

          <Link href="/register">
            <Button className="mt-8 rounded-full bg-orange-500 px-20 py-7 font-semibold text-lg text-white hover:bg-orange-600">
              Bắt đầu quản lý →
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-12 flex max-w-5xl justify-center">
          <Image
            src="/images/management.png"
            alt="Management Illustration"
            width={950}
            height={650}
            priority
            className="w-full max-w-[950px] object-contain"
          />
        </div>
      </section>

      <section className="bg-[#FFF3E6] py-24">
        <h2 className="text-center font-extrabold text-5xl text-gray-700">Cách sử dụng</h2>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-4">
          {[
            {
              title: "Tạo không gian quản lý",
              desc: "Thiết lập không gian và cấu hình theo nhu cầu tổ chức của bạn"
            },
            {
              title: "Thêm nhóm & thành viên",
              desc: "Mời thành viên, tạo nhóm học tập chỉ trong vài click"
            },
            {
              title: "Phân quyền, thiết lập",
              desc: "Phân quyền quản lý, thành viên cho từng nhóm riêng biệt"
            },
            {
              title: "Theo dõi & báo cáo",
              desc: "Xem tiến độ, báo cáo hoạt động và đánh giá hiệu quả"
            }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6D00FF] font-bold text-lg text-white">
                {i + 1}
              </div>

              <h3 className="mt-4 font-extrabold text-black text-lg">{item.title}</h3>

              <p className="mt-2 text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 flex h-[420px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent" />
      </section>

      <section className="bg-white py-24">
        <h2 className="text-center font-extrabold text-5xl text-gray-700">Quản lý có thể làm gì?</h2>

        <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-16 gap-y-14 px-6 md:grid-cols-2">
          {[
            {
              title: "Quản lý thành viên",
              desc: "Thêm, xóa quản lý thành viên trong tổ chức của bạn"
            },
            {
              title: "Theo dõi tiến độ",
              desc: "Xem tiến độ của từng nhóm, thành viên"
            },
            {
              title: "Phân quyền thông minh",
              desc: "Thiết lập quyền hạn cho từng vai trò: quản lý, thành viên, khách"
            },
            {
              title: "Tổng quan",
              desc: "Dashboard tổng quan, số liệu"
            }
          ].map((item, i) => (
            <div key={i} className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
              <h3 className="font-extrabold text-2xl text-black">{item.title}</h3>

              <div className="my-5 h-px bg-black/20" />

              <p className="text-black text-lg leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#FFF3E6] py-24">
        <h2 className="text-center font-extrabold text-4xl text-gray-700">Ai đang sử dụng Study Studio</h2>

        <p className="mt-3 text-center text-gray-500 text-lg">Hơn xx triệu người sử dụng bảng mỗi tháng.</p>

        <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
          {[
            {
              title: "Cá nhân & Nhóm",
              desc: `Sinh viên, người tự học, nhóm bạn,
đội dự án và cộng đồng nhỏ
cùng nhau học tập và làm việc hiệu quả.`
            },
            {
              title: "Tổ chức giáo dục",
              desc: `Lớp học, các trường đại học và các
chương trình giáo dục dành cho người trưởng thành.`
            }
          ].map((item, i) => (
            <div key={i} className="rounded-2xl bg-[#FAD7A7] px-12 py-10 text-center">
              <h3 className="font-extrabold text-2xl text-black">{item.title}</h3>

              <div className="my-6 h-px bg-black/20" />

              <p className="whitespace-pre-line text-black text-lg leading-relaxed">{item.desc}</p>
            </div>
          ))}
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

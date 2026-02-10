'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

import {
    FaXTwitter,
    FaYoutube,
    FaInstagram,
    FaFacebook,
    FaLinkedin,
} from 'react-icons/fa6'

export default function LandingGroup() {
    return (
        <div className="flex min-h-screen flex-col bg-[#FFF7ED] text-gray-800">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-8 py-4 shadow-md">
                <Link href="/landing" className="flex items-center gap-4">
                    <svg width="52" height="52" viewBox="0 0 64 64">
                        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
                        <path
                            d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z"
                            fill="#FB923C"
                        />
                    </svg>

                    <span className="text-2xl font-extrabold leading-tight text-orange-500 md:text-3xl">
                        Study <br /> Studio
                    </span>
                </Link>

                <nav className="hidden items-center divide-x divide-gray-300 text-base md:flex">
                    <Link
                        href="/landing/personal"
                        className="px-6 font-medium hover:text-orange-500 transition"
                    >
                        Không gian cá nhân
                    </Link>

                    <Link
                        href="/landing/group"
                        className="px-6 font-semibold text-orange-500"
                    >
                        Không gian nhóm
                    </Link>

                    <Link
                        href="/landing/management"
                        className="px-6 font-medium hover:text-orange-500 transition"
                    >
                        Không gian quản lý
                    </Link>

                    <Link
                        href="/landing/plan"
                        className="px-6 font-medium hover:text-orange-500 transition"
                    >
                        Gói đăng ký
                    </Link>
                </nav>


                <div className="flex gap-2">
                    <Link href="/login">
                        <Button variant="ghost">Đăng nhập</Button>
                    </Link>

                    <Link href="/register">
                        <Button className="bg-orange-500 hover:bg-orange-600">
                            Đăng ký
                        </Button>
                    </Link>
                </div>
            </header>

            <section className="bg-white py-20">
                <div className="mx-auto max-w-5xl text-center">
                    <h1 className="text-5xl font-extrabold leading-tight text-gray-700 md:text-6xl">
                        Không gian làm việc chung cho <br />
                        học tập & dự án
                    </h1>

                    <Link href="/group/create">
                        <Button className="mt-8 rounded-full bg-orange-500 px-20 py-7 text-lg font-semibold text-white hover:bg-orange-600">
                            Tạo nhóm →
                        </Button>
                    </Link>
                </div>

                <div className="mx-auto mt-12 flex max-w-5xl justify-center">
                    <Image
                        src="/images/group.png"
                        alt="Group collaboration"
                        width={900}
                        height={600}
                        priority
                        className="w-full max-w-[900px] object-contain"
                    />
                </div>
            </section>

            <section className="bg-[#FFF3E6] py-24">
                <h2 className="text-center text-5xl font-extrabold text-gray-700">
                    Cách sử dụng
                </h2>

                <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-4">
                    {[
                        "Tạo mới một nhóm với template có sẵn",
                        "Sau đó chia sẻ bảng với những người dùng khác",
                        "Tạo công việc, giao nhiệm vụ cho thành viên",
                        "Cộng tác để cùng nhau hoàn thành công việc.",
                    ].map((text, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6D00FF] text-lg font-bold text-white">
                                {i + 1}
                            </div>

                            <p className="mt-4 text-base font-semibold leading-snug text-black">
                                {text}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mx-auto mt-16 flex h-[420px] w-[85%] items-center justify-center rounded-lg border-2 border-orange-400 bg-transparent">

                </div>
            </section>

            <section className="bg-white py-24">
                <h2 className="text-center text-5xl font-extrabold text-gray-700">
                    Nhóm có thể làm gì?
                </h2>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-x-16 gap-y-14 px-6 md:grid-cols-2">

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="text-2xl font-extrabold text-black">
                            Quản lý nhóm
                        </h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="text-lg leading-relaxed text-black">
                            Tạo và tổ chức nhóm học tập <br />
                            hoặc dự án chỉ trong vài giây
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="text-2xl font-extrabold text-black">
                            Theo dõi công việc
                        </h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="text-lg leading-relaxed text-black">
                            Nắm rõ ai làm gì, tiến độ <br />
                            đến đâu
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="text-2xl font-extrabold text-black">
                            Phân quyền thông minh
                        </h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="text-lg leading-relaxed text-black">
                            Tạo và tổ chức nhóm học tập <br />
                            hoặc dự án chỉ trong vài giây
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFD9D2] px-10 py-10 text-center">
                        <h3 className="text-2xl font-extrabold text-black">
                            AI hỗ trợ học tập
                        </h3>

                        <div className="my-5 h-px bg-black/20" />

                        <p className="text-lg leading-relaxed text-black">
                            Hỏi đáp, phân tích yêu cầu, <br />
                            tạo báo cáo
                        </p>
                    </div>

                </div>
            </section>

            <section className="bg-[#FFF3E6] py-24">
                <h2 className="text-center text-4xl font-extrabold text-gray-700">
                    Ai đang sử dụng Study Studio
                </h2>

                <p className="mt-3 text-center text-lg text-gray-500">
                    Hơn xxx người sử dụng bảng mỗi tháng.
                </p>

                <div className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-2">

                    <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10 text-center">
                        <h3 className="text-2xl font-extrabold text-black">
                            Cá nhân & Nhóm
                        </h3>

                        <div className="my-6 h-px bg-black/20" />

                        <p className="text-lg leading-relaxed text-black text-center">
                            Sinh viên, người tự học, nhóm bạn, <br />
                            đội dự án và cộng đồng nhỏ cùng <br />
                            nhau học tập và làm việc hiệu quả.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAD7A7] px-12 py-10 text-center">
                        <h3 className="text-2xl font-extrabold text-black">
                            Giáo dục
                        </h3>

                        <div className="my-6 h-px bg-black/20" />

                        <p className="text-lg leading-relaxed text-black text-center">
                            Lớp học, các trường đại học và các <br />
                            chương trình giáo dục dành cho <br />
                            người trưởng thành.
                        </p>
                    </div>

                </div>
            </section>

            <section className="bg-white py-20">
                <div className="mx-auto w-[90%] max-w-6xl">
                    <h3 className="text-center text-2xl font-bold text-gray-800 md:text-3xl">
                        Quản lý công việc hiệu quả hơn <br />
                        với sự giúp sức của AI
                    </h3>

                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-800">
                                📊 Cung cấp báo cáo về tình trạng công việc của các nhóm
                            </h4>
                            <div className="mt-6 h-[240px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50" />
                        </div>

                        <div className="rounded-xl border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-800">
                                ✨ Giải đáp thắc mắc về những thông tin được cung cấp trong nhóm
                            </h4>
                            <div className="mt-6 h-[240px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50" />
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
                                <path
                                    d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z"
                                    fill="#FB923C"
                                />
                            </svg>
                            <div className="text-xl font-bold leading-tight text-orange-600">
                                Study<br />Studio
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3CFA8] text-gray-700">
                                🌐
                            </div>
                            <button className="flex items-center gap-2 rounded-full bg-[#F3CFA8] px-5 py-2 text-sm font-medium text-gray-800 hover:bg-[#EBC190] transition">
                                Tiếng Việt

                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="text-gray-600"
                                >
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
                        <p className="text-sm text-gray-700">Liên hệ với chúng tôi</p>

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

                    <div className="text-sm text-gray-700">
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
    )
}
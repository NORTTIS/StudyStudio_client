'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

import {
    FaXTwitter,
    FaYoutube,
    FaInstagram,
    FaFacebook,
    FaLinkedin,
} from 'react-icons/fa6'

export default function LandingPlan() {
    return (
        <div className="flex min-h-screen flex-col bg-white text-gray-800">
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
                        className="px-6 font-medium hover:text-orange-500 transition"
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
                        className="px-6 font-semibold text-orange-500"
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

            <section className="py-20 text-center">
                <h1 className="text-5xl font-extrabold text-gray-700 md:text-6xl">
                    Các gói đăng ký trả phí <br />
                    của chúng tôi
                </h1>
            </section>

            {/* ================= PRICING CARDS ================= */}
            <section className="bg-white">
                <div className="mx-auto flex max-w-6xl justify-between gap-24 px-16">
                    {/* ===== FREE PLAN ===== */}
                    <div className="w-[460px] rounded-2xl border border-orange-500 px-14 py-12 text-center">
                        <h2 className="text-2xl font-extrabold text-gray-700">
                            Gói miễn phí
                        </h2>

                        <p className="mt-2 text-lg font-bold text-orange-500">0 VND</p>

                        <p className="mt-4 text-sm leading-relaxed text-gray-500">
                            Phù hợp cho người dùng cá nhân và các <br />
                            nhóm nhỏ trải nghiệm
                        </p>

                        <Link href="/register">
                            <Button className="mt-8 w-[65%] rounded-full bg-orange-500 py-6 text-lg font-semibold hover:bg-orange-600">
                                Đăng ký
                            </Button>
                        </Link>

                        <ul className="mt-12 flex flex-col items-center gap-7 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                Tối đa 3 không gian quản lý riêng biệt
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                Tối đa 5 không gian nhóm
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">👤</span>
                                Tối đa 10 thành viên ở mỗi không gian nhóm
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                500 MB lưu trữ tài liệu cho mỗi không gian nhóm
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✦</span>
                                20 lượt yêu cầu AI mỗi ngày
                            </li>
                        </ul>
                    </div>

                    {/* ===== PREMIUM PLAN ===== */}
                    <div className="w-[460px] rounded-2xl border border-orange-500 px-14 py-12 text-center">
                        <h2 className="text-2xl font-extrabold text-gray-700">
                            Gói nâng cấp
                        </h2>

                        <p className="mt-2 text-lg font-bold text-orange-500">
                            299.000 VND / Tháng
                        </p>

                        <p className="mt-4 text-sm leading-relaxed text-gray-500">
                            Phù hợp cho các nhóm lớn cần sự linh <br />
                            hoạt hơn
                        </p>

                        <Link href="/register">
                            <Button className="mt-8 w-[65%] rounded-full bg-orange-500 py-6 text-lg font-semibold hover:bg-orange-600">
                                Đăng ký
                            </Button>
                        </Link>

                        <ul className="mt-12 flex flex-col items-center gap-7 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                Tối đa 10 không gian quản lý riêng biệt
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                Tối đa 10 không gian nhóm
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">👤</span>
                                Tối đa 50 thành viên ở mỗi không gian nhóm
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">▣</span>
                                1 GB lưu trữ tài liệu cho mỗi không gian nhóm
                            </li>

                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✦</span>
                                100 lượt yêu cầu AI mỗi ngày
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="bg-white py-28"></section>

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

import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/request';

export default createMiddleware({
  locales,
  defaultLocale: 'vi' // Ngôn ngữ mặc định là tiếng Việt
});

export const config = {
  // Chỉ chạy middleware trên các đường dẫn thực tế, bỏ qua file tĩnh
  matcher: ['/', '/(vi|en)/:path*']
};
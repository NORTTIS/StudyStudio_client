import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5006",
        pathname: "/uploads/**"
      },
      {
        protocol: "https",
        hostname: "127.0.0.1",
        port: "5006",
        pathname: "/uploads/**"
      },
      {
        protocol: "http",
        hostname: "studystudio.asia",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "studystudio.asia",
        port: "",
        pathname: "/**"
      }
    ]
  }
};

export default withNextIntl(nextConfig);

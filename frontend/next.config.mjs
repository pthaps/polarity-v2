/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  // Vercel などの serverless で API が CSV を読むとき、ファイルトレースに含める
  experimental: {
    outputFileTracingIncludes: {
      "/api/analyze": ["./src/data/ad-fontes-media.csv"],
      "/api/extension-analyze": ["./src/data/ad-fontes-media.csv"],
    },
  },
  // macOS で EMFILE (too many open files) になると dev が / を 404 にすることがあるため、
  // ネイティブ watch の代わりにポーリングで監視する（開発時のみ）。
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
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

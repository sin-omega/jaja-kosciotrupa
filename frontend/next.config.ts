import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow iframes for YouTube / TikTok embeds
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

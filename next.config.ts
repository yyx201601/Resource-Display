import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/Year8-DT/test/exam",
        destination: "/year-8-digital-technologies-test.html",
      },
    ];
  },
};

export default nextConfig;

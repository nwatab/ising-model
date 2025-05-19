import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  staticPageGenerationTimeout: 45 * 60,
};

module.exports = nextConfig;

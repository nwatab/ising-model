import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  staticPageGenerationTimeout: 15 * 60,
};

module.exports = nextConfig;

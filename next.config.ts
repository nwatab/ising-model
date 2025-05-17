import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  staticPageGenerationTimeout: 600,
};

module.exports = nextConfig;

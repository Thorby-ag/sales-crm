import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Minimal self-contained server (.next/standalone) for the Docker image.
  output: "standalone",
};

export default createNextIntlPlugin()(nextConfig);

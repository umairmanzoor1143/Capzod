import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/studio",
    "@rspack/core",
    "esbuild"
  ],
  transpilePackages: ["remotion", "@remotion/player"]
};

export default nextConfig;

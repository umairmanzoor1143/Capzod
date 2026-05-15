import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  outputFileTracingIncludes: {
    "/api/render": [
      "./.remotion-bundle/**/*",
      "./node_modules/@remotion/compositor-linux-x64-gnu/**/*",
      "./node_modules/.pnpm/@remotion+compositor-linux-x64-gnu@*/node_modules/@remotion/compositor-linux-x64-gnu/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*"
    ]
  },
  serverExternalPackages: [
    "@remotion/renderer"
  ],
  transpilePackages: ["remotion", "@remotion/player"]
};

export default nextConfig;

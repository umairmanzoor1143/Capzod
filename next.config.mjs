import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  outputFileTracingIncludes: {
    "/api/render": [
      "./remotion/**/*",
      "./lib/subtitles.ts",
      "./lib/subtitle-style-merge.ts",
      "./lib/compile-style-code.ts",
      "./node_modules/@babel/standalone/package.json",
      "./node_modules/@babel/standalone/babel.js",
      "./node_modules/@remotion/compositor-linux-x64-gnu/**/*",
      "./node_modules/@remotion/compositor-linux-x64-musl/**/*",
      "./node_modules/.pnpm/@remotion+compositor-linux-x64-gnu@*/node_modules/@remotion/compositor-linux-x64-gnu/**/*",
      "./node_modules/.pnpm/@remotion+compositor-linux-x64-musl@*/node_modules/@remotion/compositor-linux-x64-musl/**/*",
      "./node_modules/.remotion/chrome-headless-shell/**/*"
    ]
  },
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

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
      "./node_modules/@babel/standalone/babel.js"
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

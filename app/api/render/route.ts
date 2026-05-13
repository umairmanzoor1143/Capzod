import {bundle} from "@remotion/bundler";
import {renderMedia, selectComposition} from "@remotion/renderer";
import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";
import {spawn} from "node:child_process";
import os from "node:os";
import path from "node:path";
import {mkdtemp, readFile, rename, rm, stat, unlink} from "node:fs/promises";
import {
  sanitizeCustomStyleConfig,
  sanitizeStyleCode,
  sanitizeTypography
} from "@/lib/community-styles";
import {
  sampleScript,
  type SubtitleItem,
  isBuiltInSubtitleStyleId,
  type CustomSubtitleStyleConfig,
  type SubtitleStyleId,
  type TypographyOverrides,
  type VideoBackground
} from "@/lib/subtitles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RenderRequest = {
  text?: string;
  style?: SubtitleStyleId;
  background?: VideoBackground;
  subtitles?: SubtitleItem[];
  customStyle?: CustomSubtitleStyleConfig;
  typography?: TypographyOverrides;
  width?: number;
  height?: number;
  format?: "mp4" | "webm";
  kind?: "settings" | "code";
  code?: string;
};

/**
 * Transcode a ProRes 4444 .mov to HEVC with alpha (.mov / hvc1).
 * 10–20× smaller while keeping the alpha channel — plays in QuickTime,
 * Premiere, Final Cut, DaVinci Resolve, After Effects.
 * Uses Apple VideoToolbox (hardware) when available on macOS.
 */
function compressTransparent(
  input: string,
  output: string,
  totalFrames: number,
  fps: number,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i", input,
      "-c:v", "hevc_videotoolbox",
      "-allow_sw", "1",
      "-alpha_quality", "0.85",
      "-q:v", "55",
      "-tag:v", "hvc1",
      "-pix_fmt", "yuva420p",
      "-progress", "pipe:1",
      "-nostats",
      output
    ];
    const proc = spawn("ffmpeg", args, {stdio: ["ignore", "pipe", "pipe"]});
    const totalUs = (totalFrames / fps) * 1_000_000;

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      // -progress emits "out_time_us=NNNN" lines.
      const match = text.match(/out_time_us=(\d+)/);
      if (match && totalUs > 0) {
        const us = Number(match[1]);
        onProgress(Math.min(1, us / totalUs));
      }
    });

    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

// Cache the webpack bundle across requests; bundling takes 5–15s on cold start.
let bundlePromise: Promise<string> | null = null;
function getBundle() {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
      webpackOverride: (config) => config
    }).catch((err) => {
      bundlePromise = null;
      throw err;
    });
  }
  return bundlePromise;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: {user},
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      {error: "Sign in to export video."},
      {status: 401}
    );
  }

  const body = (await request.json().catch(() => ({}))) as RenderRequest;
  const text = body.text?.trim() || sampleScript;
  const customStyle = sanitizeCustomStyleConfig(body.customStyle);
  const style = customStyle?.baseStyle || (isBuiltInSubtitleStyleId(body.style) ? body.style : "viral-tiktok");
  const typography = sanitizeTypography(body.typography);
  const background = body.background === "transparent" ? "transparent" : "black";
  const format = body.format === "webm" ? "webm" : "mp4";
  const width = Number(body.width) || 1080;
  const height = Number(body.height) || 1920;
  const subtitles = Array.isArray(body.subtitles) ? body.subtitles : undefined;
  const isCodeStyle = body.kind === "code" && typeof body.code === "string" && body.code.trim().length > 0;
  const code = isCodeStyle ? sanitizeStyleCode(body.code) : undefined;
  const compositionId = isCodeStyle ? "CodeStyleVideo" : "SubtitleVideo";
  // Per Remotion docs, ProRes 4444 .mov is the recommended transparent format
  // for use in editors (Premiere, Final Cut, DaVinci, After Effects).
  const isTransparent = background === "transparent";
  const codec: "h264" | "prores" = isTransparent ? "prores" : "h264";
  const ext = isTransparent ? "mov" : "mp4";
  const rendersDir = await mkdtemp(path.join(os.tmpdir(), "subtitle-render-"));
  const filename = `subtitle-${Date.now()}.${ext}`;
  const outputLocation = path.join(rendersDir, filename);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        send({type: "stage", stage: "bundling", progress: 0});

        const bundled = await getBundle();

        send({type: "stage", stage: "composing", progress: 0.05});

        const inputProps = isCodeStyle
          ? {
              text,
              background,
              subtitles,
              width,
              height,
              code,
              style,
              customStyle,
              typography,
            }
          : {text, style, background, subtitles, width, height, customStyle, typography};
        const composition = await selectComposition({
          serveUrl: bundled,
          id: compositionId,
          inputProps
        });

        send({type: "stage", stage: "rendering", progress: 0.1});

        // Use all physical cores for parallel frame rendering.
        const concurrency = Math.max(2, os.cpus().length);

        await renderMedia({
          composition,
          serveUrl: bundled,
          codec,
          // ProRes 4444 has full alpha; profile must be "4444" or "4444-xq".
          proResProfile: codec === "prores" ? "4444" : undefined,
          // PNG frames preserve alpha precisely.
          imageFormat: isTransparent ? "png" : "jpeg",
          // yuva444p10le is the ProRes 4444 alpha pixel format per Remotion docs.
          pixelFormat: codec === "prores" ? "yuva444p10le" : "yuv420p",
          jpegQuality: 80,
          concurrency,
          inputProps,
          outputLocation,
          chromiumOptions: {gl: "angle"},
          onProgress: ({progress, renderedFrames, encodedFrames, stitchStage}) => {
            send({
              type: "progress",
              stage: stitchStage ?? "rendering",
              // Cap rendering at 80% so compression can occupy 80–100%.
              progress: isTransparent ? progress * 0.8 : progress,
              renderedFrames,
              encodedFrames
            });
          }
        });

        const finalFilename = filename;

        if (isTransparent) {
          // Compress ProRes 4444 → HEVC with alpha (.mov / hvc1).
          const compressedFilename = filename.replace(/\.mov$/, "-compressed.mov");
          const compressedPath = path.join(rendersDir, compressedFilename);
          send({type: "stage", stage: "compressing", progress: 0.8});

          try {
            await compressTransparent(
              outputLocation,
              compressedPath,
              composition.durationInFrames,
              composition.fps,
              (p) => {
                send({type: "progress", stage: "compressing", progress: 0.8 + p * 0.2});
              }
            );

            const [origStat, compStat] = await Promise.all([
              stat(outputLocation),
              stat(compressedPath)
            ]);
            console.log(
              `[render] compression: ${(origStat.size / 1e6).toFixed(1)}MB → ${(compStat.size / 1e6).toFixed(1)}MB ` +
                `(${Math.round((1 - compStat.size / origStat.size) * 100)}% smaller)`
            );

            // Replace original with compressed file (keep original filename for client).
            await unlink(outputLocation);
            await rename(compressedPath, outputLocation);
          } catch (err) {
            console.error("[render] compression failed, keeping ProRes original:", err);
            // Fall through and serve the uncompressed file.
          }
        }

        const video = await readFile(outputLocation);
        send({
          type: "done",
          progress: 1,
          data: video.toString("base64"),
          mimeType: isTransparent ? "video/quicktime" : "video/mp4",
          filename: finalFilename,
          format
        });
      } catch (error) {
        console.error(error);
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Unable to render video"
        });
      } finally {
        await rm(rendersDir, {recursive: true, force: true}).catch(() => undefined);
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  });
}

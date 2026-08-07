/**
 * Background pipeline: transcribe → detect viral clips → persist.
 *
 * This replaces the build spec's placeholder, where clips were invented with
 * `Math.floor(Math.random() * 30) + 70`. The scoring and moment-selection now
 * run through the real Graph-Engineering engine in `src/lib/ai` (see its
 * README), and each Inngest `step` maps to a stage of that graph so retries and
 * observability line up with the node boundaries.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { transcribeVideo, toTranscriptInput } from "@/lib/deepgram";
import { detectViralClips, AnthropicLLM, type ScoredCandidate } from "@/lib/ai";

export const processVideo = inngest.createFunction(
  { id: "process-video", retries: 2 },
  { event: "video/uploaded" },
  async ({ event, step }) => {
    const { videoId } = event.data as { videoId: string; userId: string };

    await step.run("mark-processing", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "PROCESSING" },
      });
    });

    const video = await step.run("fetch-video", async () =>
      prisma.video.findUnique({ where: { id: videoId } })
    );
    if (!video) throw new Error("Video not found");

    // Deepgram handles video URLs directly (audio track extracted server-side).
    const transcript = await step.run("transcribe", async () =>
      transcribeVideo(video.url)
    );

    await step.run("save-transcript", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { transcript: JSON.stringify(transcript), status: "TRANSCRIBED" },
      });
    });

    // The viral-detection graph. One step so its internal verifiers + bounded
    // self-correction run as a unit; Inngest retries the whole detection on a
    // transient LLM error rather than leaving a half-scored video.
    const clips = await step.run("detect-clips", async () => {
      const input = toTranscriptInput(video.id, video.duration, transcript);
      const state = await detectViralClips(input, {
        llm: new AnthropicLLM(), // frontier for identify, cheap for scoring
        config: { platform: "TIKTOK", targetClipCount: 10 },
      });
      return state.clips;
    });

    await step.run("mark-analyzed", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "ANALYZED" },
      });
    });

    // Persist the ranked, verified clips.
    await step.run("persist-clips", async () => {
      if (clips.length === 0) return;
      await prisma.clip.createMany({
        data: clips.map((c: ScoredCandidate) => ({
          videoId,
          userId: video.userId,
          title: titleFor(c),
          startTime: Math.round(c.startSec),
          endTime: Math.round(c.endSec),
          viralScore: c.viralScore,
          status: "GENERATING" as const,
          platform: c.platform,
          format: c.format,
          captions: { justification: c.justification, dimensions: c.dimensions },
        })),
      });
    });

    // Render each clip (Replicate / ffmpeg). Kept as a per-clip step so one bad
    // render doesn't fail the batch; MVP passes the source URL through.
    const ready = await step.run("render-clips", async () => {
      const persisted = await prisma.clip.findMany({ where: { videoId } });
      for (const clip of persisted) {
        await prisma.clip.update({
          where: { id: clip.id },
          data: { url: video.url, status: "READY" }, // TODO: real render
        });
      }
      return persisted.length;
    });

    await step.run("mark-complete", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "COMPLETED" },
      });
    });

    return { success: true, clipCount: ready };
  }
);

/** A short human title from the candidate's hook type. */
function titleFor(c: ScoredCandidate): string {
  const label = c.hookType
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${label} (${c.viralScore}/100)`;
}
